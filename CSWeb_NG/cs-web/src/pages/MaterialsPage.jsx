import { useState, useEffect, useRef } from 'react';
import ListPanel from '../components/ListPanel.jsx';
import DescriptorForm from '../components/DescriptorForm.jsx';
import UnitsTable from '../components/UnitsTable.jsx';
import PricesTable from '../components/PricesTable.jsx';
import BarcodesTable from '../components/BarcodesTable.jsx';
import Select from 'react-select';
import { buildEndpointURL } from '../services/config.js';
import { selectStyles } from '../utils/Styles.js';
import { useToast } from '../utils/core.jsx';
import { printCard } from '../utils/printCard.js';
import { marker } from 'leaflet';

/**
 * MaterialsPage
 *
 * OJet → React mapping:
 *   connected() Promise.all                  → useEffect on mount
 *   ko.observable / ko.observableArray       → useState
 *   oj-list-view + ListDataProviderView      → <ListPanel>
 *   oj-tab-bar currView                      → activeTab state
 *   oj-bind-if currView == 'barcodes' etc.   → activeTab === 'barcodes' etc.
 *   oj-radioset costWaysDP                   → radio buttons
 *   oj-switch isSerial / isQuantityPrices    → Switch component
 *   barcodesTable.refresh / setCategories    → barcodesRef.current.*
 *   unitiesTable.refresh / setUnities        → unitsRef.current.*
 *   pricesTable.refresh / setPrices          → pricesRef.current.*
 *   descForm.refresh / setValues / getValues → descriptorRef.current.*
 *   preview observable + _printNoScale       → printPanel('card', ...)
 *   applyExecute                             → handleApply()
 *   newItemExecute(isBook)                   → handleNew(isBook)
 *   parseItem(item)                          → handleSelect(item)
 *   handleCancel                             → handleCancel()
 *   selectItem(array, id)                    → auto-select by routerKey or last
 */

// ── Toggle Switch (mirrors oj-switch) ─────────────────────────
function Switch({ checked, onChange, label }) {
    return (
        <label className="accounts-switch">
            <div className={`accounts-switch-track${checked ? ' on' : ''}`} onClick={() => onChange(!checked)}>
                <div className="accounts-switch-thumb" />
            </div>
            <span className="accounts-switch-label">{label}</span>
        </label>
    );
}

// ── Tab bar item ───────────────────────────────────────────────
const TABS = [
    { id: 'barcodes', icon: 'ph ph-barcode' },
    { id: 'unities', icon: 'ph ph-unite' },
    { id: 'prices', icon: 'ph ph-tag' },
];

export default function MaterialsPage({ t, isMobile, onBack, logout, isRTL = false, routerKey = null }) {
    // ── Data ──────────────────────────────────────────────────
    const [items, setItems] = useState([]);
    const [books, setBooks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [unities, setUnities] = useState([]);
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast, showToast } = useToast();
    const [preview, setPreview] = useState(false);
    const [listVisible, setListVisible] = useState(false);

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
    const [costWayValue, setCostWayValue] = useState(0);
    const [isSerialValue, setIsSerialValue] = useState(false);
    const [isQuantityPricesValue, setIsQuantityPricesValue] = useState(false);

    // ── Tab state (mirrors currView) ──────────────────────────
    const [activeTab, setActiveTab] = useState('barcodes');

    // ── Refs ──────────────────────────────────────────────────
    const formRef = useRef(null);
    const descriptorRef = useRef(null);
    const unitsRef = useRef(null);
    const pricesRef = useRef(null);
    const barcodesRef = useRef(null);

    // ── Cost way options (mirrors costWaysDP) ─────────────────
    const costWayOptions = [
        { value: 0, label: t ? t('labels.materials.costWay.wac') : 'WAC' },
        { value: 1, label: t ? t('labels.materials.costWay.fifo') : 'FIFO' },
        { value: 2, label: t ? t('labels.materials.costWay.lifo') : 'LIFO' },
    ];

    // ── Helpers ───────────────────────────────────────────────
    const toOption = (arr, kF, lF) => arr.map((i) => ({ value: i[kF], label: i[lF] }));
    const findOption = (arr, kF, lF, val) => toOption(arr, kF, lF).find((o) => o.value === val) ?? null;

    // mirrors refreshTables() — sync all child table refs
    const refreshTables = (item, cats, units, pris) => {
        const cats_ = cats ?? categories;
        const units_ = units ?? unities;
        const pris_ = pris ?? prices;

        barcodesRef.current?.setCategories?.(cats_);
        barcodesRef.current?.setUnities?.(units_);
        barcodesRef.current?.refresh(item?.MatBarcodesInfo ?? []);

        unitsRef.current?.setUnities?.(units_);
        unitsRef.current?.refresh(item?.MatUnitsInfo ?? []);

        pricesRef.current?.setUnities?.(units_);
        pricesRef.current?.setPrices?.(pris_);
        pricesRef.current?.refresh(item?.MatPricesInfo ?? []);
    };

    // ── Load all data ─────────────────────────────────────────
    useEffect(() => {
        const url = buildEndpointURL('main');
        const opts = (body) => ({
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const seed = (cmd, name, query = null) => ({
            command: cmd,
            uid: '',
            params: { action: 'RunSeed', method: 'select', name, ...(query && { query }) },
        });

        Promise.all([
            fetch(url, opts(seed('main', 'materials'))),
            fetch(url, opts(seed('Main', 'Descriptors', { guids: '{Materials}' }))),
            fetch(url, opts(seed('main', 'categories', { ElmIsBook: false }))),
            fetch(url, opts(seed('main', 'units', { ElmIsBook: false }))),
            fetch(url, opts(seed('main', 'prices', { ElmIsBook: false }))),
        ])
            .then((rs) => Promise.all(rs.map((r) => r.json())))
            .then(([matsData, dscsData, catsData, unitsData, prisData]) => {
                if (matsData?.errors?.length) {
                    if (matsData.errors[0].name === 'Session.NotFound') {
                        showToast('error', t ? t('messages.sessionExpired') : 'Session expired');
                        setTimeout(logout, 1500);
                    } else showToast('error', matsData.errors[0].name);
                    return;
                }

                const mats = matsData?.result?.items || [];
                const dscs = dscsData?.result?.items || [];
                const cats = catsData?.result?.items || [];
                const units = unitsData?.result?.items || [];
                const pris = prisData?.result?.items || [];

                setItems(mats);
                setBooks(mats.filter((i) => i.ElmIsBook));
                setCategories(cats);
                setUnities(units);
                setPrices(pris);

                // Refresh descriptor form
                descriptorRef.current?.refresh(JSON.stringify(dscs));

                // Select item — mirrors selectItem(array, id)
                if (mats.length) {
                    const target = routerKey ? mats.find((i) => String(i.ElmUID) === String(routerKey)) : null;
                    handleSelect(target || mats[mats.length - 1], cats, units, pris);
                }
            })
            .catch((err) => {
                console.error(err);
                showToast('error', 'Failed to load data');
            })
            .finally(() => setLoading(false));
    }, []);

    // ── Select item (mirrors parseItem) ───────────────────────
    const handleSelect = (item, cats, units, pris) => {
        if (!item) return;
        console.log(item);
        setIsDisabled(true);
        setMethod('update');
        setSelectedKey(item.ElmUID);
        setNameValue(item.ElmName ?? '');
        setCodeValue(item.ElmCode ?? '');
        setIsBookValue(!!item.ElmIsBook);
        setBookValue(item.ElmParent ?? null);
        setCostWayValue(item.MatCostWay ?? 0);
        setIsSerialValue(!!item.MatIsSerial);
        setIsQuantityPricesValue(!!item.MatIsQntPrices);
        descriptorRef.current?.setValues(item.DscDataInfo ?? null);
        refreshTables(item, cats, units, pris);
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
        setCostWayValue(0);
        setIsSerialValue(false);
        setIsQuantityPricesValue(false);
        descriptorRef.current?.setValues(null);
        barcodesRef.current?.refresh([]);
        unitsRef.current?.refresh([]);
        pricesRef.current?.refresh([]);
    };

    // ── Cancel (mirrors handleCancel) ─────────────────────────
    const handleCancel = () => {
        const target = selectedKey
            ? items.find((i) => i.ElmUID === selectedKey)
            : previousKey
              ? items.find((i) => i.ElmUID === previousKey)
              : items[items.length - 1];
        if (target) handleSelect(target);
    };

    // ── Validate (mirrors checkValidationGroup) ───────────────
    const validate = () => {
        if (!formRef.current?.reportValidity()) return false;
        if (!descriptorRef.current?.validate()) return false;
        return true;
    };

    // ── Apply (mirrors applyExecute) ──────────────────────────
    const handleApply = () => {
        if (!validate()) return;

        const url = buildEndpointURL('main');
        const body = {
            command: 'Main',
            uid: '',
            params: {
                action: 'RunSeed',
                method,
                name: 'materials',
                fields: {
                    ElmName: nameValue,
                    ElmCode: codeValue,
                    ElmIsBook: isBookValue,
                    ElmParent: bookValue,
                    MatCostWay: costWayValue,
                    MatIsSerial: isSerialValue,
                    MatIsQntPrices: isQuantityPricesValue,
                    DscData: descriptorRef.current?.getValues() ?? [],
                    MatBarcodes: barcodesRef.current?.getValues?.() ?? [],
                    MatUnits: unitsRef.current?.getValues?.() ?? [],
                    MatPrices: pricesRef.current?.getValues?.() ?? [],
                    ...(selectedKey ? { ElmUID: selectedKey } : {}),
                },
            },
        };
        // console.log(barcodesRef.current?.getValues());
        // console.log(unitsRef.current);
        // console.log(pricesRef.current);
        // return;
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
                    setItems((prev) => prev.map((i) => (i.ElmUID === selectedKey ? saved : i)));
                } else {
                    setItems((prev) => [...prev, saved]);
                    handleSelect(saved);
                }
                showToast('info', t ? t('messages.operationDone') : 'Done');
                setIsDisabled(true);
            })
            .catch(() => showToast('error', 'Save failed'));
    };

    // ── Tab switch — refresh tables on tab change ─────────────
    // mirrors currView.subscribe(() => refreshTables())
    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setTimeout(() => {
            const currentItem = items.find((i) => i.ElmUID === selectedKey);

            if (currentItem) {
                refreshTables(currentItem);
            }
        }, 10);
    };

    useEffect(() => {
        if (preview) {
            setTimeout(() => {
                // refreshTables();

                setTimeout(() => {
                    printCard('mat-card', t ? t('router.materials') : 'Materials');
                    setPreview(false);
                }, 50);
            }, 10);
        }
    }, [preview]);

    return (
        <div className="page-layout">
            {/* Toast */}
            {toast && <div className={`page-toast page-toast-${toast.type}`}>{toast.message}</div>}

            {/* Left panel */}
            <ListPanel
                items={items}
                loading={loading}
                guid="materials"
                keyField="ElmUID"
                labelField="ElmName"
                secondaryField="ElmCode"
                selectedKey={selectedKey}
                onSelect={(item) => handleSelect(item)}
                onNew={() => handleNew(false)}
                onNewFolder={() => handleNew(true)}
                onDelete={() => showToast('info', 'Delete not implemented')}
                onPrint={() => setPreview(true)}
                // onPrint={() => printCard('mat-card', t ? t('router.materials') : 'Materials')}
                t={t}
                isMobile={isMobile}
                isRTL={isRTL}
                onShowListChange={
                    (isVisible) => setListVisible(isVisible) // <-- update page state
                }
            />

            {/* Right panel */}
            {isMobile && listVisible ? null : (
                <div id="mat-card" className="page-form-panel">
                    <form ref={formRef} noValidate onSubmit={(e) => e.preventDefault()}>
                        <div className="page-form-grid">
                            {/* Left column */}
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

                                <div className="form-field">
                                    <label className="form-label">{t ? t('inputs.book') : 'Book'}</label>
                                    <div className="form-select-wrap">
                                        <Select
                                            styles={selectStyles(isRTL)}
                                            isClearable
                                            options={toOption(books, 'ElmUID', 'ElmName')}
                                            value={findOption(books, 'ElmUID', 'ElmName', bookValue)}
                                            onChange={(opt) => {
                                                setBookValue(opt?.value ?? null);
                                                setIsDisabled(false);
                                            }}
                                            placeholder={t ? t('inputs.book') : 'Book'}
                                            className="react-select-container"
                                            classNamePrefix="react-select"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right column — material options (mirrors materialOptionsLabel panel) */}
                            <div className="page-form-col">
                                <div
                                    className="form-constraints-title"
                                    style={
                                        isMobile
                                            ? undefined
                                            : {
                                                  marginTop: '-20px',
                                              }
                                    }
                                >
                                    <strong>{t ? t('labels.materials.options') : 'Material Options'}</strong>
                                </div>

                                <div className="form-constraints-panel">
                                    {/* Cost way radioset (mirrors oj-radioset costWaysDP) */}
                                    <div className="form-field">
                                        <label className="form-label">
                                            {t ? t('labels.materials.costWay.label') : 'Cost Way'}
                                        </label>
                                        <div className="accounts-radio-group">
                                            {costWayOptions.map((opt) => (
                                                <label key={opt.value} className="accounts-radio">
                                                    <input
                                                        type="radio"
                                                        name="costWay"
                                                        value={opt.value}
                                                        checked={costWayValue === opt.value}
                                                        onChange={() => {
                                                            setCostWayValue(opt.value);
                                                            setIsDisabled(false);
                                                        }}
                                                    />
                                                    <span>{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Switches (mirrors oj-switch) */}
                                    <div className="accounts-switches-row">
                                        <Switch
                                            checked={isSerialValue}
                                            onChange={(v) => {
                                                setIsSerialValue(v);
                                                setIsDisabled(false);
                                            }}
                                            label={t ? t('labels.materials.isSerial') : 'Serial'}
                                        />
                                        <Switch
                                            checked={isQuantityPricesValue}
                                            onChange={(v) => {
                                                setIsQuantityPricesValue(v);
                                                setIsDisabled(false);
                                            }}
                                            label={t ? t('labels.materials.isQuantityPrices') : 'Qty Prices'}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* ── Tab bar (mirrors oj-tab-bar) ────────────── */}
                    <div id="Not-Printable" className="mat-tab-bar">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                className={`mat-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                                onClick={() => handleTabChange(tab.id)}
                            >
                                <i className={tab.icon} />
                                {!isMobile && <span>{t ? t(`router.${tab.id}`) : tab.id}</span>}
                            </button>
                        ))}
                    </div>

                    {/* ── Tab panels (mirrors oj-bind-if currView) ── */}
                    <div className="mat-tab-content">
                        <div
                            style={{
                                display: activeTab === 'barcodes' || preview ? 'block' : 'none',
                            }}
                        >
                            <BarcodesTable
                                ref={barcodesRef}
                                categories={categories}
                                unities={unities}
                                rows={[]}
                                onChange={() => setIsDisabled(false)}
                                t={t}
                                isRTL={isRTL}
                                isMobile={isMobile}
                            />
                        </div>

                        <div
                            style={{
                                display: activeTab === 'unities' || preview ? 'block' : 'none',
                            }}
                        >
                            <UnitsTable
                                ref={unitsRef}
                                unities={unities}
                                rows={[]}
                                onChange={() => setIsDisabled(false)}
                                t={t}
                                isRTL={isRTL}
                                isMobile={isMobile}
                            />
                        </div>

                        <div
                            style={{
                                display: activeTab === 'prices' || preview ? 'block' : 'none',
                            }}
                        >
                            <PricesTable
                                ref={pricesRef}
                                unities={unities}
                                prices={prices}
                                rows={[]}
                                onChange={() => setIsDisabled(false)}
                                t={t}
                                isRTL={isRTL}
                                isMobile={isMobile}
                            />
                        </div>
                    </div>

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
