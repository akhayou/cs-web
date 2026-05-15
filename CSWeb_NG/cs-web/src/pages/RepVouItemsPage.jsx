import { useState, useEffect, useRef, useMemo } from 'react';
import Select from 'react-select';
import ColumnManager from '../components/ColumnManager.jsx';
import { buildEndpointURL } from '../services/config.js';
import { useToast } from '../utils/core.jsx';
import { printCard } from '../utils/printCard.js';
import { selectStyles } from '../utils/Styles.js';

/**
 * RepVouItemsPage
 *
 * OJet → React mapping:
 *   receivedParams / params.account          → routerKey prop (pre-selected account)
 *   connected() ReadRegistry repVouItems     → load saved column config from sessionStorage
 *   disconnected() WriteRegistry             → save column config to sessionStorage on unmount
 *   _initAllObservables columns array        → useState(INITIAL_COLUMNS)
 *   visibleColumns ko.computed               → useMemo filter on columns
 *   vouItemsData ko.observableArray          → useState(rows)
 *   accDataProvider                          → useState(accounts)
 *   okExecute() fetch repVouItems            → handleSearch()
 *   getFieldValue(key, row)                  → renderCell()
 *   tableStyle(index) dark/light             → CSS odd/even classes
 *   moreLessExecute (expand card)            → expandedKeys state
 *   tablePropertiesVisible                   → showManager state
 *   column-manager on-columns-changed        → setColumns
 *   oj-list-view (mobile)                    → mobile card view
 *   oj-table (desktop)                       → desktop table
 *   oj-bind-if !paramsAccount && data empty  → account picker form
 *   getCurrencyInfo / getAccountInfo         → inline helpers
 *   total = running ItmDebit - ItmCredit     → computed in handleSearch
 *   smReportID / reportID for print          → refs on wrapper divs
 */

// ── Initial column definitions (mirrors this.columns) ─────────
const INITIAL_COLUMNS = [
    { field: 'ItmDebit', name: 'debit', visible: true },
    { field: 'ItmCredit', name: 'credit', visible: true },
    { field: 'ItmCurDebit', name: 'curDebit', visible: true },
    { field: 'ItmCurCredit', name: 'curCredit', visible: true },
    { field: 'total', name: 'total', visible: true },
    { field: 'ItmNote', name: 'note', visible: true, smOnly: true },
    { field: 'ItmDoc', name: 'document', visible: true, smOnly: true },
    { field: 'ItmMaster', name: 'serial', visible: true },
    { field: 'ItmMunimentInfo', name: 'muniment', visible: true },
    { field: 'ItmDate', name: 'date', visible: true },
    { field: 'ItmAccDealerInfo', name: 'dealer', visible: false, smOnly: true },
    { field: 'ItmBranchInfo', name: 'branch', visible: false, smOnly: true },
    { field: 'ItmSubAccountInfo', name: 'subAccount', visible: false, smOnly: true },
    { field: 'ItmCurInfo', name: 'currency', visible: false },
    { field: 'CurEqu', name: 'equal', visible: false },
];

// ── Storage key for saved column config ───────────────────────
const STORAGE_KEY = 'repVouItems_columns';

// ── Field value renderer (mirrors getFieldValue) ──────────────
const getAccountInfo = (info) => {
    if (!info) return '';
    return info.ElmdCode ? `${info.ElmdCode} ${info.ElmdName}` : (info.ElmdName ?? '');
};
const getCurrencyInfo = (info) => {
    if (!info) return '';
    return info.CurCode ? `(${info.CurCode})  ${info.CurName}` : (info.CurName ?? '');
};
const formatNum = (val) => (typeof val === 'number' && !isNaN(val) ? val.toLocaleString() : (val ?? ''));

const renderCell = (field, row) => {
    switch (field) {
        case 'ItmAccountInfo':
        case 'ItmAccDealerInfo':
        case 'ItmBranchInfo':
        case 'ItmSubAccountInfo':
            return getAccountInfo(row[field]);
        case 'ItmCurInfo':
            return getCurrencyInfo(row[field]);
        case 'ItmMunimentInfo':
            return row[field]?.MunName ?? '';
        default:
            return formatNum(row[field]);
    }
};

// ── Icons ─────────────────────────────────────────────────────
const ChevronIcon = ({ open }) => (
    <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
    >
        <polyline points="9 18 15 12 9 6" />
    </svg>
);
const DotsIcon = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
    >
        <circle cx="12" cy="5" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
);
const CheckIcon = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
    >
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const PrintIcon = () => (
    <svg
        width="14"
        height="14"
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
);

// ── Mobile card ───────────────────────────────────────────────
function MobileCard({ row, columns, expanded, onToggle, t, columnLabel }) {
    const extraCols = columns.filter((c) => c.visible && c.smOnly);

    return (
        <div className="grid-card">
            {/* Header: date badge + serial badge */}
            <div className="grid-card-header">
                <span className="grid-badge">{row.ItmDate}</span>
                <span className="rep-muniment-name">{row.ItmMunimentInfo?.MunName}</span>
                <span className="grid-badge">{row.ItmMaster}</span>
            </div>

            {/* Debit / Credit / Currency row */}
            <div className="grid-card-amounts rep-three-col">
                <div className="grid-card-col">
                    <div className="grid-card-col-label">{t ? t('labels.debit') : 'Debit'}</div>
                    <div className="grid-card-col-value">{row.ItmCurDebit > 0 ? formatNum(row.ItmCurDebit) : ''}</div>
                </div>
                <div className="grid-card-col">
                    <div className="grid-card-col-label">{t ? t('labels.credit') : 'Credit'}</div>
                    <div className="grid-card-col-value">{row.ItmCurCredit > 0 ? formatNum(row.ItmCurCredit) : ''}</div>
                </div>
                <div className="grid-card-col">
                    <div className="grid-card-col-label">{t ? t('labels.currency') : 'Currency'}</div>
                    <div className="grid-card-col-value rep-currency-equ">
                        <span>{getCurrencyInfo(row.ItmCurInfo)}</span>
                        {row.ItmEqu != null && (
                            <>
                                <span className="rep-equal"> = </span>
                                <span>{formatNum(row.ItmEqu)}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Base currency row */}
            <div className="grid-card-amounts">
                <div className="grid-card-col">
                    <div className="grid-card-col-value">{row.ItmDebit > 0 ? formatNum(row.ItmDebit) : ''}</div>
                </div>
                <div className="grid-card-col">
                    <div className="grid-card-col-value">{row.ItmCredit > 0 ? formatNum(row.ItmCredit) : ''}</div>
                </div>
            </div>

            {/* Expanded extra fields (smOnly) */}
            {expanded &&
                extraCols.map((col) => (
                    <div key={col.field} className="grid-card-extra-row">
                        <span className="grid-card-extra-label">
                            {columnLabel ? columnLabel(col.name) : col.headerText} :
                        </span>
                        <span>{renderCell(col.field, row)}</span>
                    </div>
                ))}

            {/* Footer: expand toggle + running total */}
            <div className="grid-card-footer">
                <button className="grid-card-expand-btn" onClick={onToggle}>
                    <ChevronIcon open={expanded} />
                </button>
                <div className="rep-total">
                    <span className="rep-total-label">{t ? t('labels.total') : 'Total'} :</span>
                    <span className="rep-total-value">{formatNum(row.total)}</span>
                </div>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────
export default function RepVouItemsPage({ t, isMobile, isRTL = false, logout, routerKey = null }) {
    const { toast, showToast } = useToast();

    // ── Column config — load from sessionStorage, fall back to defaults ──
    const [columns, setColumns] = useState(() => {
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Re-merge with defaults to pick up any new columns added later
                return INITIAL_COLUMNS.map((def) => {
                    const saved = parsed.find((c) => c.field === def.field);
                    return saved ? { ...def, ...saved } : def;
                });
            }
        } catch {
            /* ignore */
        }
        return INITIAL_COLUMNS;
    });

    // Save column config on unmount (mirrors disconnected() WriteRegistry)
    useEffect(() => {
        return () => {
            const toSave = columns.map(({ field, name, visible, smOnly }) => ({
                field,
                name,
                visible,
                ...(smOnly ? { smOnly } : {}),
            }));
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        };
    }, [columns]);

    // ── Data state ────────────────────────────────────────────
    const [accounts, setAccounts] = useState([]);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [accValue, setAccValue] = useState(routerKey ?? null);
    const [accLabel, setAccLabel] = useState('');
    const [searched, setSearched] = useState(!!routerKey);

    // ── UI state ──────────────────────────────────────────────
    const [showManager, setShowManager] = useState(false);
    const [expandedKeys, setExpandedKeys] = useState(new Set());

    const reportRef = useRef(null);
    const smReportRef = useRef(null);
    const formRef = useRef(null);

    // ── Visible columns (mirrors visibleColumns ko.computed) ──
    const visibleCols = useMemo(() => columns.filter((c) => c.visible !== false), [columns]);

    // ── Column label (mirrors columnLabel) ────────────────────
    const columnLabel = (name) => (t ? t(`labels.${name}`) : name);

    // ── Load accounts on mount ────────────────────────────────
    useEffect(() => {
        const url = buildEndpointURL('main');
        const body = {
            command: 'Main',
            uid: '',
            params: {
                action: 'RunSeed',
                method: 'select',
                name: 'Accounts',
                query: { skip: 0, ElmName: '', ElmIsBook: false },
                lookup: 'ElmUID',
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
                setAccounts(data.result.items ?? []);
            })
            .catch(console.error);

        // Auto-search if routerKey was passed
        if (routerKey) handleSearch(routerKey);
    }, []);

    // ── Search (mirrors okExecute) ────────────────────────────
    const handleSearch = async (overrideAcc) => {
        const acc = overrideAcc ?? accValue;
        if (!acc) return;
        if (!overrideAcc && !formRef.current?.reportValidity()) return;

        setLoading(true);
        setSearched(true);
        setExpandedKeys(new Set());

        const url = buildEndpointURL('main');
        const body = {
            command: 'Accounts',
            uid: '',
            params: {
                action: 'RunSeed',
                method: 'select',
                name: 'repVouItems',
                query: { Account: acc, ItmAccount: acc },
            },
        };

        try {
            const res = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (data.errors) {
                showToast('error', data.errors[0].name);
                if (data.errors[0].name === 'Session.NotFound') setTimeout(logout, 1500);
                return;
            }

            const items = data.result.items ?? [];

            // Compute running total (mirrors element.total = total)
            let running = 0;
            const enriched = items.map((item, idx) => {
                running += (item.ItmDebit ?? 0) - (item.ItmCredit ?? 0);
                return {
                    ...item,
                    id: idx,
                    total: running,
                    CurEqu: item.ItmCurInfo?.CurEqu ?? null,
                };
            });

            setRows(enriched);

            // Set account label (mirrors accCodeNameValue)
            if (enriched.length) {
                const info = enriched[0].ItmAccountInfo;
                setAccLabel(info ? `${info.ElmdCode} - ${info.ElmdName}` : '');
            }
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to load');
        } finally {
            setLoading(false);
        }
    };

    // ── Expand/collapse card (mirrors moreLessExecute) ────────
    const toggleExpand = (id) => {
        setExpandedKeys((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // ── Print ─────────────────────────────────────────────────
    const handlePrint = () => {
        const id = isMobile ? 'rep-vou-sm' : 'rep-vou-desktop';
        printCard(id, t ? t('router.repVouItems') : 'Voucher Items');
    };

    // ── Account select options ────────────────────────────────
    const accOptions = accounts.map((a) => ({
        value: a.ElmUID,
        label: a.ElmCode ? `${a.ElmCode} - ${a.ElmName}` : a.ElmName,
    }));
    const selectedAccOpt = accOptions.find((o) => o.value === accValue) ?? null;

    const hasData = rows.length > 0;

    return (
        <div className="rep-wrapper">
            {toast && <div className={`page-toast page-toast-${toast.type}`}>{toast.message}</div>}

            {/* ── Tools menu ──────────────────────────────── */}
            {hasData && (
                <div className="rep-toolbar">
                    {showManager ? (
                        <button className="grid-manager-btn active" onClick={() => setShowManager(false)}>
                            <CheckIcon />
                            <span>{t ? t('commands.ok') : 'Ok'}</span>
                        </button>
                    ) : (
                        <div className="rep-tools-row">
                            {!isMobile && (
                                <button className="grid-manager-btn" onClick={() => setShowManager(true)}>
                                    <DotsIcon />
                                    <span>{t ? t('labels.tableProperties') : 'Columns'}</span>
                                </button>
                            )}
                            <button className="grid-manager-btn" onClick={handlePrint}>
                                <PrintIcon />
                                <span>{t ? t('commands.print') : 'Print'}</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Column manager ───────────────────────────── */}
            {showManager && <ColumnManager columns={columns} onChange={setColumns} t={t} />}

            {/* ── Account picker (shown when no data yet) ─── */}
            {!hasData && !loading && !searched && (
                <div className="rep-account-picker">
                    <div className="rep-picker-panel">
                        <div className="rep-picker-label">
                            <strong>{t ? t('labels.selectAccount') : 'Select Account'}</strong>
                        </div>
                        <form ref={formRef} noValidate onSubmit={(e) => e.preventDefault()}>
                            <div className="form-field">
                                <label className="form-label">{t ? t('inputs.accCodeName') : 'Account'} *</label>
                                <div className="form-select-wrap">
                                    <Select
                                        styles={selectStyles(isRTL)}
                                        options={accOptions}
                                        value={selectedAccOpt}
                                        onChange={(opt) => setAccValue(opt?.value ?? null)}
                                        placeholder={t ? t('inputs.accCodeName') : 'Account'}
                                        required
                                        className="react-select-container"
                                        classNamePrefix="react-select"
                                    />
                                </div>
                            </div>
                        </form>
                        <div className="rep-picker-actions">
                            <button className="page-btn-apply" onClick={() => handleSearch()} disabled={!accValue}>
                                <CheckIcon />
                                {t ? t('commands.ok') : 'OK'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Loading spinner ──────────────────────────── */}
            {loading && (
                <div className="rep-loading">
                    <div className="list-panel-spinner" />
                </div>
            )}

            {/* ── Account label header ─────────────────────── */}
            {hasData && !loading && !showManager && (
                <div className="rep-account-header">
                    <span className="grid-badge">
                        {t ? t('inputs.accCodeName') : 'Account'}: {accLabel}
                    </span>
                    {/* Allow searching again */}
                    <button
                        className="grid-manager-btn rep-change-acc"
                        onClick={() => {
                            setRows([]);
                            setSearched(false);
                            setAccValue(null);
                        }}
                    >
                        {t ? t('commands.change') : 'Change'}
                    </button>
                </div>
            )}

            {/* ── Mobile card list (mirrors oj-list-view smScreen) ── */}
            {hasData && !loading && !showManager && isMobile && (
                <div id="rep-vou-sm" ref={smReportRef} className="grid-cards">
                    {rows.map((row) => (
                        <MobileCard
                            key={row.id}
                            row={row}
                            columns={columns}
                            expanded={expandedKeys.has(row.id)}
                            onToggle={() => toggleExpand(row.id)}
                            t={t}
                            columnLabel={columnLabel}
                        />
                    ))}
                </div>
            )}

            {/* ── Desktop table (mirrors oj-table !smScreen) ── */}
            {hasData && !loading && !showManager && !isMobile && (
                <div id="rep-vou-desktop" ref={reportRef} className="grid-table-scroll">
                    <table className="grid-table">
                        <thead>
                            <tr>
                                {visibleCols.map((col) => (
                                    <th key={col.field} className="grid-th">
                                        {columnLabel(col.name)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => (
                                <tr key={row.id} className={`grid-row${idx % 2 === 1 ? ' odd' : ''}`}>
                                    {visibleCols.map((col) => (
                                        <td key={col.field} className="grid-td">
                                            {renderCell(col.field, row)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
