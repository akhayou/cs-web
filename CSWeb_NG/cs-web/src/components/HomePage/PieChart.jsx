function polarToXY(cx, cy, r, angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function PieChart({ t }) {
    const slices = [
        { pct: 60, color: '#4ecdc4', label: t('ready') },
        { pct: 25, color: '#ff6b35', label: t('pending') },
        { pct: 15, color: '#45b7d1', label: t('cash') },
    ];

    let cumulative = 0;
    const paths = slices.map((s) => {
        const startAngle = (cumulative / 100) * 360 - 90;
        cumulative += s.pct;
        const endAngle = (cumulative / 100) * 360 - 90;
        const start = polarToXY(50, 50, 38, startAngle);
        const end = polarToXY(50, 50, 38, endAngle);
        const largeArc = s.pct > 50 ? 1 : 0;
        return { ...s, d: `M50,50 L${start.x},${start.y} A38,38 0 ${largeArc},1 ${end.x},${end.y} Z` };
    });

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: '100%' }}>
            <svg viewBox="0 0 100 100" style={{ width: 140, height: 140, flexShrink: 0 }}>
                {paths.map((p, i) => (
                    <path key={i} d={p.d} fill={p.color} stroke="transparent" strokeWidth="1" />
                ))}
                <circle cx="50" cy="50" r="22" fill="var(--card-bg)" />
            </svg>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {slices.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, opacity: 0.8 }}>{s.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, marginInlineStart: 'auto', paddingInlineStart: 8 }}>
                            {s.pct}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
