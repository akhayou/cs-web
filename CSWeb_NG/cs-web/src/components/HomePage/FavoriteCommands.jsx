import { useState, useEffect, useRef } from 'react';
import { PlusIcon } from '../MainPage/Icons.jsx';
import { buildEndpointURL } from '../../services/config';
import Commands from './Commands.jsx';

export default function FavoriteCommands({ availableCommands = [], onNavigate, t }) {
    const [favorites, setFavorites] = useState([]);
    const [available, setAvailable] = useState([]);
    const [selected, setSelected] = useState('');
    const [popupOpen, setPopupOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const popupRef = useRef(null);
    const addBtnRef = useRef(null);

    // ── Load favorites from registry on mount ─────────────────
    useEffect(() => {
        const user = sessionStorage.getItem('user');
        const url = buildEndpointURL('main');

        const body = {
            command: 'Main',
            uid: '',
            params: { action: 'ReadRegistry', guid: 'User', key: user, name: 'FavoriteCommands', value: '' },
        };

        fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
            .then((r) => r.json())
            .then((data) => {
                const favs = data?.result?.value ? JSON.parse(data.result.value) : [];
                setFavorites(favs);
                setAvailable(availableCommands.filter((cmd) => !favs.some((f) => f.id === cmd.id)));
            })
            .catch(() => {
                setAvailable(availableCommands);
            })
            .finally(() => setLoading(false));
    }, []);

    // ── Close popup on outside click ──────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (
                popupRef.current &&
                !popupRef.current.contains(e.target) &&
                addBtnRef.current &&
                !addBtnRef.current.contains(e.target)
            ) {
                setPopupOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Save to registry ──────────────────────────────────────
    const saveToRegistry = (newFavs) => {
        const user = sessionStorage.getItem('user');
        const url = buildEndpointURL('main');
        const body = {
            command: 'Main',
            uid: '',
            params: {
                action: 'WriteRegistry',
                guid: 'User',
                key: user,
                name: 'FavoriteCommands',
                value: JSON.stringify(newFavs),
            },
        };
        fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
            .then((r) => r.json())
            .catch(console.error);
    };

    // ── Add favorite ──────────────────────────────────────────
    const addFavorite = () => {
        const cmd = available.find((c) => c.command === selected);
        if (!cmd) return;
        const newFavs = [...favorites, cmd];
        setFavorites(newFavs);
        setAvailable((prev) => prev.filter((c) => c.command !== cmd.command));
        setSelected('');
        setPopupOpen(false);
        saveToRegistry(newFavs);
    };

    // ── Remove favorite ───────────────────────────────────────
    const removeFavorite = (command) => {
        const removed = favorites.find((f) => f.command === command);
        const newFavs = favorites.filter((f) => f.command !== command);
        setFavorites(newFavs);
        if (removed) setAvailable((prev) => [...prev, removed]);
        saveToRegistry(newFavs);
    };

    if (loading) return <div className="fc-loading">...</div>;

    return (
        <div className="fc-wrapper">
            {/* Add button */}
            <div className="fc-add-wrapper">
                <p className="section-title fav-title">{t('favoriteCommands')}</p>
                {/* Popup */}
                {popupOpen && (
                    <div className="fc-popup" ref={popupRef}>
                        <select className="fc-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
                            <option value="">-- {t ? t('chooseCommand') : 'Choose command'} --</option>
                            {available.map((cmd) => (
                                <option key={cmd.command} value={cmd.command}>
                                    {t ? t(`router.${cmd.id}`) : cmd.id}
                                </option>
                            ))}
                        </select>
                        <div className="fc-popup-actions">
                            <button className="fc-popup-confirm" onClick={addFavorite} disabled={!selected}>
                                <PlusIcon /> {t ? t('add') : 'Add'}
                            </button>
                            <button className="fc-popup-cancel" onClick={() => setPopupOpen(false)}>
                                ✕ {t ? t('cancel') : 'Cancel'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {/* Favorite buttons */}
            <Commands
                commands={favorites}
                t={t}
                isFavorite={true}
                onNavigate={onNavigate}
                rmFavorite={removeFavorite}
            />
            {/*remove favorites*/}
            <div className="fc-add-wrapper">
                <button
                    ref={addBtnRef}
                    className="fab fc-add-btn"
                    onClick={() => setPopupOpen((v) => !v)}
                    title="Add command"
                >
                    <PlusIcon />
                </button>
            </div>
        </div>
    );
}
