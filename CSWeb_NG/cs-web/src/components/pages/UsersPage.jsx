import { useState, useEffect, useRef } from 'react';
import ListPanel from './ListPanel.jsx';
import { buildEndpointURL } from '../../services/config';
import Select from 'react-select';
import { FaPhone, FaEnvelope } from 'react-icons/fa';
// import DatePicker from 'react-datepicker';
// import { CalendarIcon } from '../../utils/icons.jsx';
// import 'react-datepicker/dist/react-datepicker.css';
import { useToast } from '../../utils/core.jsx';
import { printCard } from '../../utils/printCard.js';

export default function UsersPage({ t, isMobile, onBack, logout, isRTL, routerKey = null }) {
    // ── Data state ────────────────────────────────────────────
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // ── Selection & method ────────────────────────────────────
    const [selectedKey, setSelectedKey] = useState(routerKey);
    const [oldSelectedKey, setOldSelectedKey] = useState(null);
    const [method, setMethod] = useState('insert');

    // ── Form fields ───────────────────────────────────────────
    const [nameValue, setNameValue] = useState('');
    const [createDateValue, setCreateDateValue] = useState('');
    const [expireDateValue, setExpireDateValue] = useState('');
    const [displayNameValue, setDisplayNameValue] = useState('');
    const [fullNameValue, setFullNameValue] = useState('');
    const [jobNameValue, setJobNameValue] = useState('');
    const [passwordValue, setPasswordValue] = useState('');
    const [isAdminValue, setIsAdminValue] = useState(false);
    const [isReadOnlyValue, setIsReadOnlyValue] = useState(false);
    const [forceBrowsingValue, setForceBrowsingValue] = useState(false);
    const [limitEditingValue, setLimitEditingValue] = useState(false);
    const [limitReviewingValue, setLimitReviewingValue] = useState(false);
    const [reportDepartmentsValue, setReportDepartmentsValue] = useState(false);
    const [filterMunimentsValue, setFilterMunimentsValue] = useState(false);

    const [isDisabled, setIsDisabled] = useState(true);
    const { toast, showToast } = useToast();

    const formRef = useRef(null);

    // ── Fetch users on mount ────────────────────────────
    useEffect(() => {
        const url = buildEndpointURL('main');
        const body = {
            command: 'main',
            uid: '',
            params: { action: 'RunSeed', method: 'select', name: 'users' },
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
                        ? fetched.find((i) => String(i.ElmUID) === String(routerKey))
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
    }, []);

    // ── Select item (mirrors parseItem) ───────────────────────
    const handleSelect = (item) => {
        setIsDisabled(true);
        setMethod('update');
        setSelectedKey(item.ElmUID);
        setNameValue(item.ElmName ?? '');
        setDisplayNameValue(item.UsrDisplayName ?? '');
        setFullNameValue(item.UsrRealName ?? '');
        setJobNameValue(item.UsrJobName ?? '');
        setExpireDateValue(item.UsrExpireDate ?? '');
        //setPasswordValue(item.UsrExpireDate ?? null))
        setIsAdminValue(item.UsrIsAdmin ?? false);
        setIsReadOnlyValue(item.UsrIsReadOnly ?? false);
        setForceBrowsingValue(item.UsrForceBrowsing ?? false);
        setLimitEditingValue(item.UsrEditLimited ?? false);
        setLimitReviewingValue(item.UsrShowLimited ?? false);
        setReportDepartmentsValue(item.UsrReportDepartments ?? false);
        setFilterMunimentsValue(item.UsrFilterMuniments ?? false);
    };

    // ── New item (mirrors newItemExecute) ─────────────────────
    const handleNew = () => {
        setIsDisabled(false);
        setMethod('insert');
        setSelectedKey(null);
        setOldSelectedKey(selectedKey);
        setNameValue('');
        setDisplayNameValue('');
        setFullNameValue('');
        setJobNameValue('');
        setExpireDateValue(null);
        setIsAdminValue(false);
        setIsReadOnlyValue(false);
        setForceBrowsingValue(false);
        setLimitEditingValue(false);
        setLimitReviewingValue(false);
        setReportDepartmentsValue(false);
        setFilterMunimentsValue(false);
    };

    // ── Cancel (mirrors handleCancel) ─────────────────────────
    const handleCancel = () => {
        if (selectedKey) {
            const prev = items.find((i) => i.ElmUID === selectedKey);
            if (prev) handleSelect(prev);
        } else if (oldSelectedKey) {
            const prev = items.find((i) => i.ElmUID === oldSelectedKey);
            if (prev) handleSelect(prev);
        } else {
            handleNew();
        }
    };

    // ── Apply (mirrors applyExecute) ──────────────────────────
    const handleApply = () => {
        if (!formRef.current?.reportValidity()) return;
        const url = buildEndpointURL('main');
        const body = {
            command: 'Main',
            accessKey: '',
            uid: '',
            params: {
                action: 'RunSeed',
                method,
                name: 'users',
                fields: {
                    ElmName: nameValue,
                    UsrExpireDate: expireDateValue,
                    UsrDisplayName: displayNameValue,
                    UsrRealName: fullNameValue,
                    UsrJobName: jobNameValue,
                    UsrIsAdmin: isAdminValue,
                    UsrIsReadOnly: isReadOnlyValue,
                    UsrEditLimited: forceBrowsingValue,
                    UsrShowLimited: limitEditingValue,
                    UsrShowLimited: limitReviewingValue,
                    UsrReportDepartments: reportDepartmentsValue,
                    UsrFilterMuniments: filterMunimentsValue,
                    ...(selectedKey ? { ElmUID: selectedKey } : {}),
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

    return (
        <div className="page-layout">
            {/* Toast — mirrors oj-messages */}
            {toast && <div className={`page-toast page-toast-${toast.type}`}>{toast.message}</div>}

            {/* Left panel — reusable ListPanel */}
            <ListPanel
                items={items}
                loading={loading}
                guid="users"
                keyField="ElmUID"
                labelField="ElmName"
                selectedKey={selectedKey}
                onSelect={handleSelect}
                onNew={handleNew}
                onDelete={() => showToast('info', 'Delete not implemented')}
                // onPrint={() => window.print()}
                onPrint={() => printCard('card', t('router.users'))}
                t={t}
                isMobile={isMobile}
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
                            <div className="form-field">
                                <label className="form-label">{t?.('labels.user.displayName') ?? 'Display Name'}</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={displayNameValue}
                                    onChange={(e) => {
                                        setDisplayNameValue(e.target.value);
                                        setIsDisabled(false);
                                    }}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">{t?.('labels.user.fullName') ?? 'Full Name'}</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={fullNameValue}
                                    onChange={(e) => {
                                        setFullNameValue(e.target.value);
                                        setIsDisabled(false);
                                    }}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">{t?.('labels.user.jobName') ?? 'Job'}</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={jobNameValue}
                                    onChange={(e) => {
                                        setJobNameValue(e.target.value);
                                        setIsDisabled(false);
                                    }}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">{t?.('labels.user.expireDate') ?? 'Expire date'}</label>
                                {/* <DatePicker
                                    selected={expireDateValue}
                                    onChange={(e) => {
                                        setExpireDateValue(e.target.value);
                                        setIsDisabled(false);
                                    }}
                                    className="form-input"
                                />
                                <span className="date-icon">
                                    <CalendarIcon />
                                </span> */}
                                <input
                                    className="form-input"
                                    type="date"
                                    value={expireDateValue}
                                    onChange={(e) => {
                                        setExpireDateValue(e.target.value);
                                        setIsDisabled(false);
                                    }}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">
                                    {t?.('labels.user.password') ?? 'User password'}
                                    {!selectedKey ? '*' : ''}
                                </label>
                                <input
                                    className="form-input"
                                    type="password"
                                    value={passwordValue}
                                    onChange={(e) => {
                                        setPasswordValue(e.target.value);
                                        setIsDisabled(false);
                                    }}
                                    required={!selectedKey}
                                />
                            </div>
                        </div>

                        {/* Right form column — constraints */}
                        <div className="page-form-col">
                            <div className="form-constraints-title">
                                <strong>{(t?.('labels.otherOptions') ?? 'Other Options ') + ' :'}</strong>
                            </div>

                            <div className="form-constraints-panel">
                                <label className="form-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={isAdminValue}
                                        onChange={(e) => {
                                            setIsAdminValue(e.target.checked);
                                            setIsDisabled(false);
                                        }}
                                    />
                                    <span>{t?.('labels.user.isAdmin') ?? 'Admin'}</span>
                                </label>
                                <label className="form-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={isReadOnlyValue}
                                        onChange={(e) => {
                                            setIsReadOnlyValue(e.target.checked);
                                            setIsDisabled(false);
                                        }}
                                    />
                                    <span>{t?.('labels.user.isReadOnly') ?? 'ReadOnly'}</span>
                                </label>
                                <label className="form-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={isReadOnlyValue}
                                        onChange={(e) => {
                                            setIsReadOnlyValue(e.target.checked);
                                            setIsDisabled(false);
                                        }}
                                    />
                                    <span>{t?.('labels.user.isReadOnly') ?? 'ReadOnly'}</span>
                                </label>
                                <label className="form-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={forceBrowsingValue}
                                        onChange={(e) => {
                                            setForceBrowsingValue(e.target.checked);
                                            setIsDisabled(false);
                                        }}
                                    />
                                    <span>{t?.('labels.user.forceBrowsing') ?? 'Force Browsing'}</span>
                                </label>
                                <label className="form-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={limitReviewingValue}
                                        onChange={(e) => {
                                            setLimitReviewingValue(e.target.checked);
                                            setIsDisabled(false);
                                        }}
                                    />
                                    <span>{t?.('labels.user.limitEditing') ?? 'Limit Editing'}</span>
                                </label>
                                <label className="form-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={limitReviewingValue}
                                        onChange={(e) => {
                                            setLimitReviewingValue(e.target.checked);
                                            setIsDisabled(false);
                                        }}
                                    />
                                    <span>{t?.('labels.user.limitReviewing') ?? 'Limit Reviewing'}</span>
                                </label>
                                <label className="form-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={reportDepartmentsValue}
                                        onChange={(e) => {
                                            setReportDepartmentsValue(e.target.checked);
                                            setIsDisabled(false);
                                        }}
                                    />
                                    <span>{t?.('labels.user.reportDepartments') ?? 'Report Departments'}</span>
                                </label>
                                <label className="form-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={filterMunimentsValue}
                                        onChange={(e) => {
                                            setFilterMunimentsValue(e.target.checked);
                                            setIsDisabled(false);
                                        }}
                                    />
                                    <span>{t?.('labels.user.filterMuniments') ?? 'Filter Muniments'}</span>
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
