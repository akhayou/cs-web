import { useState, useEffect, useRef } from 'react';
import ListPanel from './ListPanel.jsx';
import Select from 'react-select';
import MunimentDataForm from './composites/MunimentDataForm.jsx';
import { buildEndpointURL } from '../../services/config';
import { useToast } from '../../utils/core.jsx';
import { selectStyles } from '../../utils/Styles.js';
import { printCard } from '../../utils/printCard.js';

/**
 * MunimentsPage
 *
 * OJet → React mapping:
 *   connected() fetch RunSeed muniments       → useEffect on mount
 *   ko.observable / ko.observableArray        → useState
 *   oj-list-view + ListDataProviderView       → <ListPanel>
 *   oj-color-spectrum + oj-popup              → color picker (native input[type=color])
 *   lightenColor(colorInt)                    → lightenColor() helper
 *   munStyleColor(colorInt)                   → intToHtmlColor() helper
 *   serviceUtils.intToColor / colorToInt      → colorInt ↔ hex helpers
 *   <muniment-data id="munimentsDataForm">    → <MunimentDataForm ref={dataFormRef}>
 *   munimentsDataForm.refresh(json)           → dataFormRef.current.refresh(json)
 *   applyExecute                              → handleApply()
 *   newItemExecute                            → handleNew()
 *   parseItem                                 → handleSelect()
 *   deleteExecute                             → handleDelete()
 *   handleCancel                              → handleCancel()
 *   selectItem(array, id)                     → auto-select by routerKey or last
 *   oj-messages                               → toast state
 */

// ── Color helpers (mirrors serviceUtils.intToHtmlColor / colorToInt) ──
const intToHex = (colorInt) => {
    if (!colorInt) return '#ffffff';
    const hex = ((colorInt >>> 0) & 0xffffff).toString(16).padStart(6, '0');
    return `#${hex}`;
};

const hexToInt = (hex) => {
    if (!hex) return 0;
    return parseInt(hex.replace('#', ''), 16);
};

// mirrors lightenColor(color)
const lightenColor = (colorInt) => {
    const hex = intToHex(colorInt);
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * 80);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
    const result = `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
    return result === '#ffffff' ? '#cccccc' : result;
};

export default function MunimentsPage({ t, isMobile, onBack, logout, isRTL = false, routerKey = null }) {
    // ── Data ──────────────────────────────────────────────────
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast, showToast } = useToast();

    // ── Selection ─────────────────────────────────────────────
    const [selectedKey, setSelectedKey] = useState(routerKey);
    const [previousKey, setPreviousKey] = useState(null);
    const [method, setMethod] = useState('insert');
    const [isDisabled, setIsDisabled] = useState(true);

    // ── Form fields ───────────────────────────────────────────
    const [nameValue, setNameValue] = useState('');
    const [codeValue, setCodeValue] = useState('');
    const [munimentGuid, setMunimentGuid] = useState(null);
    const [colorHex, setColorHex] = useState('#4ecdc4'); // mirrors colorValue / previewColor

    // ── Refs ──────────────────────────────────────────────────
    const formRef = useRef(null);
    const dataFormRef = useRef(null);

    // ── Load data on mount ────────────────────────────────────
    useEffect(() => {
        const url = buildEndpointURL('main');
        const body = {
            command: 'main',
            uid: '',
            params: { action: 'RunSeed', method: 'select', name: 'muniments' },
        };

        fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data?.errors?.length) {
                    if (data.errors[0].name === 'Session.NotFound') {
                        showToast('error', t ? t('messages.sessionExpired') : 'Session expired');
                        setTimeout(logout, 1500);
                    } else showToast('error', data.errors[0].name);
                    return;
                }
                const fetched = data?.result?.items ?? [];
                setItems(fetched);

                if (fetched.length) {
                    const target = routerKey ? fetched.find((i) => String(i.MunUID) === String(routerKey)) : null;
                    handleSelect(target ?? fetched[fetched.length - 1]);
                }
            })
            .catch(() => showToast('error', 'Failed to load'))
            .finally(() => setLoading(false));
    }, []);

    // ── Select helpers for react-select ───────────────────────
    const toOption = (arr, keyF) => arr.map((i) => ({ value: i[keyF], label: t(`router.${i[keyF]}`) }));

    const findOption = (arr, keyF, val) => toOption(arr, keyF).find((o) => o.value === val) ?? null;

    // ── Muniment Types  Schema  ───────────────────────
    const munTypes = sessionStorage.getItem('munTypesData');
    const munTypesData = munTypes ? JSON.parse(munTypes) : null;

    const toSTypeSchema = (value) => (munTypesData ? munTypesData.find((item) => item.guid === value)?.fields : null);

    // ── Select item (mirrors parseItem) ───────────────────────
    const handleSelect = (item) => {
        if (!item) return;
        setIsDisabled(true);
        setMethod('update');
        setSelectedKey(item.MunUID);
        setNameValue(item.MunName ?? '');
        setCodeValue(item.MunCode ?? '');
        setMunimentGuid(item.MunGuid ?? null);
        setColorHex(intToHex(item.MunColor));
        const typeSchema = toSTypeSchema(item.MunGuid);
        console.log(typeSchema);
        dataFormRef.current?.refresh(typeSchema, item.MunData);
    };

    // ── New (mirrors newItemExecute) ──────────────────────────
    const handleNew = () => {
        setPreviousKey(selectedKey);
        setIsDisabled(false);
        setMethod('insert');
        setSelectedKey(null);
        setNameValue('');
        setCodeValue('');
        setMunimentGuid(null);
        setColorHex('#4ecdc4');
        dataFormRef.current?.refresh(null, null);
    };

    // ── Cancel (mirrors handleCancel) ─────────────────────────
    const handleCancel = () => {
        const target = selectedKey
            ? items.find((i) => i.MunUID === selectedKey)
            : previousKey
              ? items.find((i) => i.MunUID === previousKey)
              : items[items.length - 1];
        if (target) handleSelect(target);
    };

    // ── Delete (mirrors deleteExecute) ────────────────────────
    const handleDelete = () => {
        if (!selectedKey) return;
        const url = buildEndpointURL('main');
        const body = {
            command: 'Main',
            uid: '',
            params: {
                action: 'RunSeed',
                method: 'delete',
                name: 'muniments',
                fields: { MunUID: selectedKey },
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
                const newItems = items.filter((i) => i.MunUID !== selectedKey);
                setItems(newItems);
                setSelectedKey(null);
                if (newItems.length) handleSelect(newItems[newItems.length - 1]);
                showToast('info', t ? t('messages.operationDone') : 'Done');
            })
            .catch(() => showToast('error', 'Delete failed'));
    };

    // ── Apply (mirrors applyExecute) ──────────────────────────
    const handleApply = () => {
        if (!formRef.current?.reportValidity()) return;

        const url = buildEndpointURL('main');
        const body = {
            command: 'Main',
            uid: '',
            params: {
                action: 'RunSeed',
                method,
                name: 'muniments',
                fields: {
                    MunName: nameValue,
                    MunCode: codeValue,
                    MunGuid: munimentGuid,
                    MunColor: hexToInt(colorHex),
                    MunData: dataFormRef.current?.getValues() ?? {},
                    ...(selectedKey ? { MunUID: selectedKey } : {}),
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
                    if (data.errors[0].name === 'Session.NotFound') {
                        showToast('error', t ? t('messages.sessionExpired') : 'Session expired');
                        setTimeout(logout, 1500);
                    } else showToast('error', data.errors[0].name);
                    return;
                }
                const saved = data.result.items[0];
                if (method === 'update') {
                    setItems((prev) => prev.map((i) => (i.MunUID === selectedKey ? saved : i)));
                } else {
                    setItems((prev) => [...prev, saved]);
                    handleSelect(saved);
                }
                showToast('info', t ? t('messages.operationDone') : 'Done');
                setIsDisabled(true);
            })
            .catch(() => showToast('error', 'Save failed'));
    };

    // ── List item renderer — colored icon (mirrors list template) ─
    const renderListIcon = (item) => {
        const bg = lightenColor(item.MunColor);
        const fg = intToHex(item.MunColor);
        return (
            <div
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <i className="ph ph-books" style={{ color: fg, fontSize: 16 }} />
            </div>
        );
    };

    return (
        <div className="page-layout">
            {/* Toast */}
            {toast && <div className={`page-toast page-toast-${toast.type}`}>{toast.message}</div>}

            {/* Left panel */}
            <ListPanel
                items={items}
                loading={loading}
                guid="muniments"
                keyField="MunUID"
                labelField="MunName"
                secondaryField="MunCode"
                selectedKey={selectedKey}
                onSelect={handleSelect}
                onNew={handleNew}
                onDelete={handleDelete}
                onPrint={() => printPanel('mun-card', t ? t('router.muniments') : 'Muniments')}
                renderIcon={renderListIcon}
                t={t}
                isMobile={isMobile}
            />

            {/* Right panel */}
            <div id="mun-card" className="page-form-panel">
                <form ref={formRef} noValidate onSubmit={(e) => e.preventDefault()}>
                    <div className="page-form-grid">
                        {/* Left column */}
                        <div className="page-form-col">
                            {method === 'insert' ? (
                                <div className="form-field">
                                    <label className="form-label">{t ? t('inputs.munType') : 'Muniment Type'}</label>
                                    <div className="form-select-wrap">
                                        <Select
                                            className="form-select-wrap"
                                            styles={selectStyles(isRTL)}
                                            isClearable
                                            options={toOption(munTypesData, 'guid')}
                                            value={findOption(munTypesData, 'guid', munimentGuid)}
                                            onChange={(opt) => {
                                                setMunimentGuid(opt?.value ?? null);
                                                const typeSchema = toSTypeSchema(opt?.value);
                                                dataFormRef.current?.refresh(typeSchema, null);
                                            }}
                                            placeholder={t ? t('inputs.munType') : 'Muniment Type'}
                                        />
                                    </div>
                                </div>
                            ) : null}
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

                            {/* Color picker (mirrors oj-color-spectrum + preview div) */}
                            <div className="form-field">
                                <label className="form-label">{t ? t('labels.color') : 'Color'}</label>
                                <div className="mun-color-row">
                                    {/* Color preview + native picker */}
                                    <label className="mun-color-preview" style={{ background: colorHex }}>
                                        <input
                                            type="color"
                                            value={colorHex}
                                            onChange={(e) => {
                                                setColorHex(e.target.value);
                                                setIsDisabled(false);
                                            }}
                                            style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }}
                                        />
                                    </label>
                                    <span className="mun-color-hex">{colorHex}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right column — empty in OJet (commented out part section) */}
                        <div className="page-form-col" />
                    </div>
                </form>

                {/* Muniment data form (mirrors <muniment-data id="munimentsDataForm">) */}
                <MunimentDataForm
                    ref={dataFormRef}
                    showLabel={true}
                    t={t}
                    isRTL={isRTL}
                    onChange={() => setIsDisabled(false)}
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
        </div>
    );
}
