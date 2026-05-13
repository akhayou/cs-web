import { useState, useEffect, useRef } from 'react';
import ListPanel from '../components/ListPanel.jsx';
import Select from 'react-select';
import { buildEndpointURL } from '../services/config.js';
import { useToast } from '../utils/core.jsx';
import { printCard } from '../utils/printCard.js';
import { selectStyles } from '../utils/Styles.js';
import { BiFontSize } from 'react-icons/bi';

/**
 * PaymentsPage
 *
 * Generic page for CreditPayment and DebitPayment.
 * Driven by nodeId prop (e.g. 'CreditPayment' or 'DebitPayment').
 *
 * OJet → React mapping:
 *   constructor receivedParams / params        → nodeId + munimentId props
 *   Keys = _getKeyFromQuery(['guid','name','key']) → routerKey prop
 *   connected() Promise.all                   → useEffect on mount
 *   params().name.includes('debit')           → isDebit computed from nodeId
 *   receivePayLabel                           → computed from isDebit
 *   preview ko.observable                     → showPreview state
 *   preview.subscribe → _print               → useEffect on showPreview
 *   applyExecute (preview mode)               → print the receipt card
 *   applyExecute (form mode)                  → save payment
 *   parseItem                                 → handleSelect()
 *   newItemExecute                            → handleNew()
 *   deleteExecute                             → handleDelete()
 *   dateUtils._isoDateToString(today)         → today ISO string
 *   dateUtils._hijriDate(date)                → Intl hijri formatter
 *   currItem().PayHijriDate                   → computed on select
 *   oj-bind-if preview()                      → conditional receipt card
 *   list item label: PayAccountInfo.ElmdName + PayValue + PayCurInfo.ElmdName
 *   sessionStorage 'user'                     → userLogin
 *   sessionStorage 'muniments'                → find muniment by MunGuid=nodeId
 *
 * Props:
 *   nodeId     {string}   'CreditPayment' | 'DebitPayment' (= MunGuid)
 *   t          {function} Translation function
 *   isMobile   {boolean}
 *   isRTL      {boolean}
 *   logout     {function}
 *   routerKey  {string}   Optional PayUID to pre-select
 */

// ── Today as ISO date string (mirrors dateUtils._isoDateToString) ──
const todayISO = () => new Date().toISOString().slice(0, 10);

// ── Hijri date (mirrors dateUtils._hijriDate) ─────────────────
const toHijri = (isoDate) => {
    if (!isoDate) return '';
    try {
        return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(new Date(isoDate));
    } catch {
        return '';
    }
};

// ── List item label (mirrors PayAccountInfo.ElmdName + value + currency) ──

export default function PaymentsPage({ nodeId, t, isMobile, isRTL = false, logout, routerKey = null }) {
    // ── Resolve muniment from sessionStorage ──────────────────
    // mirrors: muniments.find(m => m.MunGuid === key) → id = item.MunUID
    const munimentId = (() => {
        try {
            const muniments = JSON.parse(localStorage.getItem('muniments') || '[]');
            return muniments.find((m) => m.MunGuid === nodeId)?.MunUID ?? nodeId;
        } catch {
            return nodeId;
        }
    })();

    const isDebit = nodeId?.toLowerCase().includes('debit');
    const userLogin = sessionStorage.getItem('user') ?? '';

    // ── Data ──────────────────────────────────────────────────
    const [items, setItems] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [branches, setBranches] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast, showToast } = useToast();

    // ── Selection ─────────────────────────────────────────────
    const [selectedKey, setSelectedKey] = useState(routerKey);
    const [previousKey, setPreviousKey] = useState(null);
    const [method, setMethod] = useState('insert');
    const [currItem, setCurrItem] = useState(null); // full selected item
    const [showPreview, setShowPreview] = useState(false);
    const [listVisible, setListVisible] = useState(false);

    // ── Form fields ───────────────────────────────────────────
    const [dateValue, setDateValue] = useState(todayISO());
    const [docValue, setDocValue] = useState('');
    const [paymentValue, setPaymentValue] = useState('');
    const [accValue, setAccValue] = useState(null);
    const [currencyValue, setCurrencyValue] = useState(null);
    const [branchValue, setBranchValue] = useState(null);
    const [noteValue, setNoteValue] = useState('');

    const formRef = useRef(null);

    // ── Load data ─────────────────────────────────────────────
    useEffect(() => {
        const url = buildEndpointURL('main');
        const opts = (body) => ({
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const paymentsBody = {
            command: 'Accounts',
            uid: '',
            params: {
                action: 'RunSeed',
                method: 'select',
                name: munimentId,
                ...(routerKey ? { query: { PayUID: routerKey } } : {}),
            },
        };

        Promise.all([
            fetch(url, opts(paymentsBody)),
            fetch(
                url,
                opts({
                    command: 'Stocks',
                    uid: '',
                    params: { action: 'RunSeed', method: 'select', name: 'Accounts', lookup: '!ElmIsBook' },
                }),
            ),
            fetch(
                url,
                opts({ command: 'Main', uid: '', params: { action: 'RunSeed', method: 'select', name: 'Branches' } }),
            ),
            fetch(
                url,
                opts({ command: 'Main', uid: '', params: { action: 'RunSeed', method: 'select', name: 'Currencies' } }),
            ),
        ])
            .then((rs) => Promise.all(rs.map((r) => r.json())))
            .then(([paysData, accsData, brsData, cursData]) => {
                if (paysData?.errors?.length) {
                    if (paysData.errors[0].name === 'Session.NotFound') {
                        showToast('error', t ? t('messages.sessionExpired') : 'Session expired');
                        setTimeout(logout, 1500);
                    } else showToast('error', paysData.errors[0].name);
                    return;
                }
                const pays = paysData?.result?.items ?? [];
                setItems(pays);
                setAccounts(accsData?.result?.items ?? []);
                setBranches(brsData?.result?.items ?? []);
                setCurrencies(cursData?.result?.items ?? []);

                if (pays.length) {
                    const target = routerKey ? pays.find((p) => String(p.PayUID) === String(routerKey)) : null;
                    handleSelect(target ?? pays[pays.length - 1]);
                }
            })
            .catch(() => showToast('error', 'Failed to load'))
            .finally(() => setLoading(false));
    }, [nodeId]);

    // ── Print when preview activates (mirrors preview.subscribe) ──
    useEffect(() => {
        if (!showPreview || !currItem) return;
        setTimeout(() => {
            printCard('pay-receipt', currItem?.PayMunimentInfo?.MunName ?? '');
            setShowPreview(false);
        }, 50);
    }, [showPreview]);

    const renderListLabel = (item) => {
        return (
            // <div className="list-panel-item-text">
            <>
                {/* Account Code */}
                {item.PayAccountInfo?.ElmdCode != null && (
                    <span className="list-panel-item-label">
                        {item.PayAccountInfo.ElmdCode || ''} {item.PayAccountInfo?.ElmdName || ''}
                    </span>
                )}

                {/* Account Name + Value + Currency */}
                <span className="list-panel-item-secondary">
                    {item.PayValue} {item.PayCurInfo?.ElmdName || ''}
                </span>
            </>
            // </div>
        );
    };

    // ── Select item (mirrors parseItem) ───────────────────────
    const handleSelect = (item) => {
        if (!item) return;
        setMethod('update');
        setSelectedKey(item.PayUID);
        setCurrItem({ ...item, PayHijriDate: toHijri(item.PayDate) });
        setDateValue(item.PayDate ?? todayISO());
        setDocValue(item.PayDoc ?? '');
        setPaymentValue(item.PayValue ?? '');
        setAccValue(item.PayAccount ?? null);
        setCurrencyValue(item.PayCur ?? null);
        setBranchValue(item.PayBranch ?? null);
        setNoteValue(item.PayNote ?? '');
    };

    // ── New (mirrors newItemExecute) ──────────────────────────
    const handleNew = () => {
        setPreviousKey(selectedKey);
        setMethod('insert');
        setSelectedKey(null);
        setCurrItem(null);
        setShowPreview(false);
        setDateValue(todayISO());
        setDocValue('');
        setPaymentValue('');
        setAccValue(null);
        setCurrencyValue(null);
        setBranchValue(null);
        setNoteValue('');
    };

    // ── Delete (mirrors deleteExecute) ────────────────────────
    const handleDelete = () => {
        if (!selectedKey) return;
        const url = buildEndpointURL('main');
        const body = {
            command: 'Accounts',
            uid: '',
            params: { action: 'RunSeed', method: 'delete', name: munimentId, fields: { PayUID: selectedKey } },
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
                const newItems = items.filter((i) => i.PayUID !== selectedKey);
                setItems(newItems);
                if (newItems.length) handleSelect(newItems[newItems.length - 1]);
                else handleNew();
                showToast('info', t ? t('messages.operationDone') : 'Done');
            })
            .catch(() => showToast('error', 'Delete failed'));
    };

    // ── Apply / Print (mirrors applyExecute) ──────────────────
    const handleApply = () => {
        if (showPreview) {
            printPanel('pay-receipt', currItem?.PayMunimentInfo?.MunName ?? '');
            setShowPreview(false);
            return;
        }

        if (!formRef.current?.reportValidity()) return;

        const url = buildEndpointURL('main');
        const body = {
            command: 'Accounts',
            uid: '',
            params: {
                action: 'RunSeed',
                method,
                name: munimentId,
                fields: {
                    PayValue: paymentValue,
                    PayAccount: accValue,
                    PayMuniment: munimentId,
                    ...(selectedKey ? { PayUID: selectedKey } : {}),
                    ...(dateValue ? { PayDate: dateValue } : {}),
                    ...(noteValue ? { PayNote: noteValue } : {}),
                    ...(docValue ? { PayDoc: docValue } : {}),
                    ...(currencyValue ? { PayCur: currencyValue } : {}),
                    ...(branchValue ? { PayBranch: branchValue } : {}),
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
                    setItems((prev) => prev.map((i) => (i.PayUID === selectedKey ? saved : i)));
                } else {
                    setItems((prev) => [...prev, saved]);
                }
                handleSelect(saved);
                showToast('info', t ? t('messages.operationDone') : 'Done');
                // Show receipt after save
                setShowPreview(true);
            })
            .catch(() => showToast('error', 'Save failed'));
    };

    // ── Select helpers ────────────────────────────────────────
    const toOpts = (arr, kF = 'ElmUID', lF = 'ElmName') => arr.map((i) => ({ value: i[kF], label: i[lF] }));
    const findOpt = (arr, kF, lF, val) => toOpts(arr, kF, lF).find((o) => o.value === val) ?? null;

    const receivePayLabel = isDebit
        ? t
            ? t('labels.payTo')
            : 'Pay To'
        : t
          ? t('labels.receivedFrom')
          : 'Received From';

    return (
        <div className="page-layout">
            {toast && <div className={`page-toast page-toast-${toast.type}`}>{toast.message}</div>}

            {/* Left panel — custom label from PayAccountInfo */}
            <ListPanel
                items={items}
                loading={loading}
                guid={isDebit ? 'DebitPayment' : 'CreditPayment'}
                keyField="PayUID"
                labelField="PayUID" // overridden by renderListLabel
                selectedKey={selectedKey}
                renderLabel={renderListLabel}
                onSelect={handleSelect}
                onNew={handleNew}
                onDelete={handleDelete}
                onPrint={() => {
                    if (currItem) setShowPreview(true);
                }}
                t={t}
                isMobile={isMobile}
                onShowListChange={
                    (isVisible) => setListVisible(isVisible) // <-- update page state
                }
            />

            {/* Right panel */}
            {isMobile && listVisible ? null : (
                <div className="page-form-panel">
                    {/* ── Preview / Receipt card (mirrors oj-bind-if preview()) ── */}
                    {showPreview && currItem ? (
                        <div className="pay-receipt-wrapper">
                            <div id="pay-receipt" className="pay-receipt">
                                {/* Muniment name header */}
                                <div className="pay-receipt-title">{currItem.PayMunimentInfo?.MunName ?? ''}</div>

                                <div className="pay-receipt-row">
                                    <span className="pay-receipt-label">{t ? t('labels.document') : 'Doc'} :</span>
                                    <span>{currItem.PayDoc}</span>
                                </div>
                                <div className="pay-receipt-row">
                                    <span className="pay-receipt-label">
                                        {t ? t('labels.corresponding') : 'Date (AD)'} :
                                    </span>
                                    <span>
                                        {currItem.PayDate} {t ? t('labels.AD') : 'AD'}
                                    </span>
                                </div>
                                <div className="pay-receipt-row">
                                    <span className="pay-receipt-label">{t ? t('inputs.date') : 'Date (Hijri)'} :</span>
                                    <span>{currItem.PayHijriDate}</span>
                                </div>

                                <div className="pay-receipt-section-label">{receivePayLabel}</div>
                                <div className="pay-receipt-account">{currItem.PayAccountInfo?.ElmdName}</div>

                                <div className="pay-receipt-amount-box">
                                    <div className="pay-receipt-amount-label">{t ? t('labels.amount') : 'Amount'}</div>
                                    <div className="pay-receipt-amount">{currItem.PayValue}</div>
                                </div>

                                <div className="pay-receipt-row">
                                    <span className="pay-receipt-label">
                                        {t ? t('labels.receiptCoordinator') : 'Coordinator'}
                                    </span>
                                    <span>{userLogin}</span>
                                </div>
                                <div className="pay-receipt-footer">
                                    {t ? t('messages.noSignNeed') : 'No signature required'}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ── Form (mirrors oj-bind-if !preview()) ── */
                        <form ref={formRef} noValidate onSubmit={(e) => e.preventDefault()}>
                            <div className="page-form-grid">
                                {/* Left column */}
                                <div className="page-form-col">
                                    <div className="form-field">
                                        <label className="form-label">{t ? t('inputs.date') : 'Date'}</label>
                                        <input
                                            className="form-input"
                                            type="date"
                                            value={dateValue}
                                            onChange={(e) => setDateValue(e.target.value)}
                                        />
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">
                                            {t ? t('labels.muniments.Account') : 'Account'} *
                                        </label>
                                        <Select
                                            styles={selectStyles(isRTL)}
                                            isClearable
                                            required
                                            options={toOpts(accounts)}
                                            value={findOpt(accounts, 'ElmUID', 'ElmName', accValue)}
                                            onChange={(opt) => setAccValue(opt?.value ?? null)}
                                            placeholder={t ? t('labels.muniments.Account') : 'Account'}
                                            menuPortalTarget={document.body}
                                        />
                                    </div>

                                    <div className="pay-inline-row">
                                        <div className="form-field" style={{ flex: 1 }}>
                                            <label className="form-label">{t ? t('inputs.value') : 'Value'} *</label>
                                            <input
                                                className="form-input"
                                                type="number"
                                                min={0}
                                                required
                                                value={paymentValue}
                                                onChange={(e) => setPaymentValue(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-field" style={{ flex: 1 }}>
                                            <label className="form-label">
                                                {t ? t('labels.document') : 'Document'}
                                            </label>
                                            <input
                                                className="form-input"
                                                type="text"
                                                value={docValue}
                                                onChange={(e) => setDocValue(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right column */}
                                <div className="page-form-col">
                                    <div className="form-constraints-panel">
                                        <div className="form-field">
                                            <label className="form-label">
                                                {t ? t('labels.currency') : 'Currency'}
                                            </label>
                                            <Select
                                                styles={selectStyles(isRTL)}
                                                isClearable
                                                options={toOpts(currencies)}
                                                value={findOpt(currencies, 'ElmUID', 'ElmName', currencyValue)}
                                                onChange={(opt) => setCurrencyValue(opt?.value ?? null)}
                                                placeholder={t ? t('labels.currency') : 'Currency'}
                                                menuPortalTarget={document.body}
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label">{t ? t('labels.branch') : 'Branch'}</label>
                                            <Select
                                                styles={selectStyles(isRTL)}
                                                isClearable
                                                options={toOpts(branches)}
                                                value={findOpt(branches, 'ElmUID', 'ElmName', branchValue)}
                                                onChange={(opt) => setBranchValue(opt?.value ?? null)}
                                                placeholder={t ? t('labels.branch') : 'Branch'}
                                                menuPortalTarget={document.body}
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label">{t ? t('labels.note') : 'Note'}</label>
                                            <textarea
                                                className="form-input"
                                                style={{ resize: 'vertical', minHeight: 72 }}
                                                value={noteValue}
                                                onChange={(e) => setNoteValue(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* Action button — label changes between Apply and Print */}
                    <div className="page-form-actions">
                        <button className="page-btn-apply" onClick={handleApply}>
                            {showPreview ? (
                                <svg
                                    width="15"
                                    height="15"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                >
                                    <polyline points="6 9 6 2 18 2 18 9" />
                                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                    <rect x="6" y="14" width="12" height="8" />
                                </svg>
                            ) : (
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
                            )}
                            {showPreview ? (t ? t('commands.print') : 'Print') : t ? t('commands.apply') : 'Apply'}
                        </button>
                        {showPreview && (
                            <button className="page-btn-cancel" onClick={() => setShowPreview(false)}>
                                {t ? t('commands.cancel') : 'Cancel'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
