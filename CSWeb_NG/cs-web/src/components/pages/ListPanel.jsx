import { useState, useMemo, useEffect, useRef } from 'react';
import { getMenuIcon } from '../MainPage/menuIcons';

/**
 * ListPanel
 *
 * Reusable left-panel list with search + toolbar menu.
 *
 
 *   oj-list-view + ListDataProviderView filterCriterion  → useMemo filter on items
 *   oj-input-search on-raw-value-changed                 → onChange input
 *   oj-menu-button + oj-menu                             → controlled dropdown menu
 *   selected="{{selectedItems}}"                         → selectedKey state (prop-driven)
 *   scroll-to-key                                        → useEffect + scrollIntoView
 *   oj-progress-circle value="-1"                        → CSS spinner
 *   oj-bind-if test="[[smScreen() || isListVisible()]]"  → isMobile + isVisible state
 *   toggleListVisibility                                 → setVisible toggle
 *
 * Props:
 *   items        {array}     Full list of records
 *   loading      {boolean}   Show spinner instead of list
 *   keyField     {string}    Field name used as unique key (e.g. 'DscUID')
 *   labelField   {string}    Field name shown as the item label (e.g. 'DscName')
 *   selectedKey  {any}       Currently selected item key (controlled)
 *   onSelect     {function}  Called with the full item object when user clicks
 *   onNew        {function}  Called when user clicks New
 *   onDelete     {function}  Called when user clicks Delete
 *   onPrint      {function}  Called when user clicks Print
 *   t            {function}  Translation function
 *   isMobile     {boolean}   Mirrors smScreen()
 */

export default function ListPanel({
    items = [],
    loading = false,
    guid,
    keyField,
    labelField,
    secondaryField,
    selectedKey,
    onSelect,
    onNew,
    onDelete,
    onPrint,
    renderIcon,
    t,
    isMobile,
    isRTL,
}) {
    const [filter, setFilter] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const [visible, setVisible] = useState(false);
    const listRef = useRef(null);

    //  Context menu state
    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
        item: null,
    });

    const contextMenuRef = useRef(null);

    useEffect(() => {
        const handleOutsideClick = () => {
            if (contextMenu.visible) {
                setContextMenu((prev) => ({ ...prev, visible: false }));
            }
        };

        if (contextMenu.visible) {
            // Use a small timeout or capture phase to prevent the
            // right-click itself from immediately closing the menu
            window.addEventListener('click', handleOutsideClick);
        }

        return () => {
            window.removeEventListener('click', handleOutsideClick);
        };
    }, [contextMenu.visible]);

    const handleContextMenu = (e, item) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            item: item,
        });
    };

    const showList = !isMobile || visible;

    // Mirrors ListDataProviderView filterCriterion with text filter
    const filtered = useMemo(() => {
        if (!filter.trim()) return items;
        const q = filter.toLowerCase();
        return items.filter((item) =>
            String(item[labelField] ?? '')
                .toLowerCase()
                .includes(q),
        );
    }, [items, filter, labelField]);

    // Mirrors scroll-to-key="always"
    // - selectedKey not null → scroll to that specific item
    // - selectedKey null     → scroll to last item in filtered list (default selection)
    // - also fires when showList becomes true (mobile panel opens)
    // ... inside ListPanel.jsx
    const targetKey = useMemo(() => {
        // 1. If we have a specific key from props, use it
        if (selectedKey !== null && selectedKey !== undefined) {
            return selectedKey;
        }

        // 2. Only fallback to last item if no key is provided and items exist
        if (filtered.length > 0) {
            return filtered[filtered.length - 1][keyField];
        }

        return null;
    }, [selectedKey, filtered, keyField]);

    useEffect(() => {
        if (!targetKey || !showList) return;

        const scroll = () => {
            if (!listRef.current) return;
            // Use a more robust selector that handles possible spaces/special chars in keys
            const el = listRef.current.querySelector(`[id="list-item-${targetKey}"]`);
            if (el) {
                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        };

        // Increase timeout slightly to 100ms to ensure React finished
        // rendering the list items into the DOM
        const id = setTimeout(scroll, 100);
        return () => clearTimeout(id);
    }, [targetKey, showList, filtered]); // Added filtered so it re-scrolls if the list changes

    const label = (item) => item[labelField] ?? '';

    // On mobile, show a toggle button when list is hidden
    const secondary = (item) => (secondaryField ? item[secondaryField] : null);

    return (
        <div className="list-panel-wrapper">
            {/* Mobile toggle */}
            {isMobile && (
                <button
                    className="list-panel-toggle"
                    onClick={() => setVisible((v) => !v)}
                    title={visible ? t?.('hideList') : t?.('showList')}
                >
                    ☰
                </button>
            )}

            {showList && (
                <div className="list-panel">
                    {loading ? (
                        <div className="list-panel-loading">
                            <div className="list-panel-spinner" />
                        </div>
                    ) : (
                        <>
                            {/* Search */}
                            <div className="list-panel-search-row">
                                <input
                                    className="list-panel-search"
                                    type="text"
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    placeholder={t?.('commands.search') ?? 'Search…'}
                                />
                            </div>

                            {/* List */}
                            <div className="list-panel-list" ref={listRef}>
                                {filtered.length === 0 ? (
                                    <div className="list-panel-empty">{t?.('noResults') ?? 'No results'}</div>
                                ) : (
                                    filtered.map((item) => {
                                        const key = item[keyField];
                                        const isSelected = key === selectedKey;

                                        return (
                                            <div
                                                key={key}
                                                id={`list-item-${key}`}
                                                className={`list-panel-item${isSelected ? ' selected' : ''}`}
                                                onClick={() => {
                                                    onSelect?.(item);
                                                    if (isMobile) setVisible(false);
                                                }}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();

                                                    const x = Math.min(e.clientX, window.innerWidth - 180);
                                                    const y = Math.min(e.clientY, window.innerHeight - 100);

                                                    setMenuOpen(false); //  prevent conflict

                                                    setContextMenu({
                                                        visible: true,
                                                        x,
                                                        y,
                                                        item,
                                                    });
                                                }}
                                            >
                                                <div className="list-panel-item-icon">
                                                    {renderIcon ? renderIcon(item) : getMenuIcon(guid)}
                                                </div>
                                                <div className="list-panel-item-text">
                                                    <span className="list-panel-item-label">{label(item)}</span>
                                                    {secondaryField && item[secondaryField] && (
                                                        <span className="list-panel-item-secondary">
                                                            {item[secondaryField]}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Toolbar — mirrors oj-menu-button + oj-menu */}
                            <div className="list-panel-toolbar">
                                <div className="list-panel-menu-wrapper">
                                    <button className="list-panel-tools-btn" onClick={() => setMenuOpen((v) => !v)}>
                                        <svg
                                            width="15"
                                            height="15"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        >
                                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                                        </svg>
                                        <span>{t?.('commands.tools') ?? 'Tools'}</span>
                                        <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                        >
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </button>

                                    {menuOpen && (
                                        <>
                                            <div
                                                className="list-panel-menu-overlay"
                                                onClick={() => setMenuOpen(false)}
                                            />
                                            <div className="list-panel-menu">
                                                {/* New */}
                                                <button
                                                    className="list-panel-menu-item"
                                                    onClick={() => {
                                                        onNew?.();
                                                        setMenuOpen(false);
                                                    }}
                                                >
                                                    <svg
                                                        width="15"
                                                        height="15"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="var(--accent)"
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                    >
                                                        <line x1="12" y1="5" x2="12" y2="19" />
                                                        <line x1="5" y1="12" x2="19" y2="12" />
                                                    </svg>
                                                    {t?.('commands.new') ?? 'New'}
                                                </button>

                                                <div className="list-panel-menu-divider" />

                                                {/* Delete */}
                                                <button
                                                    className="list-panel-menu-item danger"
                                                    disabled={!selectedKey}
                                                    onClick={() => {
                                                        onDelete?.();
                                                        setMenuOpen(false);
                                                    }}
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
                                                        <path d="M10 11v6M14 11v6" />
                                                        <path d="M9 6V4h6v2" />
                                                    </svg>
                                                    {t?.('commands.delete') ?? 'Delete'}
                                                </button>

                                                <div className="list-panel-menu-divider" />

                                                {/* Print */}
                                                <button
                                                    className="list-panel-menu-item"
                                                    disabled={!selectedKey}
                                                    onClick={() => {
                                                        onPrint?.();
                                                        setMenuOpen(false);
                                                    }}
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
                                                        <polyline points="6 9 6 2 18 2 18 9" />
                                                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                                        <rect x="6" y="14" width="12" height="8" />
                                                    </svg>
                                                    {t?.('commands.print') ?? 'Print'}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/*  Context Menu */}
            {contextMenu.visible && (
                <div
                    ref={contextMenuRef}
                    className="context-menu"
                    style={{
                        top: contextMenu.y,
                        left: contextMenu.x,
                    }}
                >
                    <button
                        className="context-menu-item"
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: 'none',
                            background: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                        }}
                        onClick={() => {
                            if (!contextMenu.item) return;

                            const key = contextMenu.item[keyField];

                            // Construct the URL using 'node' for the page and 'item' for the record
                            // We use nodeId (passed as prop) to ensure we open the right page
                            const params = new URLSearchParams();
                            params.set('node', guid); // or use a new prop 'nodeId'
                            params.set('item', key);

                            const newUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

                            window.open(newUrl, '_blank');
                            setContextMenu((m) => ({ ...m, visible: false }));
                        }}
                    >
                        {`🔗 ${t('commands.openInNewTab')}`}
                    </button>
                </div>
            )}
        </div>
    );
}
