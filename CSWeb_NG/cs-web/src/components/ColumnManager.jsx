import { useState, useEffect } from 'react';

/**
 * ColumnManager (FIXED VERSION)
 */

const UpIcon = () => (
    <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
    >
        <polyline points="18 15 12 9 6 15" />
    </svg>
);

const DownIcon = () => (
    <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
    >
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const EyeIcon = () => (
    <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
    >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeOffIcon = () => (
    <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
    >
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    </svg>
);

export default function ColumnManager({ columns = [], onChange, t }) {
    const [cols, setCols] = useState(columns);

    // Sync if parent changes columns externally
    useEffect(() => {
        setCols(columns);
    }, [columns]);

    const notify = (updated) => {
        setCols(updated);
        onChange?.(updated);
    };

    // Remove action column
    const manageable = cols.filter((c) => c.id !== 'action');

    // ── MOVE UP (fixed index-based) ──
    const handleMoveUp = (index) => {
        if (index <= 0) return;
        const next = [...cols];
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        notify(next);
    };

    // ── MOVE DOWN ──
    const handleMoveDown = (index) => {
        if (index >= cols.length - 1) return;
        const next = [...cols];
        [next[index + 1], next[index]] = [next[index], next[index + 1]];
        notify(next);
    };

    // ── TOGGLE VISIBILITY ──
    const handleToggleVisible = (index) => {
        const next = cols.map((c, i) => (i === index ? { ...c, visible: !c.visible } : c));
        notify(next);
    };

    return (
        <div className="col-manager-wrapper">
            <div className="col-manager-panel">
                {/* Header */}
                <div className="col-manager-header">
                    <span>{t ? t('labels.tableProperties') : 'Column Settings'}</span>
                </div>

                {/* Columns */}
                {manageable.map((col, index) => {
                    const isVisible = col.visible !== false;

                    return (
                        <div key={col.field || col.name || index} className="col-manager-row">
                            {/* Label */}
                            <span className="col-manager-label">
                                {col.headerText || (t ? t(`labels.${col.name}`) : col.name)}
                            </span>

                            {/* Move controls */}
                            <div className="col-manager-arrows">
                                <button
                                    className="col-manager-btn"
                                    disabled={index === 0}
                                    onClick={() => handleMoveUp(index)}
                                    title={t ? t('commands.moveUp') : 'Move up'}
                                >
                                    <UpIcon />
                                </button>

                                <button
                                    className="col-manager-btn"
                                    disabled={index === manageable.length - 1}
                                    onClick={() => handleMoveDown(index)}
                                    title={t ? t('commands.moveDown') : 'Move down'}
                                >
                                    <DownIcon />
                                </button>
                            </div>

                            {/* Visibility toggle */}
                            <button
                                className={`col-manager-btn col-manager-eye${isVisible ? '' : ' hidden'}`}
                                onClick={() => handleToggleVisible(index)}
                                title={isVisible ? (t ? t('commands.hide') : 'Hide') : t ? t('commands.show') : 'Show'}
                            >
                                {isVisible ? <EyeIcon /> : <EyeOffIcon />}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
