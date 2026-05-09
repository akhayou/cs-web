import { useState, useEffect, useRef } from 'react';
import ListPanel from './ListPanel.jsx';
import { buildEndpointURL } from '../../services/config';
import Select from 'react-select';
import { FaPhone, FaEnvelope } from 'react-icons/fa';
import { useToast } from '../../utils/core.jsx';
import { selectStyles } from '../../utils/Styles.js';
import { printCard } from '../../utils/printCard.js';

/**
 * DescriptorsPage
 *
 *   connected() fetch RunSeed Descriptors     → useEffect on mount
 *   descriptorsData ko.observableArray        → useState([])
 *   loaded ko.observable                      → useState(false)
 *   method ko.observable insert/update        → useState('insert')
 *   current / nameValue / dataTypeGuid etc.   → useState per field
 *   checkValidationGroup                      → ref-based required check
 *   applyExecute                              → handleApply()
 *   newItemExecute                            → handleNew()
 *   parseItem                                 → handleSelect()
 *   filter + ListDataProviderView             → passed to ListPanel
 *   oj-validation-group tracker               → formRef + HTML5 validation
 *   oj-select-single dataTypeDP               → <select> with icon rows
 *   oj-select-many entitiesDP                 → <multi-select> with icon rows
 *   oj-checkboxset uniqueValue/notNullValue   → checkboxes
 *   oj-bind-if dataTypeGuid == 'List'         → conditional default field
 */

// const ENTITIES = [
//     'Materials',
//     'Bills',
//     'Contacts',
//     'Bill items',
//     'Patients',
//     'Accounts',
//     'Workflow',
//     'Voucher items',
//     'Medicals',
//     'Employees',
//     'Sub Accounts',
//     'Archives',
//     'Services',
//     'Doctors',
//     'Employments contracts',
// ];

export default function DescriptorsPage({ t, isMobile, onBack, logout, isRTL, routerKey = null }) {
    // ── Data state ────────────────────────────────────────────
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // ── Selection & method ────────────────────────────────────
    const [selectedKey, setSelectedKey] = useState(routerKey);
    const [oldSelectedKey, setOldSelectedKey] = useState(null);
    const [method, setMethod] = useState('insert');

    // ── Form fields ───────────────────────────────────────────
    const [nameValue, setNameValue] = useState('');
    const [dataTypeGuid, setDataTypeGuid] = useState('Text');
    const [dataTypeValue, setDataTypeValue] = useState(0);
    const [entitiesValue, setEntitiesValue] = useState([]);
    const [defaultValue, setDefaultValue] = useState('');
    const [maxLength, setMaxLength] = useState('');
    const [unique, setUnique] = useState(false);
    const [notNull, setNotNull] = useState(false);
    const [listValues, setListValues] = useState([]);
    const [isDisabled, setIsDisabled] = useState(true);
    const { toast, showToast } = useToast();

    const DATA_TYPES = [
        { value: 0, guid: 'Text', label: t('labels.dataTypes.text'), icon: '𝐓' },
        { value: 0, guid: 'Phone', label: t('labels.dataTypes.phone'), icon: '📞' },
        { value: 0, guid: 'Email', label: t('labels.dataTypes.email'), icon: '✉' },
        { value: 1, guid: 'Boolean', label: t('labels.dataTypes.boolean'), icon: '☑' },
        { value: 2, guid: 'Number', label: t('labels.dataTypes.number'), icon: '#' },
        { value: 3, guid: 'Date', label: t('labels.dataTypes.date'), icon: '📅' },
        { value: 4, guid: 'Time', label: t('labels.dataTypes.time'), icon: '⏱' },
        { value: 100, guid: 'List', label: t('labels.dataTypes.list'), icon: '≡' },
        { value: 200, guid: 'Multi', label: t('labels.dataTypes.multiSelect'), icon: '☰' },
        { value: 300, guid: 'Accounts', label: t('labels.dataTypes.account'), icon: '👤' },
        { value: 300, guid: 'SubAccounts', label: t('labels.dataTypes.subAccount'), icon: '👤' },
        { value: 300, guid: 'Materials', label: t('labels.dataTypes.material'), icon: '📦' },
    ];

    const options = DATA_TYPES.map((dt) => ({
        value: dt.guid,
        label: dt.label,
        icon: dt.icon,
    }));

    const formatOptionLabel = ({ label, icon }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 24, textAlign: 'center' }}>{icon}</span>
            <span>{label}</span>
        </div>
    );

    const ENTITIES = [
        { value: 'Materials', label: t('labels.entities.materials'), icon: 'ph ph-cube' },
        { value: 'Bills', label: t('labels.entities.bills'), icon: 'ph ph-receipt' },
        { value: 'Contacts', label: t('labels.entities.contacts'), icon: 'ph ph-address-book' },
        { value: 'Bill items', label: t('labels.entities.billItems'), icon: 'ph ph-list-bullets' },
        { value: 'Patients', label: t('labels.entities.patients'), icon: 'ph ph-heartbeat' },
        { value: 'Accounts', label: t('labels.entities.accounts'), icon: 'ph ph-wallet' },
        { value: 'Workflow', label: t('labels.entities.workflow'), icon: 'ph ph-flow-arrow' },
        { value: 'Voucher items', label: t('labels.entities.voucherItems'), icon: 'ph ph-receipt' },
        { value: 'Medicals', label: t('labels.entities.medicals'), icon: 'ph ph-pill' },
        { value: 'Employees', label: t('labels.entities.employees'), icon: 'ph ph-users' },
        { value: 'Sub Accounts', label: t('labels.entities.subAccounts'), icon: 'ph ph-tree-structure' },
        { value: 'Archives', label: t('labels.entities.archives'), icon: 'ph ph-archive' },
        { value: 'Services', label: t('labels.entities.services'), icon: 'ph ph-gear' },
        { value: 'Doctors', label: t('labels.entities.doctors'), icon: 'ph ph-stethoscope' },
        { value: 'Employments contracts', label: t('labels.entities.employmentsContracts'), icon: 'ph ph-file-text' },
    ];

    const entitiesOptions = ENTITIES.map((ent) => ({
        value: ent.value,
        label: ent.label,
        icon: ent.icon,
    }));

    const entitiesFormatOptionLabel = ({ label, icon }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className={icon}></i>
            <span>{label}</span>
        </div>
    );

    const formRef = useRef(null);

    // ── Fetch descriptors on mount ────────────────────────────
    useEffect(() => {
        const url = buildEndpointURL('main');
        const body = {
            command: 'main',
            uid: '',
            params: { action: 'RunSeed', method: 'select', name: 'Descriptors' },
        };
        fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data?.errors?.length) {
                    if (data.errors[0].name === 'Session.NotFound') {
                        showToast('error', t('messages.sessionExpired'));
                        setTimeout(() => {
                            logout();
                        }, 1500);
                    } else showToast('error', data.errors[0].name);
                    return;
                }
                const fetched = data?.result?.items || [];
                setItems(fetched);

                // FIX: Only auto-select the last item if we don't have a routerKey (URL param)
                if (fetched.length) {
                    const itemToSelect = routerKey
                        ? fetched.find((i) => String(i.DscUID) === String(routerKey))
                        : fetched[fetched.length - 1];

                    if (itemToSelect) {
                        handleSelect(itemToSelect);
                    } else {
                        // Fallback if URL key wasn't found in fetched items
                        handleSelect(fetched[fetched.length - 1]);
                    }
                }
            })
            .catch(() => showToast('error', 'Fetch error'))
            .finally(() => setLoading(false));
    }, [routerKey]);

    // ── Select item (mirrors parseItem) ───────────────────────
    const handleSelect = (item) => {
        setIsDisabled(true);
        setMethod('update');
        setSelectedKey(item.DscUID);
        setNameValue(item.DscName ?? '');
        setDataTypeValue(item.DscType ?? 0);
        setDataTypeGuid(item.DscTypeName ?? 'Text');
        setEntitiesValue(Array.isArray(item.DscGuids) ? item.DscGuids : []);
        setDefaultValue(item.DscDefault ?? '');
        setMaxLength(item.DscSize ?? '');
        setUnique(!!item.DscNoDuplicate);
        setNotNull(!!item.DscNotEmpty);
        setListValues(item.DscListsInfo ?? []);
    };

    // ── New item (mirrors newItemExecute) ─────────────────────
    const handleNew = () => {
        setIsDisabled(false);
        setMethod('insert');
        setSelectedKey(null);
        setOldSelectedKey(selectedKey);
        setNameValue('');
        setDataTypeValue(0);
        setDataTypeGuid('Text');
        setEntitiesValue([]);
        setDefaultValue('');
        setMaxLength('');
        setUnique(false);
        setNotNull(false);
        setListValues([]);
    };

    // ── Cancel (mirrors handleCancel) ─────────────────────────
    const handleCancel = () => {
        if (selectedKey) {
            const prev = items.find((i) => i.DscUID === selectedKey);
            if (prev) handleSelect(prev);
        } else if (oldSelectedKey) {
            const prev = items.find((i) => i.DscUID === oldSelectedKey);
            if (prev) handleSelect(prev);
        } else {
            handleNew();
        }
    };

    // ── Apply (mirrors applyExecute) ──────────────────────────
    const handleApply = () => {
        if (!formRef.current?.reportValidity()) return;

        const guids = `{${entitiesValue.join(',')}}`;
        const url = buildEndpointURL('main');
        const body = {
            command: 'Main',
            accessKey: '',
            uid: '',
            params: {
                action: 'RunSeed',
                method,
                name: 'Descriptors',
                fields: {
                    DscName: nameValue,
                    DscType: dataTypeValue,
                    DscTypeName: dataTypeGuid,
                    DscTypeGuid: dataTypeGuid,
                    DscGuids: guids,
                    DscListsInfo: listValues,
                    DscDefault: defaultValue,
                    DscSize: maxLength,
                    DscNoDuplicate: unique,
                    DscNotEmpty: notNull,
                    ...(selectedKey ? { DscUID: selectedKey } : {}),
                },
            },
        };

        fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.errors) {
                    if (data.errors[0].name === 'Session.NotFound') {
                        showToast('error', t('messages.sessionExpired'));
                        setTimeout(() => {
                            logout();
                        }, 1500);
                    } else showToast('error', data.errors[0].name);

                    return;
                }
                const saved = data.result.items[0];
                if (method === 'update') {
                    setItems((prev) => prev.map((i) => (i.DscUID === selectedKey ? saved : i)));
                } else {
                    setItems((prev) => [...prev, saved]);
                    handleSelect(saved);
                }
                showToast('info', t?.('messages.operationDone') ?? 'Done');
            })
            .catch(() => showToast('error', 'Save error'));
    };

    // ── Data type change ──────────────────────────────────────
    const handleDataTypeChange = (guid) => {
        setIsDisabled(false);
        const dt = DATA_TYPES.find((d) => d.guid === guid);
        setDataTypeGuid(guid);
        setDataTypeValue(dt?.value ?? 0);
        setDefaultValue('');
    };

    return (
        <div className="page-layout">
            {/* Toast — mirrors oj-messages */}
            {toast && <div className={`page-toast page-toast-${toast.type}`}>{toast.message}</div>}

            {/* Left panel — reusable ListPanel */}
            <ListPanel
                items={items}
                loading={loading}
                guid="descriptors"
                keyField="DscUID"
                labelField="DscName"
                selectedKey={selectedKey}
                onSelect={handleSelect}
                onNew={handleNew}
                onDelete={() => showToast('info', 'Delete not implemented')}
                // onPrint={() => window.print()}
                onPrint={() => printCard('card', t('router.descriptors'))}
                t={t}
                isMobile={isMobile}
                isRTL={isRTL}
            />

            {/* Right panel — form */}
            <div id="card" className="page-form-panel">
                <form ref={formRef} noValidate onSubmit={(e) => e.preventDefault()}>
                    <div className="page-form-grid">
                        {/* Left form column */}
                        <div className="page-form-col">
                            {/* Name */}
                            <div className="form-field">
                                <label className="form-label">{t?.('inputs.name') ?? 'Name'} *</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={nameValue}
                                    onChange={(e) => {
                                        setNameValue(e.target.value);
                                        setIsDisabled(false);
                                    }}
                                    required
                                />
                            </div>

                            {/* Data Type — mirrors oj-select-single with icon template */}
                            <div className="form-field">
                                <label className="form-label">{t?.('inputs.dataType') ?? 'Data Type'}</label>
                                <div className="form-select-wrap">
                                    <Select
                                        styles={selectStyles(isRTL)}
                                        options={DATA_TYPES.map((dt) => ({
                                            value: dt.guid,
                                            label: dt.label,
                                            icon: dt.icon,
                                        }))}
                                        value={
                                            DATA_TYPES.map((dt) => ({
                                                value: dt.guid,
                                                label: dt.label,
                                                icon: dt.icon,
                                            })).find((o) => o.value === dataTypeGuid) ?? null
                                        }
                                        formatOptionLabel={({ label, icon }) => (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ width: 24, textAlign: 'center' }}>{icon}</span>
                                                <span>{label}</span>
                                            </div>
                                        )}
                                        onChange={(opt) => handleDataTypeChange(opt.value)}
                                    />
                                </div>
                            </div>

                            {/* Entities — mirrors oj-select-many */}
                            <div className="form-field">
                                <label className="form-label">{t?.('inputs.entities') ?? 'Entities'}</label>
                                <div className="react-select-container">
                                    <Select
                                        styles={selectStyles(isRTL, { multiValueWidth: '140px' })}
                                        isMulti
                                        options={entitiesOptions}
                                        value={entitiesOptions.filter((o) => entitiesValue.includes(o.value))}
                                        onChange={(selected) => {
                                            setEntitiesValue(selected?.map((s) => s.value) || []);
                                            setIsDisabled(false);
                                        }}
                                        formatOptionLabel={entitiesFormatOptionLabel}
                                        className="react-select-container"
                                        classNamePrefix="react-select"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right form column — constraints */}
                        <div className="page-form-col">
                            <div className="form-constraints-title">
                                <strong>{t?.('labels.descriptorConstraints') ?? 'Descriptor Constraints'}</strong>
                            </div>

                            <div className="form-constraints-panel">
                                {/* Default value — mirrors oj-bind-if dataTypeGuid == 'List' etc. */}
                                <div className="form-field">
                                    <label className="form-label">
                                        {t?.('inputs.defaultValue') ?? 'Default Value'}
                                    </label>
                                    <input
                                        className="form-input"
                                        type={dataTypeValue === 2 ? 'number' : dataTypeValue === 3 ? 'date' : 'text'}
                                        value={defaultValue}
                                        onChange={(e) => {
                                            setDefaultValue(e.target.value);
                                            setIsDisabled(false);
                                        }}
                                    />
                                </div>

                                {/* Max Length — mirrors oj-input-number maxLength */}
                                <div className="form-field">
                                    <label className="form-label">{t?.('inputs.maxLength') ?? 'Max Length'}</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        min={0}
                                        value={maxLength}
                                        onChange={(e) => {
                                            setMaxLength(e.target.value);
                                            setIsDisabled(false);
                                        }}
                                    />
                                </div>

                                {/* Unique — mirrors oj-checkboxset uniqueValue */}
                                <label className="form-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={unique}
                                        onChange={(e) => {
                                            setUnique(e.target.checked);
                                            setIsDisabled(false);
                                        }}
                                    />
                                    <span>{t?.('inputs.unique') ?? 'Unique'}</span>
                                </label>

                                {/* Not Null — mirrors oj-checkboxset notNullValue */}
                                <label className="form-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={notNull}
                                        onChange={(e) => {
                                            setNotNull(e.target.checked);
                                            setIsDisabled(false);
                                        }}
                                    />
                                    <span>{t?.('inputs.notNull') ?? 'Not Null'}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Action buttons — mirrors apply + cancel */}
                <div className="page-form-actions">
                    <button className="page-btn-apply" onClick={handleApply}>
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        >
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {t?.('commands.apply') ?? 'Apply'}
                    </button>
                    <button className="page-btn-cancel" disabled={isDisabled} onClick={handleCancel}>
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        {t?.('commands.cancel') ?? 'Cancel'}
                    </button>
                </div>
            </div>
        </div>
    );
}
