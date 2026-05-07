import { useState, useEffect, useRef } from 'react';
import { PlusIcon } from '../MainPage/Icons.jsx';
import { buildEndpointURL } from '../../services/config';
import { useToast } from '../../utils/core.jsx';
import Select from 'react-select';
import { selectStyles } from '../../utils/Styles.js';

/**
 * ClockPanel
 *
 
 *   cityClocks ko.observableArray          → useState([])
 *   updateTimes() + setInterval 1000ms     → useEffect with setInterval
 *   oj-sm-only-hide                        → hidden on mobile via CSS class
 *   oj-popup #addClockPopup                → controlled <div> overlay
 *   oj-select-single {{selectedCity}}      → <select> controlled input
 *   getHourOffset(timezone)                → same pure function
 *   clockLabel(clock)                      → same logic inline
 *   saveClocks() / addClock() / removeClock() → same logic
 */
export default function ClockPanel({ t, isMobile, logout, isRTL }) {
    const [clocks, setClocks] = useState([]);
    const [times, setTimes] = useState({});
    const [allTimezones, setAllTimezones] = useState([]);
    const [selectedCity, setSelectedCity] = useState('');
    const [popupOpen, setPopupOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState('');
    const [hijriDate, setHijriDate] = useState('');
    const popupRef = useRef(null);
    const addBtnRef = useRef(null);
    const { toast, showToast } = useToast();

    // ── Detect current timezone (mirrors OJet) ─────────────────
    const currentTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const currentCity = currentTZ.split('/').pop().replace('_', ' ');

    const cityOptions = [
        ...allTimezones.map((tz) => ({
            value: tz.value,
            label: tz.label,
        })),
    ];

    const selectedCityOption = cityOptions.find((o) => o.value === selectedCity) || null;

    // ── Build timezone list (mirrors allTimeZones) ─────────────
    useEffect(() => {
        const tzList = Intl.supportedValuesOf('timeZone').map((tz) => {
            const city = tz.split('/').pop().replace(/_/g, ' ');
            const parts = new Intl.DateTimeFormat('ar', { timeZone: tz, timeZoneName: 'long' }).formatToParts(
                new Date(),
            );
            const tzName = parts.find((p) => p.type === 'timeZoneName')?.value || '';
            return { value: tz, city, label: `${city} {${tzName}}` };
        });
        setAllTimezones(tzList);
    }, []);

    // ── Load clocks from registry on mount ────────────────────
    useEffect(() => {
        const lang = localStorage.getItem('appLanguage') || 'en';

        // Dates
        const now = new Date();
        setCurrentDate(
            now.toLocaleDateString(lang, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
        );
        setHijriDate(
            new Intl.DateTimeFormat(`${lang}-u-ca-islamic`, { year: 'numeric', month: 'short', day: 'numeric' }).format(
                now,
            ),
        );

        const user = sessionStorage.getItem('user');
        const url = buildEndpointURL('main');
        const body = {
            command: 'Main',
            uid: '',
            params: { action: 'ReadRegistry', guid: 'User', key: user, name: 'FavoriteCities', value: '' },
        };

        fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.errors) {
                    if (data.errors[0].name === 'Session.NotFound') {
                        showToast('error', t('messages.sessionExpired'));
                        setTimeout(() => {
                            logout();
                        }, 1500);
                    } else showToast('error', data.errors[0].name);

                    return;
                }
                const saved = data?.result?.value ? JSON.parse(data.result.value) : null;
                setClocks(saved || [{ city: currentCity, isLocal: true, timezone: currentTZ }]);
            })
            .catch(() => {
                setClocks([{ city: currentCity, isLocal: true, timezone: currentTZ }]);
            });
    }, []);

    // ── Tick every second (mirrors updateTimes + setInterval) ──
    useEffect(() => {
        const tick = () => {
            const now = {};
            clocks.forEach((c) => {
                now[c.timezone] = new Date().toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                    timeZone: c.timezone,
                });
            });
            setTimes(now);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [clocks]);

    // ── Close popup on outside click ──────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (
                popupRef.current &&
                !popupRef.current.contains(e.target) &&
                addBtnRef.current &&
                !addBtnRef.current.contains(e.target)
            )
                setPopupOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── getHourOffset (mirrors OJet exactly) ──────────────────
    const getHourOffset = (timezone) => {
        const now = new Date();
        const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
        let offsetMinutes = Math.round((tzDate - now) / 1000 / 60);
        const sign = offsetMinutes >= 0 ? '+' : '-';
        offsetMinutes = Math.abs(offsetMinutes);
        const h = Math.floor(offsetMinutes / 60);
        const m = offsetMinutes % 60;
        return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const clockLabel = (clock) => {
        const localLabel = t ? t('localTime') : 'Local Time';
        return clock.isLocal ? `${clock.city} (${localLabel})` : `${clock.city} ${getHourOffset(clock.timezone)}`;
    };

    // ── Save to registry ──────────────────────────────────────
    const saveClocks = (newClocks) => {
        const user = sessionStorage.getItem('user');
        const url = buildEndpointURL('main');
        const body = {
            command: 'Main',
            uid: '',
            params: {
                action: 'WriteRegistry',
                guid: 'User',
                key: user,
                name: 'FavoriteCities',
                value: JSON.stringify(newClocks),
            },
        };
        fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }).catch(console.error);
    };

    // ── Add clock ─────────────────────────────────────────────
    const addClock = () => {
        if (!selectedCity) return;
        if (clocks.some((c) => c.timezone === selectedCity)) {
            setPopupOpen(false);
            return;
        }
        const cityObj = allTimezones.find((c) => c.value === selectedCity);
        if (!cityObj) return;
        const newClocks =
            cityObj.city !== currentCity
                ? [...clocks, { city: cityObj.city, isLocal: false, timezone: selectedCity }]
                : clocks;
        setClocks(newClocks);
        saveClocks(newClocks);
        setSelectedCity('');
        setPopupOpen(false);
    };

    // ── Remove clock ──────────────────────────────────────────
    const removeClock = (clock) => {
        const newClocks = clocks.filter((c) => c.timezone !== clock.timezone);
        setClocks(newClocks);
        saveClocks(newClocks);
    };

    // ── Hidden on mobile (mirrors oj-sm-only-hide) ─────────────
    // We still render so clocks keep ticking, but hide via CSS
    return (
        <div className={`clock-panel${isMobile ? ' clock-panel-hidden' : ''}`}>
            {/* Dates */}
            <div className="clock-date">{currentDate}</div>
            <div className="clock-date clock-date-hijri">{hijriDate}</div>

            {/* Clock list */}
            <div className="clock-list">
                {clocks.map((clock) => (
                    <div key={clock.timezone} className="clock-item">
                        <div className="clock-item-label">{clockLabel(clock)}</div>
                        <div className="clock-item-time">{times[clock.timezone] || '--:--:--'}</div>
                        {!clock.isLocal && (
                            <button className="clock-remove" onClick={() => removeClock(clock)} title="Remove">
                                ✕
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Add clock button + popup */}
            <div className="clock-add-wrapper">
                <button
                    ref={addBtnRef}
                    className="fab clock-add-btn"
                    onClick={() => setPopupOpen((v) => !v)}
                    title="Add city clock"
                >
                    <PlusIcon />
                </button>

                {popupOpen && (
                    <div className="fc-popup" ref={popupRef}>
                        <Select
                            styles={selectStyles(isRTL)}
                            className="form-select-wrap"
                            options={cityOptions}
                            value={selectedCityOption}
                            onChange={(option) => setSelectedCity(option?.value ?? '')}
                            placeholder={t ? t('chooseCity') : 'Choose city'}
                            isSearchable
                            placeholder={t ? t('chooseCommand') : 'Choose command'}
                        />
                        {/* <select
                            className="fc-select"
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                        >
                            <option value="">-- {t ? t('chooseCity') : 'Choose city'} --</option>
                            {allTimezones.map((tz) => (
                                <option key={tz.value} value={tz.value}>
                                    {tz.label}
                                </option>
                            ))}
                        </select> */}
                        <div className="fc-popup-actions">
                            <button className="fc-popup-confirm" onClick={addClock} disabled={!selectedCity}>
                                <PlusIcon /> {t ? t('add') : 'Add'}
                            </button>
                            <button className="fc-popup-cancel" onClick={() => setPopupOpen(false)}>
                                ✕ {t ? t('cancel') : 'Cancel'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
