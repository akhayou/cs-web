import { useState, useRef, useEffect } from 'react';
import Toggle from './Toggle.jsx';
import { UserIcon, MoonIcon, SunIcon, KeyIcon, PhoneIcon, LogoutIcon } from './Icons.jsx';

export default function UserDropdown({ username, language, setLanguage, isDark, setIsDark, logout, t }) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const isRTL = language === 'ar-SY';

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="avatar-wrapper" ref={dropdownRef}>
            <button className="avatar-btn" onClick={() => setDropdownOpen((v) => !v)}>
                <UserIcon />
            </button>

            {dropdownOpen && (
                <div className="dropdown" style={{ [isRTL ? 'left' : 'right']: 0 }}>
                    {/* Header */}
                    <div className="dropdown-header">
                        <div className="dropdown-username">{username || 'User'}</div>
                        <div className="dropdown-sub">{language === 'ar-SY' ? 'العربية-سورية' : 'English'}</div>
                    </div>

                    {/* Dark mode */}
                    <div className="dropdown-toggle-row">
                        <span className="dropdown-toggle-icon">{isDark ? <MoonIcon /> : <SunIcon />}</span>
                        <span className="dropdown-toggle-label">{t('darkMode')}</span>
                        <Toggle checked={isDark} onChange={setIsDark} />
                    </div>

                    <div className="dropdown-divider" />

                    {/* Language */}
                    <div className="dropdown-lang-label">{t('language')}</div>
                    <div className="lang-selector">
                        <button
                            className={`lang-btn ${language === 'en-us' ? 'active' : ''}`}
                            onClick={() => setLanguage('en-us')}
                        >
                            English
                        </button>
                        <button
                            className={`lang-btn ${language === 'ar-SY' ? 'active' : ''}`}
                            onClick={() => setLanguage('ar-SY')}
                        >
                            العربية
                        </button>
                    </div>

                    <div className="dropdown-divider" />

                    <button className="dropdown-item">
                        <span className="dropdown-item-icon">
                            <KeyIcon />
                        </span>
                        {t('changePassword')}
                    </button>
                    <button className="dropdown-item">
                        <span className="dropdown-item-icon">
                            <PhoneIcon />
                        </span>
                        {t('contactUs')}
                    </button>

                    <div className="dropdown-divider" />

                    <button
                        className="dropdown-item danger"
                        onClick={() => {
                            setDropdownOpen(false);
                            logout();
                        }}
                    >
                        <span className="dropdown-item-icon">
                            <LogoutIcon />
                        </span>
                        {t('signOut')}
                    </button>
                </div>
            )}
        </div>
    );
}
