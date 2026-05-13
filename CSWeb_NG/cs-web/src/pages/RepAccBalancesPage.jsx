import { useState, useEffect, useMemo } from 'react';
import ColumnManager from '../Components/ColumnManager.jsx';
import { buildEndpointURL } from '../services/config';
import { useToast } from '../utils/core.jsx';
import { printCard } from '../utils/printCard.js';

/**
 * RepAccBalancesPage
 *
 * OJet → React mapping:
 *   connected() fetch repAccBalances        → useEffect on mount
 *   accountsData ko.observableArray         → useState(rows)
 *   loading ko.observable                   → useState(loading)
 *   columns ko.observableArray              → useState(COLUMNS)
 *   tablePropertiesVisible ko.observable    → useState(showManager)
 *   tablePropertiesExecute                  → toggle showManager
 *   column-manager on-columns-changed       → setColumns
 *   oj-list-view (mobile)                   → mobile card list
 *   oj-table (desktop)                      → desktop table
 *   getAccountInfo(info)                    → getAccountInfo()
 *   getCurrencyInfo(info)                   → getCurrencyInfo()
 *   getBalance(data)                        → balance = ItmCurDebit - ItmCurCredit
 *   tableStyle(index) dark/light            → grid-row odd CSS
 *   numberConverter.format                  → toLocaleString()
 *   menuItemAction print                    → printPanel()
 */

// ── Helpers ───────────────────────────────────────────────────
const fmt = (val) => (typeof val === 'number' && !isNaN(val) ? val.toLocaleString() : (val ?? ''));

const getAccountInfo = (info) => {
    if (!info) return '';
    return info.ElmdCode ? `${info.ElmdCode} ${info.ElmdName}` : (info.ElmdName ?? '');
};

const getCurrencyInfo = (info) => {
    if (!info) return '';
    return info.CurCode ? `(${info.CurCode})  ${info.CurName}` : (info.CurName ?? '');
};

const getBalance = (row) => fmt(row.ItmCurDebit - row.ItmCurCredit);

// ── Column definitions ────────────────────────────────────────
const makeColumns = (t) => [
    {
        id: 'ItmCurDebit',
        field: 'ItmCurDebit',
        name: 'curDebit',
        headerText: t ? t('labels.curDebit') : 'Cur Debit',
        visible: true,
    },
    {
        id: 'ItmCurCredit',
        field: 'ItmCurCredit',
        name: 'curCredit',
        headerText: t ? t('labels.curCredit') : 'Cur Credit',
        visible: true,
    },
    {
        id: 'balance',
        field: 'balance',
        name: 'balance',
        headerText: t ? t('labels.balance') : 'Balance',
        visible: true,
    },
    {
        id: 'ItmAccountInfo',
        field: 'ItmAccountInfo',
        name: 'accCodeName',
        headerText: t ? t('labels.accCodeName') : 'Account',
        visible: true,
    },
    {
        id: 'ItmCurInfo',
        field: 'ItmCurInfo',
        name: 'currency',
        headerText: t ? t('labels.currency') : 'Currency',
        visible: true,
    },
    { id: 'ItmDebit', field: 'ItmDebit', name: 'debit', headerText: t ? t('labels.debit') : 'Debit', visible: true },
    {
        id: 'ItmCredit',
        field: 'ItmCredit',
        name: 'credit',
        headerText: t ? t('labels.credit') : 'Credit',
        visible: true,
    },
];

// ── Icons ─────────────────────────────────────────────────────
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
function BalanceCard({ row, t }) {
    return (
        <div className="grid-card">
            {/* Account badge header */}
            <div className="grid-card-header">
                <span className="grid-badge">{getAccountInfo(row.ItmAccountInfo)}</span>
            </div>

            {/* Cur Debit / Cur Credit / Currency */}
            <div className="grid-card-amounts rep-three-col">
                <div className="grid-card-col">
                    <div className="grid-card-col-label">{t ? t('labels.curDebit') : 'Cur Debit'}</div>
                    <div className="grid-card-col-value">{fmt(row.ItmCurDebit)}</div>
                </div>
                <div className="grid-card-col">
                    <div className="grid-card-col-label">{t ? t('labels.curCredit') : 'Cur Credit'}</div>
                    <div className="grid-card-col-value">{fmt(row.ItmCurCredit)}</div>
                </div>
                <div className="grid-card-col">
                    <div className="grid-card-col-label">{t ? t('labels.currency') : 'Currency'}</div>
                    <div className="grid-card-col-value">{getCurrencyInfo(row.ItmCurInfo)}</div>
                </div>
            </div>

            {/* Balance footer */}
            <div className="grid-card-footer">
                <div className="rep-total">
                    <span className="rep-total-label">{t ? t('labels.balance') : 'Balance'} :</span>
                    <span className="rep-total-value">{getBalance(row)}</span>
                </div>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────
export default function RepAccBalancesPage({ t, isMobile, isRTL = false, logout }) {
    const { toast, showToast } = useToast();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [columns, setColumns] = useState(() => makeColumns(t));
    const [showManager, setShowManager] = useState(false);

    const visibleCols = useMemo(() => columns.filter((c) => c.visible !== false), [columns]);

    // ── Fetch on mount ────────────────────────────────────────
    useEffect(() => {
        const url = buildEndpointURL('main');
        const body = {
            command: 'Accounts',
            uid: '',
            params: { action: 'RunSeed', method: 'select', name: 'repAccBalances' },
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
                    if (data.errors[0].name === 'Session.NotFound') setTimeout(logout, 1500);
                    return;
                }
                setRows(data.result.items ?? []);
            })
            .catch(() => showToast('error', 'Failed to load'))
            .finally(() => setLoading(false));
    }, []);

    // ── Print ─────────────────────────────────────────────────
    const handlePrint = () => {
        const id = isMobile ? 'rep-acc-sm' : 'rep-acc-desktop';
        printCard(id, t ? t('router.repAccBalances') : 'Account Balances');
    };

    // ── Cell renderer for desktop table ───────────────────────
    const renderCell = (field, row) => {
        switch (field) {
            case 'ItmAccountInfo':
                return getAccountInfo(row.ItmAccountInfo);
            case 'ItmCurInfo':
                return getCurrencyInfo(row.ItmCurInfo);
            case 'balance':
                return getBalance(row);
            default:
                return fmt(row[field]);
        }
    };

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

            {/* ── Loading ──────────────────────────────────── */}
            {loading && (
                <div className="rep-loading">
                    <div className="list-panel-spinner" />
                </div>
            )}

            {/* ── Mobile card list ─────────────────────────── */}
            {hasData && !loading && !showManager && isMobile && (
                <div id="rep-acc-sm" className="grid-cards">
                    {rows.map((row, idx) => (
                        <BalanceCard key={row.ItmAccount ?? idx} row={row} t={t} />
                    ))}
                </div>
            )}

            {/* ── Desktop table ────────────────────────────── */}
            {hasData && !loading && !showManager && !isMobile && (
                <div id="rep-acc-desktop" className="grid-table-scroll">
                    <table className="grid-table">
                        <thead>
                            <tr>
                                {visibleCols.map((col) => (
                                    <th key={col.id} className="grid-th">
                                        {col.headerText}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => (
                                <tr key={row.ItmAccount ?? idx} className={`grid-row${idx % 2 === 1 ? ' odd' : ''}`}>
                                    {visibleCols.map((col) => (
                                        <td key={col.id} className="grid-td">
                                            {renderCell(col.field, row)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Empty state ──────────────────────────────── */}
            {!loading && !hasData && <div className="grid-empty">{t ? t('noResults') : 'No data'}</div>}
        </div>
    );
}
