import { useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import Select from 'react-select';
import { selectStyles } from '../utils/Styles.js';
import { buildEndpointURL } from '../services/config.js';

/**
 * MunimentDataForm
 *
 * Two modes depending on what refresh() receives:
 *
 * Mode 1 — Schema-driven (selectedTypeSchema provided):
 *   refresh(schema, dataObj)
 *   schema = [{ name, type, table?, note? }]
 *   type values: 'uacc' → accounts, 'ucur' → currencies,
 *                'ubrn' → branches, 'uwhs' → warehouses,
 *                'uprc' → prices, 'Currency'|'number' → number input,
 *                'Boolean' → switch, anything else → text input
 *   dataObj = { AccDebit: 123, CurID: 456, ... } (saved values)
 *
 * Mode 2 — Legacy object-driven (no schema):
 *   refresh(dataObj)
 *   dataObj = { AccMove: 123, DefCur: 456, ... }
 *   Type is inferred from field name (mirrors OJet dataType())
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

// ── Type resolution ───────────────────────────────────────────

// Schema-driven: resolve type from schema entry
// mirrors type field in selectedTypeSchema
const typeFromSchema = (entry) => {
    const t = (entry.type ?? '').toLowerCase();
    if (t === 'uacc') return 'account';
    if (t === 'ucur') return 'currency';
    if (t === 'ubrn') return 'branches';
    if (t === 'uwhs') return 'warehouses';
    if (t === 'uprc') return 'prices';
    if (t === 'boolean') return 'boolean';
    if (t === 'currency' || t === 'number') return 'number';
    return 'string';
};

// Legacy: infer type from field name (mirrors OJet dataType())
const typeFromName = (name, value) => {
    if (name.includes('Acc')) return 'account';
    if (name.includes('Cur')) return 'currency';
    if (name.includes('Warehouse')) return 'warehouses';
    if (name.includes('Branch')) return 'branches';
    if (name.includes('Price')) return 'prices';
    return typeof value; // 'string', 'number', 'boolean'
};

const MunimentDataForm = forwardRef(function MunimentDataForm({ showLabel = true, t, isRTL = false, onChange }, ref) {
    // items: [{ name, type, initialValue }]
    const [items, setItems] = useState([]);
    // values: { [name]: currentValue }
    const [values, setValues] = useState({});

    // ── Lookup data fetched once on mount ─────────────────────
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
        const seed = (cmd, name) => ({
            command: cmd,
            uid: '',
            params: { action: 'RunSeed', method: 'select', name },
        });

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

    const findOpt = (opts, val) => opts.find((o) => o.value === val) ?? null;

    const lookupOptions = {
        account: toOpts(accounts),
        currency: toOpts(currencies),
        warehouses: toOpts(warehouses),
        branches: toOpts(branches),
        prices: toOpts(prices),
    };

    const getLabel = (name) => (t ? t(`labels.muniments.${name}`) : name);

    const handleChange = (name, value) => {
        setValues((prev) => {
            const next = { ...prev, [name]: value };
            onChange?.(next);
            return next;
        });
    };

    // ── Ref methods ───────────────────────────────────────────
    // Store munType meta for building Options in getValues
    const munTypeMeta = useRef(null);

    useImperativeHandle(ref, () => ({
        /**
         * refresh(munTypeOrData, savedMunData?)
         *
         * Mode 1 — Full muniment type object (preferred):
         *   refresh(munTypeObj, savedMunData)
         *   munTypeObj = { guid, group, params, fields: [{ name, type, ... }] }
         *   savedMunData = { DefCur: x, AccMove: y, Options: {...} }
         *
         * Mode 2 — Fields array only:
         *   refresh(fieldsArray, savedMunData)
         *   fieldsArray = [{ name, type, ... }]
         *
         * Mode 3 — Legacy object (no schema):
         *   refresh(savedMunData)
         *   savedMunData = { AccMove: 123, DefCur: 456, ... }
         *
         * Mode 4 — null/undefined:
         *   refresh(null) → clears the form
         */
        refresh(munTypeOrData, savedMunData) {
            if (!munTypeOrData) {
                setItems([]);
                setValues({});
                munTypeMeta.current = null;
                return;
            }

            let fields = null;
            let dataObj = savedMunData ?? null;

            if (!Array.isArray(munTypeOrData) && typeof munTypeOrData === 'object' && munTypeOrData.fields) {
                // ── Mode 1: Full muniment type object ──────────
                // { guid, group, params, fields: [...] }
                munTypeMeta.current = {
                    guid: munTypeOrData.guid,
                    group: munTypeOrData.group,
                    params: munTypeOrData.params ?? {},
                };
                fields = munTypeOrData.fields;
            } else if (Array.isArray(munTypeOrData)) {
                // ── Mode 2: Fields array only ──────────────────
                munTypeMeta.current = null;
                fields = munTypeOrData;
            } else if (typeof munTypeOrData === 'object') {
                // ── Mode 3: Legacy object (no schema) ─────────
                munTypeMeta.current = null;
                fields = null;
                dataObj = munTypeOrData;
            }

            let parsed = [];
            let initVals = {};

            if (fields) {
                // Schema-driven: use fields array for rendering
                parsed = fields.map((entry) => ({
                    name: entry.name,
                    type: typeFromSchema(entry),
                    initialValue: dataObj?.[entry.name] ?? null,
                }));
            } else if (dataObj) {
                // Legacy: infer type from field name and initial value
                parsed = Object.entries(dataObj)
                    .filter(([name]) => name !== 'Options')
                    .map(([name, initialValue]) => ({
                        name,
                        type: typeFromName(name, initialValue),
                        initialValue: initialValue ?? null,
                    }));
            }

            parsed.forEach(({ name, initialValue }) => {
                initVals[name] = initialValue;
            });

            setItems(parsed);
            setValues(initVals);
        },

        /**
         * getValues()
         *
         * Returns the full MunData object including the Options block:
         * {
         *   DefCur: x, AccMove: y, ...fieldValues,
         *   Options: {
         *     MnoKind:      3,
         *     MnoGroup:     "Accounting",
         *     MnoDirection: -1,
         *     MnoIsPayment: true,
         *   }
         * }
         */
        getValues() {
            const meta = munTypeMeta.current;
            const result = { ...values };

            if (meta) {
                // Build Options block from munType params
                const params = meta.params ?? {};
                result.Options = {
                    MnoGroup: meta.group ?? null,
                    MnoDirection: params.Direction != null ? parseInt(params.Direction) : null,
                    MnoIsPayment: params.IsPayment != null ? params.IsPayment === 'True' : null,
                    MnoKind: params.Kind != null ? parseInt(params.Kind) : null,
                    MnoTitle: params.Title ?? null,
                };
                // Remove null options keys
                Object.keys(result.Options).forEach((k) => result.Options[k] == null && delete result.Options[k]);
            }

            return result;
        },

        // setValues — merge incoming saved values into current state
        setValues(obj) {
            if (!obj) {
                const initVals = {};
                items.forEach(({ name, initialValue }) => {
                    initVals[name] = initialValue ?? null;
                });
                setValues(initVals);
                return;
            }
            // Exclude Options block from field values
            const { Options, ...fieldVals } = typeof obj === 'string' ? JSON.parse(obj) : obj;
            setValues((prev) => ({ ...prev, ...fieldVals }));
        },

        validate() {
            return true;
        },
    }));

    if (items.length === 0) return null;

    return (
        <div className="descriptor-form">
            {showLabel && (
                <div className="descriptor-form-label">
                    <strong>{t ? t('labels.muniments.options') : 'Muniment Options'}</strong>
                </div>
            )}

            <div className="descriptor-form-grid">
                {items.map((item) => {
                    const { name, type } = item;
                    const label = getLabel(name);
                    const val = values[name] ?? null;
                    const opts = lookupOptions[type] ?? [];

                    return (
                        <div key={name} className="descriptor-field">
                            {type !== 'boolean' && (
                                <label className="form-label" htmlFor={name}>
                                    {label}
                                </label>
                            )}

                            {/* string → text */}
                            {type === 'string' && (
                                <input
                                    id={name}
                                    className="form-input"
                                    type="text"
                                    value={val ?? ''}
                                    onChange={(e) => handleChange(name, e.target.value)}
                                />
                            )}

                            {/* number → number */}
                            {type === 'number' && (
                                <input
                                    id={name}
                                    className="form-input"
                                    type="number"
                                    value={val ?? ''}
                                    onChange={(e) => handleChange(name, parseFloat(e.target.value) || 0)}
                                />
                            )}

                            {/* boolean → switch */}
                            {type === 'boolean' && (
                                <Switch checked={!!val} onChange={(v) => handleChange(name, v)} label={label} />
                            )}

                            {/* account / currency / warehouses / branches / prices → Select */}
                            {['account', 'currency', 'warehouses', 'branches', 'prices'].includes(type) && (
                                <div className="form-select-wrap">
                                    <Select
                                        inputId={name}
                                        styles={selectStyles(isRTL)}
                                        isClearable
                                        options={opts}
                                        value={findOpt(opts, val)}
                                        onChange={(opt) => handleChange(name, opt?.value ?? null)}
                                        placeholder=""
                                        // Add these two lines
                                        className="react-select-container"
                                        classNamePrefix="react-select"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default MunimentDataForm;
