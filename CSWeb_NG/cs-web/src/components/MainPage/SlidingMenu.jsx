import { useState, useImperativeHandle, forwardRef } from 'react';
import { getMenuIcon } from './menuIcons.jsx';
import { ChevronIcon } from './Icons.jsx';

function BackArrowIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    );
}

const SlidingMenu = forwardRef(({ menuTree = [], onNavigate, t, collapsed }, ref) => {
    const [stack, setStack] = useState([{ nodes: menuTree, parentLabel: null }]);
    const [animClass, setAnimClass] = useState('');

    const current = stack[stack.length - 1];
    const isRoot = stack.length === 1;

    const animate = (cls, callback) => {
        setAnimClass(cls);
        setTimeout(() => { callback(); setAnimClass(''); }, 180);
    };

    // ── Called when user clicks an item in the sidebar ────────
    const drillIn = (node) => {
        onNavigate?.(node); // MainPage updates nodeStack
        if (!node.children || node.children.length === 0) return;
        animate('sliding-in', () => {
            setStack((s) => [...s, {
                id: node.id,
                nodes: node.children,
                parentLabel: t ? t(`router.${node.id}`) : node.name,
            }]);
        });
    };

    // ── Slide the sidebar back one level (UI only, no onNavigate) ──
    // MainPage calls this via ref to sync the sidebar
    const drillOut = () => {
        if (isRoot) return;
        animate('sliding-out', () => setStack((s) => s.slice(0, -1)));
    };

    // ── Reset sidebar to root (UI only, no onNavigate) ────────
    const resetToRoot = () => {
        animate('sliding-out', () => setStack([{ nodes: menuTree, parentLabel: null }]));
    };

    // ── Sidebar back button: tell MainPage, MainPage calls drillOut back ──
    const handleSidebarBack = () => {
        // Compute what the parent node is
        const parentStackEntry = stack[stack.length - 2];
        const parentNode = parentStackEntry?.id
            ? { id: parentStackEntry.id, children: parentStackEntry.nodes }
            : null; // null = root/home
        onNavigate?.(parentNode); // MainPage handles everything including calling drillOut
    };

    const drillInById = (id) => {
        setStack((s) => {
            const current = s[s.length - 1];
            const node = current.nodes.find((n) => n.id === id);
            if (!node || !node.children?.length) return s;
            return [...s, {
                id: node.id,
                nodes: node.children,
                parentLabel: t ? t(`router.${node.id}`) : node.name,
            }];
        });
    };

    useImperativeHandle(ref, () => ({ drillOut, resetToRoot, drillInById }));

    return (
        <div className="sliding-menu">
            {!isRoot && (
                <button className="sliding-back" onClick={handleSidebarBack}>
                    <span className="sliding-back-arrow"><BackArrowIcon /></span>
                    {!collapsed && <span className="sliding-back-label">{current.parentLabel}</span>}
                </button>
            )}

            <div className={`sliding-level ${animClass}`}>
                {current.nodes.map((node) => {
                    const hasChildren = node.children && node.children.length > 0;
                    const label = t ? t(`router.${node.id}`) : node.name;
                    return (
                        <div
                            key={node.id}
                            className="sliding-item"
                            onClick={() => drillIn(node)}
                            title={collapsed ? label : undefined}
                        >
                            <span className="sliding-item-icon">{getMenuIcon(node.id)}</span>
                            {!collapsed && (
                                <>
                                    <span className="sliding-item-label">{label}</span>
                                    {hasChildren && (
                                        <span className="sliding-item-chevron">
                                            <ChevronIcon open={false} />
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default SlidingMenu;
