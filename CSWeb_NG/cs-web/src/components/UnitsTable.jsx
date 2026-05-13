import { useState, useImperativeHandle, forwardRef } from 'react';
import Select from 'react-select';
import { selectStyles } from '../utils/Styles';

/**
 * UnitsTable
 *
 * OJet → React mapping:
 *   oj-table edit-mode="rowEdit"              → inline row editing with editingKey state
 *   add-row-display="{{displayRow}}"          → showAddRow state
 *   BufferingDataProvider + ArrayDataProvider → useState(rows)
 *   on-oj-before-row-edit                     → handleEdit(key)
 *   on-oj-before-row-edit-end                 → handleDone() / handleCancel()
 *   on-oj-before-row-add-end                  → handleAddSubmit() / handleAddCancel()
 *   on-selected-changed                       → selectedKey state
 *   handleDeleteRow                           → handleDelete()
 *   handleAddRow (toggle)                     → setShowAddRow(v => !v)
 *   unityByKey(key)                           → unities.find(u => u.ElmUID === key)
 *   booleanToCheck(value)                     → checkbox checked prop
 *   this.refresh(value)                       → ref.current.refresh(value)
 *   this.setUnities(value)                    → ref.current.setUnities(value)
 *   _triggerWriteBack                         → onChange(rows) prop
 *   columns hidden on mobile (oj-sm-only-hide)→ isMobile prop hides isBase column
 *
 * Props:
 *   unities   {array}     List of unity objects [{ ElmUID, ElmName }]
 *   rows      {array}     Initial rows [{ MtuUnity, MtuExchange, MtuIsBase }]
 *   onChange  {function}  Called with updated rows on every change
 *   t         {function}  Translation function
 *   isRTL     {boolean}   RTL direction flag
 *   isMobile  {boolean}   Hides isBase column on small screens
 *
 * Ref methods:
 *   refresh(rows)         — replace all rows
 *   setUnities(unities)   — update the available unities list
 */

const UnitsTable = forwardRef(function UnitsTable(
    { unities: initUnities = [], rows: initRows = [], onChange, t, isRTL = false, isMobile = false },
    ref,
) {
    const [rows, setRows] = useState(initRows);
    const [unities, setUnities] = useState(initUnities);
    const [editingKey, setEditingKey] = useState(null); // MtuUnity of row being edited
    const [editData, setEditData] = useState({}); // draft data while editing
    const [selectedKey, setSelectedKey] = useState(null); // selected row key
    const [showAddRow, setShowAddRow] = useState(false);
    const [addData, setAddData] = useState({ MtuUnity: null, MtuExchange: 0, MtuIsBase: false });

    // ── Ref methods ───────────────────────────────────────────
    useImperativeHandle(ref, () => ({
        // mirrors this.refresh(value)
        refresh(newRows) {
            setRows(newRows ?? []);
            setEditingKey(null);
            setShowAddRow(false);
        },
        // mirrors this.setUnities(value)
        setUnities(newUnities) {
            setUnities(newUnities ?? []);
        },
        getValues() {
            return rows;
        },
    }));

    // ── Helpers ───────────────────────────────────────────────
    // mirrors unityByKey(key)
    const unityByKey = (key) => unities.find((u) => u.ElmUID === key)?.ElmName ?? key ?? '—';

    // Unity options for react-select
    const unityOptions = unities.map((u) => ({ value: u.ElmUID, label: u.ElmName }));
    const findUnityOption = (key) => unityOptions.find((o) => o.value === key) ?? null;

    // Notify parent of changes
    const triggerChange = (newRows) => onChange?.(newRows);

    // ── Edit row ──────────────────────────────────────────────
    // mirrors handleUpdate / beforeRowEditListener
    const handleEdit = (row) => {
        setEditingKey(row.MtuUnity);
        setEditData({ ...row }); // mirrors this.rowData = Object.assign({}, rowContext.item.data)
    };

    // mirrors handleDone / beforeRowEditEndListener (save)
    const handleDone = () => {
        if (!editingKey) return;
        const newRows = rows.map((r) => (r.MtuUnity === editingKey ? { ...editData } : r));
        setRows(newRows);
        setEditingKey(null);
        setEditData({});
        triggerChange(newRows);
    };

    // mirrors handleCancel (discard edit)
    const handleCancelEdit = () => {
        setEditingKey(null);
        setEditData({});
    };

    // ── Add row ───────────────────────────────────────────────
    // mirrors handleAddRow (toggle)
    const handleToggleAddRow = () => {
        setShowAddRow((v) => !v);
        setAddData({ MtuUnity: null, MtuExchange: 0, MtuIsBase: false });
    };

    // mirrors handleAddSubmit / beforeRowAddEndListener (validate + commit)
    const handleAddSubmit = () => {
        if (!addData.MtuUnity) return; // mirrors validateInputs
        const newRow = { ...addData };
        const newRows = [newRow, ...rows]; // mirrors matUnities.splice(0, 0, ...)
        setRows(newRows);
        setShowAddRow(false);
        setAddData({ MtuUnity: null, MtuExchange: 0, MtuIsBase: false });
        triggerChange(newRows);
    };

    // mirrors handleAddCancel
    const handleAddCancel = () => {
        setShowAddRow(false);
        setAddData({ MtuUnity: null, MtuExchange: 0, MtuIsBase: false });
    };

    // ── Delete row ────────────────────────────────────────────
    // mirrors handleDeleteRow
    const handleDelete = () => {
        if (!selectedKey) return;
        const newRows = rows.filter((r) => r.MtuUnity !== selectedKey);
        setRows(newRows);
        setSelectedKey(null);
        triggerChange(newRows);
    };

    return (
        <div className="units-table-wrapper">
            {/* ── Table ──────────────────────────────────────── */}
            <div className="units-table-scroll">
                <table className="units-table">
                    <thead>
                        <tr>
                            <th>{t ? t('inputs.unity') : 'Unity'}</th>
                            <th>{t ? t('inputs.exchangeRate') : 'Exchange Rate'}</th>
                            {!isMobile && <th>{t ? t('inputs.isBase') : 'Is Base'}</th>}
                            <th className="units-table-col-action" />
                        </tr>
                    </thead>

                    <tbody>
                        {/* ── Add row (mirrors addRowTemplate) ── */}
                        {showAddRow && (
                            <tr className="units-table-add-row">
                                <td>
                                    <Select
                                        styles={selectStyles(isRTL)}
                                        options={unityOptions}
                                        value={findUnityOption(addData.MtuUnity)}
                                        onChange={(opt) => setAddData((d) => ({ ...d, MtuUnity: opt?.value ?? null }))}
                                        placeholder={t ? t('inputs.unity') : 'Unity'}
                                        menuPortalTarget={document.body}
                                    />
                                </td>
                                <td>
                                    <input
                                        className="form-input units-table-input"
                                        type="number"
                                        min={0}
                                        value={addData.MtuExchange}
                                        onChange={(e) =>
                                            setAddData((d) => ({ ...d, MtuExchange: parseFloat(e.target.value) || 0 }))
                                        }
                                    />
                                </td>
                                {!isMobile && (
                                    <td>
                                        <input
                                            type="checkbox"
                                            className="units-table-checkbox"
                                            checked={!!addData.MtuIsBase}
                                            onChange={(e) => setAddData((d) => ({ ...d, MtuIsBase: e.target.checked }))}
                                        />
                                    </td>
                                )}
                                <td className="units-table-col-action">
                                    {/* mirrors handleAddSubmit */}
                                    <button
                                        className="units-table-btn confirm"
                                        onClick={handleAddSubmit}
                                        title={t ? t('commands.apply') : 'Submit'}
                                        disabled={!addData.MtuUnity}
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
                                    {/* mirrors handleAddCancel */}
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

                        {/* ── Data rows (mirrors rowTemplate) ─── */}
                        {rows.length === 0 && !showAddRow && (
                            <tr>
                                <td colSpan={isMobile ? 3 : 4} className="units-table-empty">
                                    {t ? t('noResults') : 'No rows'}
                                </td>
                            </tr>
                        )}

                        {rows.map((row) => {
                            const isEditing = editingKey === row.MtuUnity;
                            const isSelected = selectedKey === row.MtuUnity;

                            return (
                                <tr
                                    key={row.MtuUnity}
                                    className={`units-table-row${isSelected ? ' selected' : ''}`}
                                    onClick={() => setSelectedKey(row.MtuUnity)}
                                >
                                    {isEditing ? (
                                        /* ── Edit mode (mirrors row.mode === 'edit') ── */
                                        <>
                                            <td>
                                                <Select
                                                    styles={selectStyles(isRTL)}
                                                    options={unityOptions}
                                                    value={findUnityOption(editData.MtuUnity)}
                                                    onChange={(opt) =>
                                                        setEditData((d) => ({ ...d, MtuUnity: opt?.value ?? null }))
                                                    }
                                                    menuPortalTarget={document.body}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    className="form-input units-table-input"
                                                    type="number"
                                                    min={0}
                                                    value={editData.MtuExchange}
                                                    onChange={(e) =>
                                                        setEditData((d) => ({
                                                            ...d,
                                                            MtuExchange: parseFloat(e.target.value) || 0,
                                                        }))
                                                    }
                                                />
                                            </td>
                                            {!isMobile && (
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        className="units-table-checkbox"
                                                        checked={!!editData.MtuIsBase}
                                                        onChange={(e) =>
                                                            setEditData((d) => ({ ...d, MtuIsBase: e.target.checked }))
                                                        }
                                                    />
                                                </td>
                                            )}
                                            <td className="units-table-col-action">
                                                {/* mirrors handleDone */}
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
                                                {/* mirrors handleCancel */}
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
                                        /* ── Navigation mode (mirrors row.mode === 'navigation') ── */
                                        <>
                                            <td className="units-table-cell">{unityByKey(row.MtuUnity)}</td>
                                            <td className="units-table-cell">{row.MtuExchange}</td>
                                            {!isMobile && (
                                                <td className="units-table-cell">
                                                    {/* mirrors booleanToCheck + disabled checkboxset */}
                                                    <input
                                                        type="checkbox"
                                                        className="units-table-checkbox"
                                                        checked={!!row.MtuIsBase}
                                                        readOnly
                                                        disabled
                                                    />
                                                </td>
                                            )}
                                            <td className="units-table-col-action">
                                                {/* mirrors handleUpdate */}
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

            {/* ── Toolbar (mirrors oj-toolbar at bottom) ──────── */}
            <div className="units-table-toolbar">
                {/* mirrors handleDeleteRow — disabled when nothing selected */}
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

                {/* mirrors handleAddRow — disabled when in edit mode */}
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

export default UnitsTable;
