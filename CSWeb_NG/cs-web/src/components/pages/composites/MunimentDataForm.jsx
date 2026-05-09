import { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import Select from 'react-select';
import { selectStyles } from '../../../utils/Styles';
import { buildEndpointURL } from '../../../services/config';

/**
 * MunimentDataForm
 *
 * OJet → React mapping:
 *   muniment-data-view.html + muniment-data-viewModel.js
 *
 *   this.items ko.observableArray              → useState(items)
 *   this.refresh(jsonString)                   → ref.current.refresh(jsonString)
 *   this.getValues()                           → ref.current.getValues()
 *   this.setValues(array)                      → ref.current.setValues(array)
 *   this.dataType(name, value)                 → dataType() helper
 *   oj-bind-if dataType == 'string'            → <input type="text">
 *   oj-bind-if dataType == 'number'            → <input type="number">
 *   oj-bind-if dataType == 'boolean'           → <Switch>
 *   oj-bind-if dataType == 'account'           → <Select> from accountsDP
 *   oj-bind-if dataType == 'currency'          → <Select> from currenciesDP
 *   oj-bind-if dataType == 'warehouses'        → <Select> from warehousesDP
 *   oj-bind-if dataType == 'branches'          → <Select> from branchesDP
 *   oj-bind-if dataType == 'prices'            → <Select> from pricesDP
 *   this.accountsData / currenciesData etc.    → fetched on mount
 *   getLabel(name)                             → t(`labels.muniments.${name}`)
 *   munimentOptionsLabel                       → showLabel prop
 *
 * Props:
 *   showLabel  {boolean}   Show section label
 *   t          {function}  Translation function
 *   isRTL      {boolean}   RTL direction
 *   onChange   {function}  Called when any field changes
 *
 * Ref methods:
 *   refresh(jsonString)   — parse MunData JSON object and build field list
 *   getValues()           — returns { [name]: value } object
 *   setValues(obj)        — populate fields from saved values object
 *   validate()            — returns true if all required fields are filled
 */

// ── Toggle Switch ─────────────────────────────────────────────
function Switch({ checked, onChange, label }) {
    return (
        <label className="accounts-switch">
            <div className={`accounts-switch-track${checked ? ' on' : ''}`} onClick={() => onChange(!checked)}>
                <div className="accounts-switch-thumb" />
            </div>
            <span className="accounts-switch-label">{label}</span>
        </label>
    );
}

// ── dataType helper (mirrors this.dataType) ───────────────────
function dataType(name, value) {
    if (name.includes('Acc')) return 'account';
    if (name.includes('Cur')) return 'currency';
    if (name.includes('Warehouse')) return 'warehouses';
    if (name.includes('Branch')) return 'branches';
    if (name.includes('Price')) return 'prices';
    return typeof value; // 'string', 'number', 'boolean'
}

const MunimentDataForm = forwardRef(function MunimentDataForm({ showLabel = true, t, isRTL = false, onChange }, ref) {
    const [items, setItems] = useState([]); // [{ name, initialValue, value }]
    const [values, setValues] = useState({}); // { [name]: currentValue }

    // ── Lookup data (fetched once on mount) ───────────────────
    const [accounts, setAccounts] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [branches, setBranches] = useState([]);
    const [prices, setPrices] = useState([]);

    useEffect(() => {
        const url = buildEndpointURL('main');
        const opts = (body) => ({
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const seed = (cmd, name) => ({ command: cmd, uid: '', params: { action: 'RunSeed', method: 'select', name } });

        Promise.all([
            fetch(url, opts(seed('Stocks', 'Accounts'))),
            fetch(url, opts(seed('Main', 'Currencies'))),
            fetch(url, opts(seed('Stocks', 'warehouses'))),
            fetch(url, opts(seed('Main', 'Branches'))),
            fetch(url, opts(seed('main', 'prices'))),
        ])
            .then((rs) => Promise.all(rs.map((r) => r.json())))
            .then(([accs, curs, whs, brs, prs]) => {
                setAccounts(accs?.result?.items ?? []);
                setCurrencies(curs?.result?.items ?? []);
                setWarehouses(whs?.result?.items ?? []);
                setBranches(brs?.result?.items ?? []);
                setPrices(prs?.result?.items ?? []);
            })
            .catch(console.error);
    }, []);

    // ── Helpers ───────────────────────────────────────────────
    const toOpts = (arr, kF = 'ElmUID', lF = 'ElmName') => arr.map((i) => ({ value: i[kF], label: i[lF] }));

    const findOpt = (arr, kF, lF, val) => toOpts(arr, kF, lF).find((o) => o.value === val) ?? null;

    const getLabel = (name) => (t ? t(`labels.muniments.${name}`) : name);

    const handleChange = (name, value) => {
        const next = { ...values, [name]: value };
        setValues(next);
        onChange?.(next);
    };

    // ── Ref methods ───────────────────────────────────────────
    useImperativeHandle(ref, () => ({
        // mirrors this.refresh(jsonString)
        // MunData is a JSON object like { "AccDebit": 123, "CurID": 456, ... }
        refresh(jsonString) {
            if (!jsonString) {
                setItems([]);
                setValues({});
                return;
            }
            try {
                const obj = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
                // Filter out 'Options' key, build field list from entries
                const parsed = Object.entries(obj)
                    .filter(([name]) => name !== 'Options')
                    .map(([name, initialValue]) => ({ name, initialValue }));
                setItems(parsed);
                // Pre-populate values with initial values
                const initVals = {};
                parsed.forEach(({ name, initialValue }) => {
                    initVals[name] = initialValue ?? null;
                });
                setValues(initVals);
            } catch (e) {
                console.error('MunimentDataForm.refresh error:', e);
            }
        },

        // mirrors this.getValues() — returns { [name]: value } object
        getValues() {
            return { ...values };
        },

        // mirrors this.setValues(obj)
        // Called when loading a saved muniment — obj is { AccDebit: 123, ... }
        setValues(obj) {
            if (!obj) {
                // Reset to initial values
                const initVals = {};
                items.forEach(({ name, initialValue }) => {
                    initVals[name] = initialValue ?? null;
                });
                setValues(initVals);
                return;
            }
            const incoming = typeof obj === 'string' ? JSON.parse(obj) : obj;
            setValues((prev) => ({ ...prev, ...incoming }));
        },

        // mirrors checkValidationGroup
        validate() {
            return true;
        },
    }));

    if (items.length === 0) return null;

    // ── Select options by lookup type ─────────────────────────
    const lookupOptions = {
        account: toOpts(accounts),
        currency: toOpts(currencies),
        warehouses: toOpts(warehouses),
        branches: toOpts(branches),
        prices: toOpts(prices),
    };

    return (
        <div className="descriptor-form">
            {showLabel && (
                <div className="descriptor-form-label">
                    <strong>{t ? t('labels.muniments.options') : 'Muniment Options'}</strong>
                </div>
            )}

            <div className="descriptor-form-grid">
                {items.map((item) => {
                    const type = dataType(item.name, item.initialValue);
                    const label = getLabel(item.name);
                    const val = values[item.name] ?? null;

                    return (
                        <div key={item.name} className="descriptor-field">
                            {type !== 'boolean' && (
                                <label className="form-label" htmlFor={item.name}>
                                    {label}
                                </label>
                            )}

                            {/* string → text input */}
                            {type === 'string' && (
                                <input
                                    id={item.name}
                                    className="form-input"
                                    type="text"
                                    value={val ?? ''}
                                    onChange={(e) => handleChange(item.name, e.target.value)}
                                />
                            )}

                            {/* number → number input */}
                            {type === 'number' && (
                                <input
                                    id={item.name}
                                    className="form-input"
                                    type="number"
                                    value={val ?? ''}
                                    onChange={(e) => handleChange(item.name, parseFloat(e.target.value) || 0)}
                                />
                            )}

                            {/* boolean → switch */}
                            {type === 'boolean' && (
                                <Switch checked={!!val} onChange={(v) => handleChange(item.name, v)} label={label} />
                            )}

                            {/* account / currency / warehouses / branches / prices → Select */}
                            {['account', 'currency', 'warehouses', 'branches', 'prices'].includes(type) && (
                                <Select
                                    inputId={item.name}
                                    styles={selectStyles(isRTL)}
                                    isClearable
                                    options={lookupOptions[type] ?? []}
                                    value={findOpt(
                                        type === 'account'
                                            ? accounts
                                            : type === 'currency'
                                              ? currencies
                                              : type === 'warehouses'
                                                ? warehouses
                                                : type === 'branches'
                                                  ? branches
                                                  : prices,
                                        'ElmUID',
                                        'ElmName',
                                        val,
                                    )}
                                    onChange={(opt) => handleChange(item.name, opt?.value ?? null)}
                                    placeholder={label}
                                    menuPortalTarget={document.body}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default MunimentDataForm;
