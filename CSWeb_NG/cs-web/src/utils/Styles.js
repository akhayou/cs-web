/**
 * selectStyles.js
 *
 * Shared react-select styles for all pages.
 *
 * Usage:
 *   import { selectStyles } from '../utils/selectStyles.js';
 *   <Select styles={selectStyles(isRTL)} ... />
 *
 *   // For multi-select with fixed width chips:
 *   <Select styles={selectStyles(isRTL, { multiValueWidth: '140px' })} ... />
 */

export const selectStyles = (isRTL = false, options = {}) => ({
    control: (base, state) => ({
        ...base,
        backgroundColor: 'var(--surface)',
        fontSize: '13.5px',
        borderRadius: '8px',
        borderColor: state.isFocused ? 'var(--accent)' : 'var(--border)',
        color: 'var(--text)',
        boxShadow: 'none',
        direction: isRTL ? 'rtl' : 'ltr',
        '&:hover': {
            borderColor: 'var(--accent)',
        },
    }),

    menu: (base) => ({
        ...base,
        backgroundColor: 'var(--surface)',
        color: 'var(--text)',
        zIndex: 9999,
        direction: isRTL ? 'rtl' : 'ltr',
    }),

    menuList: (base) => ({
        ...base,
        padding: 0,
    }),

    option: (base, state) => ({
        ...base,
        backgroundColor: state.isFocused ? 'rgba(78, 205, 196, 0.15)' : 'var(--surface)',
        fontSize: '13.5px',
        color: 'var(--text)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        '&:active': {
            backgroundColor: 'rgba(78, 205, 196, 0.25)',
        },
    }),

    singleValue: (base) => ({
        ...base,
        color: 'var(--text)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
    }),

    multiValue: (base) => ({
        ...base,
        width: options.multiValueWidth ?? 'auto',
        display: 'flex',
        backgroundColor: 'var(--accent)',
        borderRadius: '8px',
        padding: '2px 6px',
    }),

    multiValueLabel: (base) => ({
        ...base,
        color: 'var(--dark-text)',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    }),

    multiValueRemove: (base) => ({
        ...base,
        color: 'var(--dark-text)',
        cursor: 'pointer',
        marginLeft: isRTL ? undefined : 'auto',
        marginRight: isRTL ? 'auto' : undefined,
        borderRadius: '0 6px 6px 0',
        ':hover': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            color: '#fff',
        },
    }),

    input: (base) => ({
        ...base,
        color: 'var(--text)',
    }),

    placeholder: (base) => ({
        ...base,
        color: 'var(--text-muted)',
        fontSize: '13.5px',
    }),

    indicatorSeparator: (base) => ({
        ...base,
        backgroundColor: 'var(--border)',
    }),

    dropdownIndicator: (base) => ({
        ...base,
        color: 'var(--text-muted)',
        ':hover': { color: 'var(--text)' },
    }),

    clearIndicator: (base) => ({
        ...base,
        color: 'var(--text-muted)',
        ':hover': { color: '#e74c3c' },
    }),

    valueContainer: (base) => ({
        ...base,
        gap: 4,
    }),
});
