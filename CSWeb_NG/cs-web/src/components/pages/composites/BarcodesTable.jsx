import { useState, useImperativeHandle, forwardRef } from 'react';
import Select from 'react-select';
import { selectStyles } from '../../../utils/Styles';

/**
 * BarcodesTable
 *
 * Oracle JET → React migration
 *
 * Features:
 *  - Inline row editing
 *  - Add row
 *  - Delete row
 *  - Row selection
 *  - Responsive columns
 *  - Ref methods
 *  - Writeback via onChange()
 */

const BarcodesTable = forwardRef(function BarcodesTable(
    {
        rows: initRows = [],
        unities: initUnities = [],
        categories: initCategories = [],
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

    const [unities, setUnities] = useState(initUnities);
    const [categories, setCategories] = useState(initCategories);

    const [editingKey, setEditingKey] = useState(null);
    const [editData, setEditData] = useState({});

    const [selectedKey, setSelectedKey] = useState(null);

    const [showAddRow, setShowAddRow] = useState(false);

    const [addData, setAddData] = useState({
        MbrBarcode: '',
        MbrUnity: null,
        MbrCategory: null,
        MbrPrice: 0,
        MbrNote: '',
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

        setUnities(newUnities) {
            setUnities(newUnities ?? []);
        },

        setCategories(newCategories) {
            setCategories(newCategories ?? []);
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

    const unityByKey = (key) => unities.find((u) => u.ElmUID === key)?.ElmName ?? key ?? '—';

    const categoryByKey = (key) => categories.find((c) => c.ElmUID === key)?.ElmName ?? key ?? '—';

    const unityOptions = unities.map((u) => ({
        value: u.ElmUID,
        label: u.ElmName,
    }));

    const categoryOptions = categories.map((c) => ({
        value: c.ElmUID,
        label: c.ElmName,
    }));

    const findUnityOption = (key) => unityOptions.find((o) => o.value === key) ?? null;

    const findCategoryOption = (key) => categoryOptions.find((o) => o.value === key) ?? null;

    // ─────────────────────────────────────────────
    // Edit row
    // ─────────────────────────────────────────────

    const handleEdit = (row) => {
        setEditingKey(row.MbrBarcode);
        setEditData({ ...row });
    };

    const handleDone = () => {
        if (!editingKey) return;

        const newRows = rows.map((r) => (r.MbrBarcode === editingKey ? { ...editData } : r));

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
            MbrBarcode: '',
            MbrUnity: null,
            MbrCategory: null,
            MbrPrice: 0,
            MbrNote: '',
        });
    };

    const handleToggleAddRow = () => {
        setShowAddRow((v) => !v);
        resetAddData();
    };

    const handleAddSubmit = () => {
        if (!addData.MbrBarcode) return;

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

        const newRows = rows.filter((r) => r.MbrBarcode !== selectedKey);

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
                            <th>{t ? t('inputs.barcode') : 'Barcode'}</th>

                            <th>{t ? t('inputs.unity') : 'Unity'}</th>

                            {!isMobile && <th>{t ? t('inputs.category') : 'Category'}</th>}

                            <th>{t ? t('inputs.price') : 'Price'}</th>

                            {!isMobile && <th>{t ? t('labels.note') : 'Note'}</th>}

                            <th className="units-table-col-action" />
                        </tr>
                    </thead>

                    <tbody>
                        {/* ───────────── ADD ROW ───────────── */}
                        {showAddRow && (
                            <tr className="units-table-add-row">
                                {/* BARCODE */}
                                <td>
                                    <input
                                        type="text"
                                        className="form-input units-table-input"
                                        value={addData.MbrBarcode}
                                        onChange={(e) =>
                                            setAddData((d) => ({
                                                ...d,
                                                MbrBarcode: e.target.value,
                                            }))
                                        }
                                    />
                                </td>

                                {/* UNITY */}
                                <td>
                                    <Select
                                        styles={selectStyles(isRTL)}
                                        options={unityOptions}
                                        value={findUnityOption(addData.MbrUnity)}
                                        onChange={(opt) =>
                                            setAddData((d) => ({
                                                ...d,
                                                MbrUnity: opt?.value ?? null,
                                            }))
                                        }
                                        menuPortalTarget={document.body}
                                    />
                                </td>

                                {/* CATEGORY */}
                                {!isMobile && (
                                    <td>
                                        <Select
                                            styles={selectStyles(isRTL)}
                                            options={categoryOptions}
                                            value={findCategoryOption(addData.MbrCategory)}
                                            onChange={(opt) =>
                                                setAddData((d) => ({
                                                    ...d,
                                                    MbrCategory: opt?.value ?? null,
                                                }))
                                            }
                                            menuPortalTarget={document.body}
                                        />
                                    </td>
                                )}

                                {/* PRICE */}
                                <td>
                                    <input
                                        type="number"
                                        className="form-input units-table-input"
                                        value={addData.MbrPrice}
                                        onChange={(e) =>
                                            setAddData((d) => ({
                                                ...d,
                                                MbrPrice: parseFloat(e.target.value) || 0,
                                            }))
                                        }
                                    />
                                </td>

                                {/* NOTE */}
                                {!isMobile && (
                                    <td>
                                        <input
                                            type="text"
                                            className="form-input units-table-input"
                                            value={addData.MbrNote}
                                            onChange={(e) =>
                                                setAddData((d) => ({
                                                    ...d,
                                                    MbrNote: e.target.value,
                                                }))
                                            }
                                        />
                                    </td>
                                )}

                                {/* ACTIONS */}
                                <td className="units-table-col-action">
                                    <button className="units-table-btn confirm" onClick={handleAddSubmit}>
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

                                    <button className="units-table-btn cancel" onClick={handleAddCancel}>
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

                        {/* EMPTY */}
                        {rows.length === 0 && !showAddRow && (
                            <tr>
                                <td colSpan={isMobile ? 4 : 6} className="units-table-empty">
                                    {t ? t('noResults') : 'No rows'}
                                </td>
                            </tr>
                        )}

                        {/* ───────────── DATA ROWS ───────────── */}
                        {rows.map((row) => {
                            const isEditing = editingKey === row.MbrBarcode;
                            const isSelected = selectedKey === row.MbrBarcode;

                            return (
                                <tr
                                    key={row.MbrBarcode}
                                    className={`units-table-row${isSelected ? ' selected' : ''}`}
                                    onClick={() => setSelectedKey(row.MbrBarcode)}
                                >
                                    {isEditing ? (
                                        <>
                                            {/* BARCODE */}
                                            <td>
                                                <input
                                                    type="text"
                                                    className="form-input units-table-input"
                                                    value={editData.MbrBarcode}
                                                    onChange={(e) =>
                                                        setEditData((d) => ({
                                                            ...d,
                                                            MbrBarcode: e.target.value,
                                                        }))
                                                    }
                                                />
                                            </td>

                                            {/* UNITY */}
                                            <td>
                                                <Select
                                                    styles={selectStyles(isRTL)}
                                                    options={unityOptions}
                                                    value={findUnityOption(editData.MbrUnity)}
                                                    onChange={(opt) =>
                                                        setEditData((d) => ({
                                                            ...d,
                                                            MbrUnity: opt?.value ?? null,
                                                        }))
                                                    }
                                                    menuPortalTarget={document.body}
                                                />
                                            </td>

                                            {/* CATEGORY */}
                                            {!isMobile && (
                                                <td>
                                                    <Select
                                                        styles={selectStyles(isRTL)}
                                                        options={categoryOptions}
                                                        value={findCategoryOption(editData.MbrCategory)}
                                                        onChange={(opt) =>
                                                            setEditData((d) => ({
                                                                ...d,
                                                                MbrCategory: opt?.value ?? null,
                                                            }))
                                                        }
                                                        menuPortalTarget={document.body}
                                                    />
                                                </td>
                                            )}

                                            {/* PRICE */}
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-input units-table-input"
                                                    value={editData.MbrPrice}
                                                    onChange={(e) =>
                                                        setEditData((d) => ({
                                                            ...d,
                                                            MbrPrice: parseFloat(e.target.value) || 0,
                                                        }))
                                                    }
                                                />
                                            </td>

                                            {/* NOTE */}
                                            {!isMobile && (
                                                <td>
                                                    <input
                                                        type="text"
                                                        className="form-input units-table-input"
                                                        value={editData.MbrNote}
                                                        onChange={(e) =>
                                                            setEditData((d) => ({
                                                                ...d,
                                                                MbrNote: e.target.value,
                                                            }))
                                                        }
                                                    />
                                                </td>
                                            )}

                                            {/* ACTIONS */}
                                            <td className="units-table-col-action">
                                                <button className="units-table-btn confirm" onClick={handleDone}>
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

                                                <button className="units-table-btn cancel" onClick={handleCancelEdit}>
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
                                            <td className="units-table-cell">{row.MbrBarcode}</td>

                                            <td className="units-table-cell">{unityByKey(row.MbrUnity)}</td>

                                            {!isMobile && (
                                                <td className="units-table-cell">{categoryByKey(row.MbrCategory)}</td>
                                            )}

                                            <td className="units-table-cell">{row.MbrPrice}</td>

                                            {!isMobile && <td className="units-table-cell">{row.MbrNote}</td>}

                                            <td className="units-table-col-action">
                                                <button
                                                    className="units-table-btn edit"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(row);
                                                    }}
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
                <button className="units-table-toolbar-btn danger" onClick={handleDelete} disabled={!selectedKey}>
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

export default BarcodesTable;
