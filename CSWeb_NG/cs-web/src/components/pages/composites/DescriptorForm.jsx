import { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import Select from 'react-select';
import { selectStyles } from '../../../utils/Styles.js';

// ── Field Components ─────────────────────────────────

function BaseInput({ type, descriptor, value, onChange, required }) {
    const invalid = required && (value == null || value === '');

    return (
        <input
            id={descriptor.DscUID}
            className={`form-input${invalid ? ' form-input-invalid' : ''}`}
            type={type}
            value={value ?? ''}
            onChange={(e) => onChange(descriptor.DscUID, e.target.value)}
            required={required}
            placeholder={descriptor.DscName}
        />
    );
}

const TextField = (p) => <BaseInput {...p} type="text" />;
const NumberField = (p) => <BaseInput {...p} type="number" />;
const DateField = (p) => <BaseInput {...p} type="date" />;
const TimeField = (p) => <BaseInput {...p} type="time" />;
const PhoneField = (p) => <BaseInput {...p} type="tel" />;
const EmailField = (p) => <BaseInput {...p} type="email" />;

function BooleanField({ descriptor, value, onChange }) {
    return (
        <label className="form-checkbox">
            <input
                id={descriptor.DscUID}
                type="checkbox"
                checked={!!value}
                onChange={(e) => onChange(descriptor.DscUID, e.target.checked)}
            />
            <span>{descriptor.DscName}</span>
        </label>
    );
}

function ListField({ descriptor, value, onChange, isRTL }) {
    const listInfo = descriptor.DscListsInfo ?? [];
    const keys = listInfo.length ? Object.keys(listInfo[0]) : ['DclUID', 'DclName'];
    const [keyField, labelField] = keys;

    const options = listInfo.map((item) => ({
        value: item[keyField],
        label: item[labelField],
    }));

    const selected = options.find((o) => o.value === value) ?? null;

    return (
        <Select
            styles={selectStyles(isRTL)}
            options={options}
            value={selected}
            onChange={(opt) => onChange(descriptor.DscUID, opt?.value ?? null)}
            isClearable
            placeholder={descriptor.DscName}
        />
    );
}

function MultiField({ descriptor, value, onChange, isRTL }) {
    const listInfo = descriptor.DscListsInfo ?? [];
    const keys = listInfo.length ? Object.keys(listInfo[0]) : ['DclUID', 'DclName'];
    const [keyField, labelField] = keys;

    const options = listInfo.map((item) => ({
        value: item[keyField],
        label: item[labelField],
    }));

    const currentVal = Array.isArray(value) ? value : [];
    const selected = options.filter((o) => currentVal.includes(o.value));

    return (
        <Select
            styles={selectStyles(isRTL)}
            isMulti
            options={options}
            value={selected}
            onChange={(opts) => onChange(descriptor.DscUID, opts ? opts.map((o) => o.value) : [])}
            placeholder={descriptor.DscName}
        />
    );
}

// ── Descriptor Field ─────────────────────────────

function DescriptorField({ descriptor, value, onChange, isRTL }) {
    const required = !!descriptor.DscNotEmpty;
    const type = descriptor.DscTypeName;

    let field;

    switch (type) {
        case 'Text':
            field = <TextField {...{ descriptor, value, onChange, required }} />;
            break;
        case 'Phone':
            field = <PhoneField {...{ descriptor, value, onChange, required }} />;
            break;
        case 'Email':
            field = <EmailField {...{ descriptor, value, onChange, required }} />;
            break;
        case 'Number':
            field = <NumberField {...{ descriptor, value, onChange, required }} />;
            break;
        case 'Date':
            field = <DateField {...{ descriptor, value, onChange, required }} />;
            break;
        case 'Time':
            field = <TimeField {...{ descriptor, value, onChange, required }} />;
            break;
        case 'Boolean':
            field = <BooleanField {...{ descriptor, value, onChange }} />;
            break;
        case 'List':
            field = <ListField {...{ descriptor, value, onChange, isRTL }} />;
            break;
        case 'Multi':
            field = <MultiField {...{ descriptor, value, onChange, isRTL }} />;
            break;
        default:
            field = <TextField {...{ descriptor, value, onChange, required }} />;
    }

    return (
        <div className="descriptor-field">
            <label className="form-label" htmlFor={descriptor.DscUID}>
                {descriptor.DscName}
                {required && <span className="descriptor-required"> *</span>}
            </label>
            {field}
        </div>
    );
}

// ── Main Component ─────────────────────────────

const DescriptorForm = forwardRef(function DescriptorForm(
    { descriptors: descriptorsProp, showLabel = true, t, onChange, onFieldChange, isRTL = false },
    ref,
) {
    const parse = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        try {
            return JSON.parse(val);
        } catch {
            return [];
        }
    };

    const [descriptors, setDescriptors] = useState(() => parse(descriptorsProp));
    const [values, setValuesState] = useState({});
    const [touched, setTouched] = useState({});

    useEffect(() => {
        const parsed = parse(descriptorsProp);
        setDescriptors(parsed);
        setValuesState({});
        setTouched({});
    }, [descriptorsProp]);

    const buildOutput = (dscs, vals) =>
        dscs.map((d) => ({
            DscdDescriptor: d.DscUID,
            DscdValue: vals[d.DscUID] ?? null,
        }));

    //  USER-ONLY change handler
    const handleChange = (uid, value) => {
        const next = { ...values, [uid]: value };

        setValuesState(next);
        setTouched((t) => ({ ...t, [uid]: true }));

        const output = buildOutput(descriptors, next);

        // 🔥 ONLY fires on user interaction
        onChange?.(output);

        onFieldChange?.({
            uid,
            value,
            allValues: output,
        });
    };

    useImperativeHandle(ref, () => ({
        refresh(jsonString) {
            const parsed = parse(jsonString);
            setDescriptors(parsed);
            setValuesState({});
            setTouched({});
        },

        getValues() {
            return buildOutput(descriptors, values);
        },

        // ❌ DOES NOT trigger onChange
        setValues(array) {
            if (!array) {
                setValuesState({});
                setTouched({});
                return;
            }

            const next = descriptors.reduce((acc, d) => {
                const found = array.find((a) => a.DscdDescriptor === d.DscUID);

                if (!found || found.DscdText == null) {
                    acc[d.DscUID] = null;
                } else if (d.DscType === 100 && d.DscListsInfo) {
                    const match = d.DscListsInfo.find((li) => {
                        const labelKey = Object.keys(li)[1];
                        return li[labelKey] === found.DscdText;
                    });
                    acc[d.DscUID] = match ? Object.values(match)[0] : null;
                } else {
                    acc[d.DscUID] = found.DscdText;
                }

                return acc;
            }, {});

            setValuesState(next);
            setTouched({});
        },

        validate() {
            const allTouched = {};
            descriptors.forEach((d) => {
                allTouched[d.DscUID] = true;
            });
            setTouched(allTouched);

            return descriptors.every((d) => !d.DscNotEmpty || !(values[d.DscUID] == null || values[d.DscUID] === ''));
        },
    }));

    if (!descriptors.length) return null;

    return (
        <div className="descriptor-form">
            {showLabel && (
                <div className="descriptor-form-label">
                    <strong>{t ? t('labels.descriptors') : 'Descriptors'}</strong>
                </div>
            )}

            <div className="descriptor-form-grid">
                {descriptors.map((descriptor) => (
                    <DescriptorField
                        key={descriptor.DscUID}
                        descriptor={descriptor}
                        value={values[descriptor.DscUID] ?? null}
                        onChange={handleChange}
                        isRTL={isRTL}
                    />
                ))}
            </div>
        </div>
    );
});

export default DescriptorForm;
