import { useState, useEffect, useRef, useCallback } from 'react';
import ListPanel from '../components/ListPanel.jsx';
import DescriptorForm from '../components/DescriptorForm.jsx';
import Select from 'react-select';
import { buildEndpointURL } from '../services/config.js';
import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { selectStyles } from '../utils/Styles.js';
import { printCard } from '../utils/printCard.js';
import { Visibility } from '@mui/icons-material';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});
/**
 * AccountsPage
 *
 *   connected() / disconnected()          → useEffect mount/unmount
 *   loadAllData() Promise.all             → useEffect parallel fetch
 *   ko.observable / ko.observableArray    → useState
 *   oj-list-view + ListDataProviderView   → <ListPanel> component
 *   filter.subscribe                      → passed to ListPanel (handled internally)
 *   oj-select-single                      → react-select <Select>
 *   oj-radioset natureDP                  → radio buttons
 *   oj-switch isDealerAccount etc.        → toggle switches
 *   leaflet map                           → useEffect with leaflet
 *   gotoMyLocation()                      → navigator.geolocation
 *   mapInstance.on('click')               → map click handler
 *   desc-form#descriptorsForm             → <DescriptorForm ref={descriptorRef}>
 *   descForm.refresh() / setValues() etc. → descriptorRef.current.*
 *   applyExecute()                        → handleApply()
 *   newItemExecute(isBook)                → handleNew(isBook)
 *   parseItem(item)                       → handleSelect(item)
 *   handleCancel()                        → handleCancel()
 *   selectItem(array, id)                 → auto-select last/specific item
 *   accountReports from seeds             → computed from sessionStorage seeds
 *   menuItemAction / contextMenuItem      → onNew / onDelete / onPrint / onReport
 *   oj-messages                           → toast state
 *   checkValidationGroup                  → formRef.current.reportValidity()
 */

// ── react-select shared styles ────────────────────────────────
// const selectStyles = {
//     control: (base, state) => ({
//         ...base,
//         backgroundColor: 'var(--card-bg)',
//         fontSize: '13.5px',
//         borderRadius: '8px',
//         borderColor: state.isFocused ? 'var(--accent)' : 'var(--border)',
//         color: 'var(--text)',
//         boxShadow: 'none',
//         '&:hover': { borderColor: 'var(--accent)' },
//     }),
//     menu: (base) => ({
//         ...base,
//         backgroundColor: 'var(--surface)',
//         color: 'var(--text)',
//         zIndex: 9999,
//     }),
//     option: (base, state) => ({
//         ...base,
//         backgroundColor: state.isFocused ? 'rgba(78,205,196,0.15)' : 'var(--surface)',
//         fontSize: '13.5px',
//         color: 'var(--text)',
//         cursor: 'pointer',
//     }),
//     singleValue: (base) => ({ ...base, color: 'var(--text)' }),
//     input: (base) => ({ ...base, color: 'var(--text)' }),
//     placeholder: (base) => ({ ...base, color: 'var(--text-muted)' }),
// };

// ── Main component ─────────────────────────────────────────────
export default function AccountsPage({ t, isMobile, onBack, logout, isRTL = false, routerKey = null }) {
    // ── Data ──────────────────────────────────────────────────
    const [items, setItems] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [finalAccounts, setFinalAccounts] = useState([]);
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    // ── Selection ─────────────────────────────────────────────
    const [selectedKey, setSelectedKey] = useState(routerKey);
    const [previousKey, setPreviousKey] = useState(null);
    const [method, setMethod] = useState('insert');
    const [isDisabled, setIsDisabled] = useState(true);

    // ── Form fields ───────────────────────────────────────────
    const [nameValue, setNameValue] = useState('');
    const [codeValue, setCodeValue] = useState('');
    const [isBookValue, setIsBookValue] = useState(false);
    const [bookValue, setBookValue] = useState(null);
    const [finalAccountValue, setFinalAccountValue] = useState(null);
    const [currencyValue, setCurrencyValue] = useState(null);
    const [natureValue, setNatureValue] = useState(0);
    const [isDealerAccount, setIsDealerAccount] = useState(false);
    const [isFinalAccount, setIsFinalAccount] = useState(false);
    const [isContactAccount, setIsContactAccount] = useState(false);
    const [location, setLocation] = useState(null);
    const [listVisible, setListVisible] = useState(false);

    // ── Refs ──────────────────────────────────────────────────
    const formRef = useRef(null);
    const descriptorRef = useRef(null);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    // ── Account reports from seeds ────────────────────────────
    const seeds = JSON.parse(localStorage.getItem('seeds') || '[]');
    const accountReports = seeds
        .filter((s) => s.Parent === 'Accounts' && s.Params?.IsReport === 'True')
        .map((s) => ({ value: s.Name, label: t ? t(`router.${s.Name}`) : s.Name }));

    // ── Nature options (mirrors natureOptions) ────────────────
    const natureOptions = [
        { value: 0, label: t ? t('labels.unspecified') : 'Unspecified' },
        { value: 1, label: t ? t('labels.debit') : 'Debit' },
        { value: 2, label: t ? t('labels.credit') : 'Credit' },
    ];

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Parse location string "(lat,lng)" ─────────────────────
    const parseLocation = (str) => {
        if (!str) return { lat: 48.8566, lng: 2.3522 };
        const parts = str.replace(/[()]/g, '').split(',');
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        return isNaN(lat) || isNaN(lng) ? { lat: 48.8566, lng: 2.3522 } : { lat, lng };
    };

    // ── Update map position ───────────────────────────────────
    const changeLocation = useCallback((value) => {
        if (!mapInstanceRef.current) return;
        const { lat, lng } = parseLocation(value);
        mapInstanceRef.current.setView([lat, lng], 13);
        if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
        } else {
            import('leaflet').then((L) => {
                markerRef.current = L.marker([lat, lng])
                    .addTo(mapInstanceRef.current)
                    .bindPopup(t ? t('labels.urHere') : 'You are here')
                    .openPopup();
            });
        }
    }, []);

    // ── Sync map when location changes ────────────────────────
    useEffect(() => {
        changeLocation(location);
    }, [location, changeLocation]);

    // ── Init Leaflet map ──────────────────────────────────────
    useEffect(() => {
        let map;
        import('leaflet').then((L) => {
            if (mapInstanceRef.current || !mapRef.current) return;

            map = L.map(mapRef.current).setView([0, 0], 2);
            map.attributionControl.setPosition('topright');

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
            }).addTo(map);

            // Click to set location (mirrors mapInstance.on('click'))
            map.on('click', (e) => {
                const { lat, lng } = e.latlng;
                setLocation(`(${lat},${lng})`);
                if (!markerRef.current) {
                    markerRef.current = L.marker([lat, lng]).addTo(map);
                } else {
                    markerRef.current.setLatLng([lat, lng]);
                }
                markerRef.current.bindPopup(`${lat.toFixed(5)}, ${lng.toFixed(5)}`).openPopup();
                setIsDisabled(false);
            });

            mapInstanceRef.current = map;

            // Go to user location on init
            gotoMyLocation();
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markerRef.current = null;
            }
        };
    }, []);

    // ── Go to my location (mirrors gotoMyLocation) ────────────
    const gotoMyLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                if (!mapInstanceRef.current) return;
                mapInstanceRef.current.setView([lat, lng], 13);
                import('leaflet').then((L) => {
                    L.marker([lat, lng])
                        .addTo(mapInstanceRef.current)
                        .bindPopup(t ? t('labels.urHere') : 'You are here')
                        .openPopup();
                });
            },
            (err) => console.error('Geolocation error:', err.message),
        );
        setIsDisabled(false);
    };

    // ── Load all data (mirrors loadAllData) ───────────────────
    useEffect(() => {
        const url = buildEndpointURL('main');

        const seed = (command, name, query = null) => ({
            command,
            uid: '',
            params: { action: 'RunSeed', method: 'select', name, ...(query && { query }) },
        });

        const opts = (body) => ({
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        Promise.all([
            fetch(url, opts(seed('Stocks', 'Accounts'))),
            fetch(url, opts(seed('Main', 'Currencies'))),
            fetch(url, opts(seed('Main', 'Descriptors', { guids: '{Accounts}' }))),
        ])
            .then((responses) => Promise.all(responses.map((r) => r.json())))
            .then(([accounts, currenciesData, descriptorsData]) => {
                // Accounts
                const accs = accounts?.result?.items || [];
                setItems(accs);
                setFinalAccounts(accs.filter((i) => i.AccIsFinal));
                setBooks(accs.filter((i) => i.ElmIsBook));

                const dscs = descriptorsData?.result?.items || [];
                descriptorRef.current?.refresh(JSON.stringify(dscs));

                if (accs.length) {
                    // Look for the ID from the URL (routerKey)
                    const itemToSelect = routerKey
                        ? accs.find((i) => String(i.ElmUID) === String(routerKey))
                        : accs[accs.length - 1];

                    handleSelect(itemToSelect || accs[accs.length - 1]);
                }

                // Currencies
                setCurrencies(currenciesData?.result?.items || []);

                // Descriptors
            })
            .catch((err) => {
                console.error(err);
                showToast('error', 'Failed to load data');
            })
            .finally(() => setLoading(false));
    }, [routerKey]);

    // ── Select item (mirrors parseItem) ───────────────────────
    const handleSelect = (item) => {
        setIsDisabled(true);
        setMethod('update');
        setSelectedKey(item.ElmUID);
        setNameValue(item.ElmName ?? '');
        setCodeValue(item.ElmCode ?? '');
        setIsBookValue(!!item.ElmIsBook);
        setBookValue(item.ElmParent ?? null);
        setFinalAccountValue(item.AccFinal ?? null);
        setCurrencyValue(item.AccCurID ?? null);
        setNatureValue(item.AccNature ?? 0);
        setIsDealerAccount(!!item.AccIsDealer);
        setIsFinalAccount(!!item.AccIsFinal);
        setIsContactAccount(!!item.AccIsContact);
        setLocation(item.ElmLocation ?? null);
        descriptorRef.current?.setValues(item.DscDataInfo ?? null);
    };

    // ── New item (mirrors newItemExecute) ─────────────────────
    const handleNew = (isBook = false) => {
        setPreviousKey(selectedKey);
        setIsDisabled(false);
        setMethod('insert');
        setSelectedKey(null);
        setNameValue('');
        setCodeValue('');
        setIsBookValue(isBook);
        setBookValue(null);
        setFinalAccountValue(null);
        setCurrencyValue(null);
        setNatureValue(0);
        setIsDealerAccount(false);
        setIsFinalAccount(false);
        setIsContactAccount(false);
        setLocation(null);
        descriptorRef.current?.setValues(null);
    };

    // ── Cancel (mirrors handleCancel) ─────────────────────────
    const handleCancel = () => {
        const prev = items.find((i) => i.ElmUID === (selectedKey || previousKey));
        if (prev) handleSelect(prev);
        else handleNew(false);
    };

    // ── Validate form ─────────────────────────────────────────
    const validate = () => {
        if (!formRef.current?.reportValidity()) return false;
        if (!descriptorRef.current?.validate()) return false;
        return true;
    };

    // ── Apply (mirrors applyExecute) ──────────────────────────
    const handleApply = () => {
        if (!validate()) return;

        const center = mapInstanceRef.current?.getCenter();
        const loc = center ? `(${center.lat},${center.lng})` : location;

        const url = buildEndpointURL('main');
        const body = {
            command: 'Main',
            uid: '',
            params: {
                action: 'RunSeed',
                method,
                name: 'accounts',
                fields: {
                    ElmName: nameValue,
                    ElmCode: codeValue,
                    ElmIsBook: isBookValue,
                    ElmParent: bookValue,
                    ElmLocation: loc,
                    AccIsDealer: isDealerAccount,
                    AccIsFinal: isFinalAccount,
                    AccIsContact: isContactAccount,
                    AccFinal: finalAccountValue,
                    AccCurID: currencyValue,
                    AccNature: natureValue,
                    DscData: descriptorRef.current?.getValues() ?? [],
                    ...(selectedKey ? { ElmUID: selectedKey } : {}),
                },
            },
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
                    showToast('error', data.errors[0].name);
                    return;
                }
                const saved = data.result.items[0];
                if (method === 'update') {
                    setItems((prev) => prev.map((i) => (i.ElmUID === selectedKey ? saved : i)));
                } else {
                    setItems((prev) => [...prev, saved]);
                    handleSelect(saved);
                }
                showToast('info', t ? t('messages.operationDone') : 'Done');
            })
            .catch(() => showToast('error', 'Save failed'));
    };

    // ── Select helpers for react-select ───────────────────────
    const toOption = (arr, keyF, labelF) => arr.map((i) => ({ value: i[keyF], label: i[labelF] }));

    const findOption = (arr, keyF, labelF, val) => toOption(arr, keyF, labelF).find((o) => o.value === val) ?? null;

    // ── Toggle Switch (mirrors oj-switch) ─────────────────────────
    function Switch({ checked, onChange, label }) {
        return (
            <label className="accounts-switch">
                <div
                    className={`accounts-switch-track${checked ? ' on' : ''}`}
                    onClick={() => {
                        onChange(!checked);
                        setIsDisabled(false);
                    }}
                >
                    <div className="accounts-switch-thumb" />
                </div>
                <span className="accounts-switch-label">{label}</span>
            </label>
        );
    }

    return (
        <div className="page-layout">
            {/* Toast */}
            {toast && <div className={`page-toast page-toast-${toast.type}`}>{toast.message}</div>}

            {/* Left panel — ListPanel with extra menu items */}
            <ListPanel
                items={items}
                loading={loading}
                guid="accounts"
                keyField="ElmUID"
                labelField="ElmName"
                secondaryField="ElmCode"
                selectedKey={selectedKey}
                onSelect={handleSelect}
                onNew={() => handleNew(false)}
                onNewFolder={() => handleNew(true)}
                onDelete={() => showToast('info', 'Delete not implemented')}
                onPrint={() => printCard('card', t('router.accounts'))}
                extraMenuItems={accountReports.map((r) => ({
                    label: r.label,
                    onClick: () => console.log('Report:', r.value),
                }))}
                t={t}
                isMobile={isMobile}
                isRTL={isRTL}
                onShowListChange={
                    (isVisible) => setListVisible(isVisible) // <-- update page state
                }
            />

            {/* Right panel */}
            {isMobile && listVisible ? null : (
                <div id="card" className="page-form-panel">
                    <form ref={formRef} noValidate onSubmit={(e) => e.preventDefault()}>
                        <div className="page-form-grid">
                            {/* Left column — main fields */}
                            <div className="page-form-col">
                                <div className="form-field">
                                    <label className="form-label">{t ? t('inputs.name') : 'Name'} *</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        required
                                        value={nameValue}
                                        onChange={(e) => {
                                            setNameValue(e.target.value);
                                            setIsDisabled(false);
                                        }}
                                    />
                                </div>

                                <div className="form-field">
                                    <label className="form-label">{t ? t('inputs.code') : 'Code'}</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        value={codeValue}
                                        onChange={(e) => {
                                            setCodeValue(e.target.value);
                                            setIsDisabled(false);
                                        }}
                                    />
                                </div>

                                {/* Book (parent account) */}
                                <div className="form-field">
                                    <label className="form-label">{t ? t('inputs.book') : 'Book'}</label>
                                    <div className="form-select-wrap">
                                        <Select
                                            className="form-select-wrap"
                                            styles={selectStyles(isRTL)}
                                            isClearable
                                            options={toOption(books, 'ElmUID', 'ElmName')}
                                            value={findOption(books, 'ElmUID', 'ElmName', bookValue)}
                                            onChange={(opt) => {
                                                setBookValue(opt?.value ?? null);
                                                setIsDisabled(false);
                                            }}
                                            placeholder={t ? t('inputs.book') : 'Book'}
                                        />
                                    </div>
                                </div>

                                {/* Final account */}
                                <div className="form-field">
                                    <label className="form-label">
                                        {t ? t('inputs.finalAccount') : 'Final Account'}
                                    </label>
                                    <div className="form-select-wrap">
                                        <Select
                                            styles={selectStyles(isRTL)}
                                            isClearable
                                            options={toOption(finalAccounts, 'ElmUID', 'ElmName')}
                                            value={findOption(finalAccounts, 'ElmUID', 'ElmName', finalAccountValue)}
                                            onChange={(opt) => {
                                                setFinalAccountValue(opt?.value ?? null);
                                                setIsDisabled(false);
                                            }}
                                            placeholder={t ? t('inputs.finalAccount') : 'Final Account'}
                                        />
                                    </div>
                                </div>

                                {/* Currency */}
                                <div className="form-field">
                                    <label className="form-label">{t ? t('labels.currency') : 'Currency'}</label>
                                    <div className="form-select-wrap">
                                        <Select
                                            styles={selectStyles(isRTL)}
                                            isClearable
                                            options={toOption(currencies, 'ElmUID', 'ElmName')}
                                            value={findOption(currencies, 'ElmUID', 'ElmName', currencyValue)}
                                            onChange={(opt) => {
                                                setCurrencyValue(opt?.value ?? null);
                                                setIsDisabled(false);
                                            }}
                                            placeholder={t ? t('labels.currency') : 'Currency'}
                                        />
                                    </div>
                                </div>

                                {/* Nature radioset (mirrors oj-radioset) */}
                                <div className="form-field">
                                    <label className="form-label">
                                        {t ? t('labels.accountNature') : 'Account Nature'}
                                    </label>
                                    <div className="accounts-radio-group">
                                        {natureOptions.map((opt) => (
                                            <label key={opt.value} className="accounts-radio">
                                                <input
                                                    type="radio"
                                                    name="nature"
                                                    value={opt.value}
                                                    checked={natureValue === opt.value}
                                                    onChange={() => {
                                                        setNatureValue(opt.value);
                                                        setIsDisabled(false);
                                                    }}
                                                />
                                                <span>{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {isMobile ? (
                                    <>
                                        <div className="accounts-switches-row">
                                            <Switch
                                                checked={isDealerAccount}
                                                onChange={setIsDealerAccount}
                                                label={t ? t('labels.isDealerAccount') : 'Dealer'}
                                            />
                                            <Switch
                                                checked={isFinalAccount}
                                                onChange={setIsFinalAccount}
                                                label={t ? t('labels.isFinalAccount') : 'Final'}
                                            />
                                            <Switch
                                                checked={isContactAccount}
                                                onChange={setIsContactAccount}
                                                label={t ? t('labels.isContact') : 'Contact'}
                                            />
                                        </div>
                                    </>
                                ) : null}
                            </div>

                            {/* Right column — map */}
                            <div className="page-form-col">
                                <div className="accounts-map-header">
                                    <strong id="Not-Printable">{t ? t('labels.location') : 'Location'}</strong>
                                    <button className="accounts-location-btn" type="button" onClick={gotoMyLocation}>
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        >
                                            <circle cx="12" cy="12" r="3" />
                                            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                                            <circle cx="12" cy="12" r="9" />
                                        </svg>
                                        {t ? t('commands.myLocation') : 'My Location'}
                                    </button>
                                </div>
                                <div ref={mapRef} className="accounts-map" />

                                {!isMobile ? (
                                    <>
                                        <div className="accounts-switches-row">
                                            <Switch
                                                checked={isDealerAccount}
                                                onChange={setIsDealerAccount}
                                                label={t ? t('labels.isDealerAccount') : 'Dealer'}
                                            />
                                            <Switch
                                                checked={isFinalAccount}
                                                onChange={setIsFinalAccount}
                                                label={t ? t('labels.isFinalAccount') : 'Final'}
                                            />
                                            <Switch
                                                checked={isContactAccount}
                                                onChange={setIsContactAccount}
                                                label={t ? t('labels.isContact') : 'Contact'}
                                            />
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </form>

                    {/* Descriptor form (mirrors <desc-form>) */}
                    <DescriptorForm
                        ref={descriptorRef}
                        showLabel={true}
                        t={t}
                        isRTL={isRTL}
                        onFieldChange={() => setIsDisabled(false)}
                    />

                    {/* Action buttons */}
                    <div className="page-form-actions">
                        <button className="page-btn-apply" onClick={handleApply}>
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                            >
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            {t ? t('commands.apply') : 'Apply'}
                        </button>
                        <button className="page-btn-cancel" disabled={isDisabled} onClick={handleCancel}>
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            {t ? t('commands.cancel') : 'Cancel'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
