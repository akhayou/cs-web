import { useState } from 'react';
import ColumnManager from './ColumnManager.jsx';

/**
 * DataGrid
 *
 * Reusable grid component — mirrors oj-table + column-manager usage in vouchers.
 *
 * OJet → React mapping:
 *   oj-table columns="[[visibleColumns]]"         → filters columns where visible
 *   column-manager on-columns-changed             → onColumnsChanged → setColumns
 *   tablePropertiesVisible ko.observable          → showManager state
 *   tablePropertiesExecute                        → toggle showManager
 *   oj-bind-if !smScreen                          → isMobile prop switches view
 *   oj-list-view (mobile card view)               → MobileCard component
 *   getFieldValue(col.field, row)                 → renderCell prop or default
 *   tableStyle(index)                             → alternating row background
 *   handleUpdate / handleDelete in toolbar        → onEdit / onDelete props
 *   moreLessExecute (expand/collapse card)        → expandedKeys state
 *   selectedChangedListener                       → onSelect prop
 *   isDisabled (delete button)                    → no selection = disabled
 *   oj-sm-only-hide on delete button              → hidden on mobile toolbar
 *   fixColumns() → adds headerText + action col  → done in useMemo
 *
 * Props:
 *   columns      {array}     Column definitions [{ id, field, name, headerText, visible, smOnly, sortable }]
 *   rows         {array}     Data rows
 *   keyField     {string}    Unique key field name (default 'id')
 *   loading      {boolean}   Show spinner
 *   isMobile     {boolean}   Switch between table and card view
 *   onEdit       {function}  Called with row data when edit clicked
 *   onDelete     {function}  Called with selected row key when delete clicked
 *   onAddRow     {function}  Called when add row clicked
 *   onSelect     {function}  Called with row data when row selected
 *   renderCell   {function}  (field, row) => string | ReactElement — custom cell renderer
 *   t            {function}  Translation function
 *   columnLabel  {function}  (name) => string — translate column names
 */

// ── Icons ─────────────────────────────────────────────────────
const EditIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
);
const DeleteIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14H6L5 6"/>
        <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
    </svg>
);
const AddIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
);
const ChevronIcon = ({ open }) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
        <polyline points="9 18 15 12 9 6"/>
    </svg>
);
const DotsIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="5" r="1" fill="currentColor"/>
        <circle cx="12" cy="12" r="1" fill="currentColor"/>
        <circle cx="12" cy="19" r="1" fill="currentColor"/>
    </svg>
);

// ── Mobile card component ─────────────────────────────────────
function MobileCard({ row, columns, keyField, renderCell, onEdit, onDelete, t, columnLabel }) {
    const [expanded, setExpanded] = useState(false);

    // Main fields always shown (not smOnly)
    const mainCols  = columns.filter((c) => c.visible && c.id !== 'action' && !c.smOnly);
    // Extra fields shown only when expanded (smOnly)
    const extraCols = columns.filter((c) => c.visible && c.id !== 'action' && c.smOnly);

    const debit  = row.VouAccDebit  > 0 ? row.VouAccDebit  : null;
    const credit = row.VouAccCredit > 0 ? row.VouAccCredit : null;

    return (
        <div className="grid-card">
            {/* Header row: date badge + journal badge */}
            <div className="grid-card-header">
                <span className="grid-badge">{row.VouDate}</span>
                <span className="grid-badge">{row.VouJournal}</span>
            </div>

            {/* Debit / Credit columns */}
            <div className="grid-card-amounts">
                <div className="grid-card-col">
                    <div className="grid-card-col-label">{t ? t('labels.debit') : 'Debit'}</div>
                    <div className="grid-card-col-value">{debit != null ? debit : ''}</div>
                </div>
                <div className="grid-card-col">
                    <div className="grid-card-col-label">{t ? t('labels.credit') : 'Credit'}</div>
                    <div className="grid-card-col-value">{credit != null ? credit : ''}</div>
                </div>
            </div>

            {/* Expanded extra fields */}
            {expanded && extraCols.map((col) => (
                <div key={col.field} className="grid-card-extra-row">
                    <span className="grid-card-extra-label">
                        {columnLabel ? columnLabel(col.name) : col.headerText} :
                    </span>
                    <span>{renderCell ? renderCell(col.field, row) : (row[col.field] ?? '')}</span>
                </div>
            ))}

            {/* Footer: expand toggle + action buttons */}
            <div className="grid-card-footer">
                <button className="grid-card-expand-btn" onClick={() => setExpanded((v) => !v)}>
                    <ChevronIcon open={expanded} />
                </button>
                <div className="grid-card-actions">
                    {onDelete && (
                        <button className="grid-icon-btn danger" onClick={() => onDelete(row)}>
                            <DeleteIcon />
                        </button>
                    )}
                    {onEdit && (
                        <button className="grid-icon-btn" onClick={() => onEdit(row)}>
                            <EditIcon />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main DataGrid ─────────────────────────────────────────────
export default function DataGrid({
    columns: initColumns = [],
    rows = [],
    keyField = 'id',
    loading = false,
    isMobile = false,
    onEdit,
    onDelete,
    onAddRow,
    onSelect,
    renderCell,
    t,
    columnLabel,
}) {
    const [columns, setColumns] = useState(initColumns);
    const [showManager, setShowManager] = useState(false);
    const [selectedKey, setSelectedKey] = useState(null);

    const visibleCols = columns.filter((c) => c.visible !== false && c.id !== 'action');

    const handleSelect = (row) => {
        const key = row[keyField];
        setSelectedKey(key);
        onSelect?.(row);
    };

    const handleColumnsChanged = (updated) => {
        setColumns(updated);
    };

    if (loading) {
        return (
            <div className="grid-loading">
                <div className="list-panel-spinner" />
            </div>
        );
    }

    return (
        <div className="grid-wrapper">

            {/* ── Column manager toggle (mirrors tablePropertiesExecute) ── */}
            {!isMobile && rows.length > 0 && (
                <div className="grid-toolbar-top">
                    <button
                        className={`grid-manager-btn${showManager ? ' active' : ''}`}
                        onClick={() => setShowManager((v) => !v)}
                        title={t ? t('labels.tableProperties') : 'Column Settings'}
                    >
                        {showManager ? (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                <span>{t ? t('labels.tableProperties') : 'Done'}</span>
                            </>
                        ) : (
                            <>
                                <DotsIcon />
                                <span>{t ? t('labels.tableProperties') : 'Columns'}</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* ── Column manager panel ──────────────────────── */}
            {showManager && (
                <ColumnManager
                    columns={columns}
                    onChange={handleColumnsChanged}
                    t={t}
                />
            )}

            {/* ── Mobile: card list view ──────────────────────── */}
            {isMobile && !showManager && rows.length > 0 && (
                <div className="grid-cards">
                    {rows.map((row) => (
                        <MobileCard
                            key={row[keyField]}
                            row={row}
                            columns={columns}
                            keyField={keyField}
                            renderCell={renderCell}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            t={t}
                            columnLabel={columnLabel}
                        />
                    ))}
                </div>
            )}

            {/* ── Desktop: table view ─────────────────────────── */}
            {!isMobile && !showManager && rows.length > 0 && (
                <div className="grid-table-scroll">
                    <table className="grid-table">
                        <thead>
                            <tr>
                                {visibleCols.map((col) => (
                                    <th key={col.field ?? col.id} className="grid-th">
                                        {columnLabel ? columnLabel(col.name) : col.headerText}
                                    </th>
                                ))}
                                <th className="grid-th grid-th-action" />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => {
                                const key = row[keyField];
                                const isSelected = key === selectedKey;
                                return (
                                    <tr
                                        key={key}
                                        className={`grid-row${isSelected ? ' selected' : ''}${idx % 2 === 1 ? ' odd' : ''}`}
                                        onClick={() => handleSelect(row)}
                                    >
                                        {visibleCols.map((col) => (
                                            <td key={col.field ?? col.id} className="grid-td">
                                                {renderCell
                                                    ? renderCell(col.field, row)
                                                    : (row[col.field] ?? '')}
                                            </td>
                                        ))}
                                        <td className="grid-td grid-td-action">
                                            {onEdit && (
                                                <button
                                                    className="grid-icon-btn"
                                                    onClick={(e) => { e.stopPropagation(); onEdit(row); }}
                                                    title={t ? t('commands.edit') : 'Edit'}
                                                >
                                                    <EditIcon />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Empty state ───────────────────────────────── */}
            {rows.length === 0 && !loading && (
                <div className="grid-empty">
                    {t ? t('noResults') : 'No data'}
                </div>
            )}

            {/* ── Bottom toolbar (mirrors oj-divider-top toolbar) ── */}
            <div className="grid-toolbar-bottom">
                {/* Delete — hidden on mobile (mirrors oj-sm-only-hide) */}
                {!isMobile && onDelete && (
                    <button
                        className="grid-toolbar-btn danger"
                        disabled={!selectedKey}
                        onClick={() => onDelete(rows.find((r) => r[keyField] === selectedKey))}
                        title={t ? t('commands.deleteRow') : 'Delete'}
                    >
                        <DeleteIcon />
                    </button>
                )}
                {/* Add row */}
                {onAddRow && (
                    <button className="grid-toolbar-btn accent" onClick={onAddRow}>
                        <AddIcon />
                        {!isMobile && <span>{t ? t('commands.new') : 'New'}</span>}
                    </button>
                )}
            </div>
        </div>
    );
}
