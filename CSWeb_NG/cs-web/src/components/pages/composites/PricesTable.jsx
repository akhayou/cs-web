import { useState, useImperativeHandle, forwardRef } from 'react';
import Select from 'react-select';
import { selectStyles } from '../../../utils/Styles';

/**
 * PricesTable
 *
 * Oracle JET → React mapping:
 *
 * oj-table edit-mode="rowEdit"
 *   → inline row editing using editingKey
 *
 * add-row-display="{{displayRow}}"
 *   → showAddRow state
 *
 * BufferingDataProvider + ArrayDataProvider
 *   → useState(rows)
 *
 * on-selected-changed
 *   → selectedKey state
 *
 * handleDeleteRow
 *   → handleDelete()
 *
 * handleAddRow
 *   → handleToggleAddRow()
 *
 * priceByKey(key)
 *   → helper function
 *
 * unityByKey(key)
 *   → helper function
 *
 * _triggerWriteBack
 *   → onChange(rows)
 *
 * Ref methods:
 *   refresh(rows)
 *   setPrices(prices)
 *   setUnities(unities)
 */

const PricesTable = forwardRef(function PricesTable(
    {
        prices: initPrices = [],
        unities: initUnities = [],
        rows: initRows = [],
        onChange,
        t,
        isRTL = false,
        isMobile = false,
    },
    ref,
) {
    // ─────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────

    const [rows, setRows] = useState(initRows);

    const [prices, setPrices] = useState(initPrices);
    const [unities, setUnities] = useState(initUnities);

    const [editingKey, setEditingKey] = useState(null);
    const [editData, setEditData] = useState({});

    const [selectedKey, setSelectedKey] = useState(null);

    const [showAddRow, setShowAddRow] = useState(false);

    const [addData, setAddData] = useState({
        MtpPrice: null,
        MtpUnity: null,
        MtpValue: 0,
    });

    // ─────────────────────────────────────────────
    // Ref methods
    // ─────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
        refresh(newRows) {
            setRows(newRows ?? []);
            setEditingKey(null);
            setShowAddRow(false);
        },

        setPrices(newPrices) {
            setPrices(newPrices ?? []);
        },

        setUnities(newUnities) {
            setUnities(newUnities ?? []);
        },
        getValues() {
            return rows;
        },
    }));

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    const triggerChange = (newRows) => {
        onChange?.(newRows);
    };

    const priceByKey = (key) => prices.find((p) => p.ElmUID === key)?.ElmName ?? key ?? '—';

    const unityByKey = (key) => unities.find((u) => u.ElmUID === key)?.ElmName ?? key ?? '—';

    const priceOptions = prices.map((p) => ({
        value: p.ElmUID,
        label: p.ElmName,
    }));

    const unityOptions = unities.map((u) => ({
        value: u.ElmUID,
        label: u.ElmName,
    }));

    const findPriceOption = (key) => priceOptions.find((o) => o.value === key) ?? null;

    const findUnityOption = (key) => unityOptions.find((o) => o.value === key) ?? null;

    // ─────────────────────────────────────────────
    // Edit row
    // ─────────────────────────────────────────────

    const handleEdit = (row) => {
        setEditingKey(row.MtpPrice);
        setEditData({ ...row });
    };

    const handleDone = () => {
        if (!editingKey) return;

        const newRows = rows.map((r) => (r.MtpPrice === editingKey ? { ...editData } : r));

        setRows(newRows);
        setEditingKey(null);
        setEditData({});

        triggerChange(newRows);
    };

    const handleCancelEdit = () => {
        setEditingKey(null);
        setEditData({});
    };

    // ─────────────────────────────────────────────
    // Add row
    // ─────────────────────────────────────────────

    const resetAddData = () => {
        setAddData({
            MtpPrice: null,
            MtpUnity: null,
            MtpValue: 0,
        });
    };

    const handleToggleAddRow = () => {
        setShowAddRow((v) => !v);
        resetAddData();
    };

    const handleAddSubmit = () => {
        if (!addData.MtpPrice || !addData.MtpUnity) return;

        const newRows = [{ ...addData }, ...rows];

        setRows(newRows);
        setShowAddRow(false);

        resetAddData();

        triggerChange(newRows);
    };

    const handleAddCancel = () => {
        setShowAddRow(false);
        resetAddData();
    };

    // ─────────────────────────────────────────────
    // Delete row
    // ─────────────────────────────────────────────

    const handleDelete = () => {
        if (!selectedKey) return;

        const newRows = rows.filter((r) => r.MtpPrice !== selectedKey);

        setRows(newRows);
        setSelectedKey(null);

        triggerChange(newRows);
    };

    return (
        <div className="units-table-wrapper">
            {/* ───────────────── TABLE ───────────────── */}
            <div className="units-table-scroll">
                <table className="units-table">
                    <thead>
                        <tr>
                            <th>{t ? t('inputs.price') : 'Price'}</th>

                            <th>{t ? t('inputs.unity') : 'Unity'}</th>

                            <th>{t ? t('inputs.value') : 'Value'}</th>

                            <th className="units-table-col-action" />
                        </tr>
                    </thead>

                    <tbody>
                        {/* ───────────── ADD ROW ───────────── */}
                        {showAddRow && (
                            <tr className="units-table-add-row">
                                <td>
                                    <Select
                                        styles={selectStyles(isRTL)}
                                        options={priceOptions}
                                        value={findPriceOption(addData.MtpPrice)}
                                        onChange={(opt) =>
                                            setAddData((d) => ({
                                                ...d,
                                                MtpPrice: opt?.value ?? null,
                                            }))
                                        }
                                        placeholder={t ? t('inputs.price') : 'Price'}
                                        menuPortalTarget={document.body}
                                    />
                                </td>

                                <td>
                                    <Select
                                        styles={selectStyles(isRTL)}
                                        options={unityOptions}
                                        value={findUnityOption(addData.MtpUnity)}
                                        onChange={(opt) =>
                                            setAddData((d) => ({
                                                ...d,
                                                MtpUnity: opt?.value ?? null,
                                            }))
                                        }
                                        placeholder={t ? t('inputs.unity') : 'Unity'}
                                        menuPortalTarget={document.body}
                                    />
                                </td>

                                <td>
                                    <input
                                        type="number"
                                        className="form-input units-table-input"
                                        value={addData.MtpValue}
                                        onChange={(e) =>
                                            setAddData((d) => ({
                                                ...d,
                                                MtpValue: parseFloat(e.target.value) || 0,
                                            }))
                                        }
                                    />
                                </td>

                                <td className="units-table-col-action">
                                    <button
                                        className="units-table-btn confirm"
                                        onClick={handleAddSubmit}
                                        disabled={!addData.MtpPrice || !addData.MtpUnity}
                                        title={t ? t('commands.apply') : 'Submit'}
                                    >
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
                                    </button>

                                    <button
                                        className="units-table-btn cancel"
                                        onClick={handleAddCancel}
                                        title={t ? t('commands.cancel') : 'Cancel'}
                                    >
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        >
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        )}

                        {/* ───────────── EMPTY ───────────── */}
                        {rows.length === 0 && !showAddRow && (
                            <tr>
                                <td colSpan={4} className="units-table-empty">
                                    {t ? t('noResults') : 'No rows'}
                                </td>
                            </tr>
                        )}

                        {/* ───────────── DATA ROWS ───────────── */}
                        {rows.map((row) => {
                            const isEditing = editingKey === row.MtpPrice;
                            const isSelected = selectedKey === row.MtpPrice;

                            return (
                                <tr
                                    key={`${row.MtpPrice}-${row.MtpUnity}`}
                                    className={`units-table-row${isSelected ? ' selected' : ''}`}
                                    onClick={() => setSelectedKey(row.MtpPrice)}
                                >
                                    {isEditing ? (
                                        <>
                                            {/* PRICE */}
                                            <td>
                                                <Select
                                                    styles={selectStyles(isRTL)}
                                                    options={priceOptions}
                                                    value={findPriceOption(editData.MtpPrice)}
                                                    onChange={(opt) =>
                                                        setEditData((d) => ({
                                                            ...d,
                                                            MtpPrice: opt?.value ?? null,
                                                        }))
                                                    }
                                                    menuPortalTarget={document.body}
                                                />
                                            </td>

                                            {/* UNITY */}
                                            <td>
                                                <Select
                                                    styles={selectStyles(isRTL)}
                                                    options={unityOptions}
                                                    value={findUnityOption(editData.MtpUnity)}
                                                    onChange={(opt) =>
                                                        setEditData((d) => ({
                                                            ...d,
                                                            MtpUnity: opt?.value ?? null,
                                                        }))
                                                    }
                                                    menuPortalTarget={document.body}
                                                />
                                            </td>

                                            {/* VALUE */}
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-input units-table-input"
                                                    value={editData.MtpValue}
                                                    onChange={(e) =>
                                                        setEditData((d) => ({
                                                            ...d,
                                                            MtpValue: parseFloat(e.target.value) || 0,
                                                        }))
                                                    }
                                                />
                                            </td>

                                            {/* ACTIONS */}
                                            <td className="units-table-col-action">
                                                <button
                                                    className="units-table-btn confirm"
                                                    onClick={handleDone}
                                                    title={t ? t('commands.apply') : 'Save'}
                                                >
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
                                                </button>

                                                <button
                                                    className="units-table-btn cancel"
                                                    onClick={handleCancelEdit}
                                                    title={t ? t('commands.cancel') : 'Cancel'}
                                                >
                                                    <svg
                                                        width="14"
                                                        height="14"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                    >
                                                        <line x1="18" y1="6" x2="6" y2="18" />
                                                        <line x1="6" y1="6" x2="18" y2="18" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            {/* NAVIGATION MODE */}
                                            <td className="units-table-cell">{priceByKey(row.MtpPrice)}</td>

                                            <td className="units-table-cell">{unityByKey(row.MtpUnity)}</td>

                                            <td className="units-table-cell">{row.MtpValue}</td>

                                            <td className="units-table-col-action">
                                                <button
                                                    className="units-table-btn edit"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(row);
                                                    }}
                                                    title={t ? t('commands.edit') : 'Edit'}
                                                >
                                                    <svg
                                                        width="14"
                                                        height="14"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                    >
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ───────────────── TOOLBAR ───────────────── */}
            <div className="units-table-toolbar">
                <button
                    className="units-table-toolbar-btn danger"
                    onClick={handleDelete}
                    disabled={!selectedKey}
                    title={t ? t('commands.deleteRow') : 'Delete row'}
                >
                    <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                    >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                    </svg>
                </button>

                <button
                    className="units-table-toolbar-btn accent"
                    onClick={handleToggleAddRow}
                    disabled={editingKey !== null}
                    title={t ? t('commands.addRow') : 'Add row'}
                >
                    <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </button>
            </div>
        </div>
    );
});

export default PricesTable;
