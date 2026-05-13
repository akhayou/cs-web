// src/pages/vouchers/VouchersPage.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import ColumnManager from '../components/ColumnManager';
import { buildEndpointURL } from '../services/config';
import styles from './VouchersPage.module.css';

/**
 * Full React version of vouchers page
 * with ColumnManager integration.
 */
export default function VouchersPage({ navigate }) {
    const { t } = useTranslation();

    // ----------------------------------------------------
    // State
    // ----------------------------------------------------
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [selectedRow, setSelectedRow] = useState(null);
    const [tablePropertiesVisible, setTablePropertiesVisible] = useState(false);

    // Simple responsive detection
    const [smScreen, setSmScreen] = useState(window.innerWidth < 768);

    useEffect(() => {
        const onResize = () => setSmScreen(window.innerWidth < 768);

        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // ----------------------------------------------------
    // Columns
    // ----------------------------------------------------
    const createInitialColumns = useCallback(
        () => [
            {
                id: 'VouDebit',
                field: 'VouDebit',
                name: 'debit',
                headerText: t('labels.debit'),
                visible: true,
            },
            {
                id: 'VouCredit',
                field: 'VouCredit',
                name: 'credit',
                headerText: t('labels.credit'),
                visible: true,
            },
            {
                id: 'VouAccDebit',
                field: 'VouAccDebit',
                name: 'curDebit',
                headerText: t('labels.curDebit'),
                visible: true,
            },
            {
                id: 'VouAccCredit',
                field: 'VouAccCredit',
                name: 'curCredit',
                headerText: t('labels.curCredit'),
                visible: true,
            },
            {
                id: 'VouAccountInfo',
                field: 'VouAccountInfo',
                name: 'accCodeName',
                headerText: t('labels.accCodeName'),
                visible: true,
            },
            {
                id: 'VouNote',
                field: 'VouNote',
                name: 'note',
                headerText: t('labels.note'),
                visible: true,
                smOnly: true,
            },
            {
                id: 'VouDoc',
                field: 'VouDoc',
                name: 'document',
                headerText: t('labels.document'),
                visible: true,
                smOnly: true,
            },
            {
                id: 'VouJournal',
                field: 'VouJournal',
                name: 'serial',
                headerText: t('labels.serial'),
                visible: true,
            },
            {
                id: 'VouDate',
                field: 'VouDate',
                name: 'date',
                headerText: t('labels.date'),
                visible: true,
            },
            {
                id: 'VouAccDealerInfo',
                field: 'VouAccDealerInfo',
                name: 'dealer',
                headerText: t('labels.dealer'),
                visible: false,
                smOnly: true,
            },
            {
                id: 'VouBranchInfo',
                field: 'VouBranchInfo',
                name: 'branch',
                headerText: t('labels.branch'),
                visible: false,
                smOnly: true,
            },
            {
                id: 'VouSubAccountInfo',
                field: 'VouSubAccountInfo',
                name: 'subAccount',
                headerText: t('labels.subAccount'),
                visible: false,
                smOnly: true,
            },
            {
                id: 'action',
                headerText: '',
                visible: true,
            },
        ],
        [t],
    );

    const [columns, setColumns] = useState(createInitialColumns);

    // Update translated labels if language changes
    useEffect(() => {
        setColumns((prev) =>
            prev.map((col) => {
                if (col.id === 'action') return col;

                return {
                    ...col,
                    headerText: t(`labels.${col.name}`),
                };
            }),
        );
    }, [t]);

    // ----------------------------------------------------
    // Visible columns
    // ----------------------------------------------------
    const visibleColumns = useMemo(
        () => columns.filter((col) => col.visible !== false && col.id !== 'action'),
        [columns],
    );

    // ----------------------------------------------------
    // Helpers
    // ----------------------------------------------------
    const formatNumber = (value) => (typeof value === 'number' ? new Intl.NumberFormat().format(value) : value);

    const getAccountInfo = (info) => {
        if (!info) return '';
        return info.ElmdCode ? `${info.ElmdCode} ${info.ElmdName}` : '';
    };

    const getFieldValue = (field, row) => {
        const value = row[field];

        switch (field) {
            case 'VouAccountInfo':
            case 'VouAccDealerInfo':
            case 'VouBranchInfo':
            case 'VouSubAccountInfo':
                return getAccountInfo(value);

            default:
                return formatNumber(value ?? '');
        }
    };

    // ----------------------------------------------------
    // Load vouchers
    // ----------------------------------------------------
    const loadVouchers = useCallback(async () => {
        try {
            setLoading(true);

            const command = {
                command: 'Accounts',
                accessKey: '',
                uid: '',
                params: {
                    action: 'RunSeed',
                    method: 'select',
                    name: '"CashVoucher"',
                },
            };

            const response = await fetch(buildEndpointURL('main'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(command),
            });

            const data = await response.json();

            if (data.errors) {
                setMessages(data.errors);
                return;
            }

            const items =
                data.result?.items?.map((item, index) => ({
                    ...item,
                    id: index,
                    showMore: false,
                })) || [];

            setVouchers(items);
        } catch (err) {
            console.error(err);
            setMessages([
                {
                    name: err.message,
                },
            ]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadVouchers();
    }, [loadVouchers]);

    // ----------------------------------------------------
    // Actions
    // ----------------------------------------------------
    const handleAddRow = () => {
        if (navigate) {
            navigate('/cashVouchers');
        }
    };

    const handleEdit = (row) => {
        if (navigate) {
            navigate(`/cashVouchers/${row.VouID}`);
        }
    };

    const handleDelete = () => {
        if (!selectedRow) return;
        console.log('Delete row:', selectedRow);
    };

    // ----------------------------------------------------
    // Render Mobile Card
    // ----------------------------------------------------
    const renderMobileCard = (voucher) => (
        <div key={voucher.id} className={styles.card}>
            <div className={styles.cardHeader}>
                <span>{voucher.VouDate}</span>
                <span>{voucher.VouJournal}</span>
            </div>

            <div className={styles.cardBody}>
                {visibleColumns.map((col) => (
                    <div key={col.id} className={styles.cardRow}>
                        <strong>{col.headerText}:</strong> {getFieldValue(col.field, voucher)}
                    </div>
                ))}
            </div>

            <div className={styles.cardActions}>
                <button onClick={() => handleEdit(voucher)}>{t('commands.edit')}</button>
            </div>
        </div>
    );

    // ----------------------------------------------------
    // Render Desktop Table
    // ----------------------------------------------------
    const renderTable = () => (
        <table className={styles.table}>
            <thead>
                <tr>
                    {visibleColumns.map((col) => (
                        <th key={col.id}>{col.headerText}</th>
                    ))}
                    <th />
                </tr>
            </thead>
            <tbody>
                {vouchers.map((row) => (
                    <tr
                        key={row.id}
                        onClick={() => setSelectedRow(row)}
                        className={selectedRow?.id === row.id ? styles.selectedRow : ''}
                    >
                        {visibleColumns.map((col) => (
                            <td key={col.id}>{getFieldValue(col.field, row)}</td>
                        ))}
                        <td>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(row);
                                }}
                            >
                                {t('commands.edit')}
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    // ----------------------------------------------------
    // Render
    // ----------------------------------------------------
    return (
        <div className={styles.page}>
            {/* Top Toolbar */}
            {vouchers.length > 0 && !smScreen && (
                <div className={styles.topCorner}>
                    <button onClick={() => setTablePropertiesVisible(!tablePropertiesVisible)}>
                        {labels?.tableProperties || t('labels.tableProperties')}
                    </button>
                </div>
            )}

            {/* Column Manager */}
            {tablePropertiesVisible && <ColumnManager columns={columns} onChange={setColumns} t={t} />}

            {/* Loading */}
            {loading && <div className={styles.loadingOverlay}>Loading...</div>}

            {/* Data */}
            {!loading && vouchers.length > 0 && !tablePropertiesVisible && (
                <>{smScreen ? vouchers.map(renderMobileCard) : renderTable()}</>
            )}

            {/* No Data */}
            {!loading && vouchers.length === 0 && (
                <div className={styles.noData}>{t('messages.noDataFound') || 'No data found'}</div>
            )}

            {/* Footer Buttons */}
            <div className={styles.footer}>
                <button onClick={handleDelete} disabled={!selectedRow}>
                    {t('commands.deleteRow')}
                </button>

                <button onClick={handleAddRow}>{t('commands.new')}</button>
            </div>

            {/* Messages */}
            {messages.length > 0 && (
                <div className={styles.messages}>
                    {messages.map((msg, index) => (
                        <div key={index}>{msg.name || msg.summary}</div>
                    ))}
                </div>
            )}
        </div>
    );
}
