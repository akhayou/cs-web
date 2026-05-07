import { useState } from 'react';
import { ChevronIcon } from './Icons.jsx';
import { getMenuIcon } from './menuIcons.jsx';

export default function MenuItem({ node, depth = 0, collapsed, t }) {
    const [open, setOpen] = useState(false);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div>
            <div
                className="menu-item-row"
                style={{ paddingInlineStart: collapsed ? 0 : 12 + depth * 14 }}
                onClick={() => hasChildren && setOpen((v) => !v)}
                title={collapsed ? (t ? t(`router.${node.id}`) : node.name) : undefined}
            >
                <span className="menu-item-icon">
                    {getMenuIcon(node.id)}
                </span>
                {!collapsed && (
                    <span className="menu-item-label">
                        {t ? t(`router.${node.id}`) : node.name}
                    </span>
                )}
                {!collapsed && hasChildren && (
                    <span className="menu-chevron">
                        <ChevronIcon open={open} />
                    </span>
                )}
            </div>
            {!collapsed && open && hasChildren && (
                <div className="menu-children">
                    {node.children.map((child) => (
                        <MenuItem key={child.id} node={child} depth={depth + 1} collapsed={collapsed} t={t} />
                    ))}
                </div>
            )}
        </div>
    );
}
