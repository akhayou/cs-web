const COLORS = ['#4ecdc4', '#ff6b35', '#45b7d1'];
const MAX_VAL = 100;

export default function BarChart({ t }) {
    const bars = [
        { label: t('jan'), values: [55, 80, 45] },
        { label: t('feb'), values: [70, 95, 60] },
        { label: t('mar'), values: [40, 65, 35] },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flex: 1, padding: '8px 0' }}>
                {bars.map((group, gi) => (
                    <div key={gi} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
                            {group.values.map((v, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: 16,
                                        height: `${(v / MAX_VAL) * 100}%`,
                                        background: COLORS[i],
                                        borderRadius: '3px 3px 0 0',
                                        transition: 'height 0.6s ease',
                                    }}
                                />
                            ))}
                        </div>
                        <span style={{ fontSize: 11, opacity: 0.6 }}>{group.label}</span>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                {[t('ready'), t('pending'), t('cash')].map((label, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i] }} />
                        <span style={{ fontSize: 11, opacity: 0.7 }}>{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
