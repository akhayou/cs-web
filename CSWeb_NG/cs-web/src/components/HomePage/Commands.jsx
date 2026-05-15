import { useState, useEffect, useRef } from 'react';
import { getMenuIcon } from '../MainPage/menuIcons.jsx';

export default function Commands({ commands, onNavigate, t, rmFavorite = null, isFavorite = false }) {
    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
        item: null,
    });

    const contextMenuRef = useRef(null);

    // Close context menu when clicking anywhere else
    useEffect(() => {
        const handleOutsideClick = () => {
            setContextMenu((prev) => ({
                ...prev,
                visible: false,
            }));
        };

        if (contextMenu.visible) {
            window.addEventListener('click', handleOutsideClick);
        }

        return () => {
            window.removeEventListener('click', handleOutsideClick);
        };
    }, [contextMenu.visible]);

    return (
        <>
            {/* Commands Grid */}
            <div className="fc-buttons">
                {commands.map((cmd) => (
                    <div key={cmd.id} className="fc-item">
                        <button
                            className="fc-btn"
                            onClick={() => onNavigate?.(cmd)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();

                                const menuWidth = 200;
                                const menuHeight = 50;

                                const x = Math.min(e.clientX, window.innerWidth - menuWidth);

                                const y = Math.min(e.clientY, window.innerHeight - menuHeight);

                                setContextMenu({
                                    visible: true,
                                    x,
                                    y,
                                    item: cmd,
                                });
                            }}
                        >
                            <span className="menu-item-icon">{getMenuIcon(cmd.id)}</span>
                            <span>{t ? t(`router.${cmd.id}`) : cmd.id}</span>
                        </button>

                        {isFavorite && (
                            <button className="fc-remove" onClick={() => rmFavorite?.(cmd.id)}>
                                ✕
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Context Menu */}
            {contextMenu.visible && (
                <div
                    ref={contextMenuRef}
                    className="context-menu"
                    style={{
                        position: 'fixed',
                        top: `${contextMenu.y}px`,
                        left: `${contextMenu.x}px`,
                        zIndex: 9999,
                        background: 'var(--card-bg, #fff)',
                        border: '1px solid var(--border, #ccc)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        minWidth: '180px',
                        overflow: 'hidden',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="context-menu-item"
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            border: 'none',
                            background: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: 'inherit',
                        }}
                        onClick={() => {
                            if (!contextMenu.item) return;

                            // Open command in a new tab
                            const url = `?node=${contextMenu.item.id}`;
                            window.open(url, '_blank');

                            setContextMenu((prev) => ({
                                ...prev,
                                visible: false,
                            }));
                        }}
                    >
                        🔗 {t ? t('commands.openInNewTab') : 'Open in New Tab'}
                    </button>
                </div>
            )}
        </>
    );
}
