export default function Toggle({ checked, onChange }) {
    return (
        <div
            onClick={() => onChange(!checked)}
            style={{
                width: 40,
                height: 22,
                borderRadius: 11,
                cursor: 'pointer',
                background: checked ? '#4ecdc4' : 'var(--border)',
                position: 'relative',
                transition: 'background 0.25s',
                flexShrink: 0,
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: 3,
                    insetInlineStart: checked ? 20 : 3,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'inset-inline-start 0.25s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }}
            />
        </div>
    );
}
