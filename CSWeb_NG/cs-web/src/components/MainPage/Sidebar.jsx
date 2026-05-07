import { forwardRef } from 'react';
import SlidingMenu from './SlidingMenu.jsx';
import { MenuToggleIcon } from './Icons.jsx';

const Sidebar = forwardRef(
    ({ menuTree, onlyIcons, setOnlyIcons, t, isMobile, drawerOpen, onClose, onNavigate }, ref) => {
        const safeMenuTree = Array.isArray(menuTree) ? menuTree : [];

        return (
            <>
                {isMobile && drawerOpen && <div className="drawer-overlay visible" onClick={onClose} />}

                <aside
                    className={`sidebar${isMobile ? ' mobile' : ''}${isMobile && drawerOpen ? ' drawer-open' : ''}`}
                    style={
                        isMobile
                            ? undefined
                            : {
                                  width: onlyIcons ? 'var(--sidebar-collapsed-w)' : 'var(--sidebar-w)',
                                  minWidth: onlyIcons ? 'var(--sidebar-collapsed-w)' : 'var(--sidebar-w)',
                                  borderInlineEnd: '1px solid var(--border)',
                              }
                    }
                >
                    <div className="sidebar-header">
                        {(!onlyIcons || isMobile) && <span className="sidebar-logo">{t('exploreMenu')}</span>}
                        <button
                            className="toggle-btn"
                            onClick={isMobile ? onClose : () => setOnlyIcons((v) => !v)}
                            title="Toggle sidebar"
                        >
                            <MenuToggleIcon />
                        </button>
                    </div>

                    <SlidingMenu
                        ref={ref}
                        menuTree={safeMenuTree}
                        onNavigate={onNavigate}
                        t={t}
                        collapsed={onlyIcons && !isMobile}
                    />
                </aside>
            </>
        );
    },
);

export default Sidebar;
