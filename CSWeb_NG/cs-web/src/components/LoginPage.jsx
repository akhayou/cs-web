import { useState, useEffect, useRef } from 'react';
import styles from './LoginPage.module.css';
import { useTranslation } from '../utils/i18n.js';
import { PersonIcon, EyeIcon, EyeOffIcon, EnterIcon } from '../utils/icons.jsx';

// Inline SVG icons for theme toggle (no extra dependency)
const SunIcon = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
    >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
);
const MoonIcon = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
    >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

export default function LoginPage({ errorMessage, loading = false, onLogin }) {
    const [userLogin, setUserLogin] = useState('');
    const [userPassword, setUserPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [language, setLanguage] = useState(() => localStorage.getItem('appLanguage') || 'en-us');
    const t = useTranslation(language);
    const userNameLabel = t('Username');
    const passwordLabel = t('Password');
    const loginLabel = t('login');

    // Read isDark from localStorage — same key AppContext uses
    const [isDark, setIsDark] = useState(() => {
        try {
            return localStorage.getItem('isDark') === 'true';
        } catch {
            return false;
        }
    });

    // Keep localStorage in sync when toggled on login page
    const toggleTheme = () => {
        setIsDark((prev) => {
            const next = !prev;
            try {
                localStorage.setItem('isDark', String(next));
            } catch {}
            return next;
        });
    };

    const usernameRef = useRef(null);
    useEffect(() => {
        usernameRef.current?.focus();
    }, []);

    const handleLogin = () => {
        if (typeof onLogin === 'function') {
            onLogin({ userLogin, userPassword });
        }
    };

    const handleKeyUp = (e) => {
        if (e.key === 'Enter') handleLogin();
    };

    const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 600);
    useEffect(() => {
        const onResize = () => setIsSmallScreen(window.innerWidth < 600);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return (
        <div className={`${styles.appLogin} ${isDark ? styles.dark : ''}`}>
            {/* Theme toggle — top-right corner */}
            <button
                className={styles.themeToggle}
                onClick={toggleTheme}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDark ? 'Light mode' : 'Dark mode'}
            >
                {isDark ? <SunIcon /> : <MoonIcon />}
            </button>

            <div className={styles.loginOuter}>
                <div className={styles.loginContainer}>
                    <div className={`${styles.loginPanel} ${isSmallScreen ? styles.loginPanelFlat : ''}`}>
                        <h6 className={styles.loginTitle}>{t('appName')}</h6>

                        <div className={styles.loginFormArea}>
                            {/* Username */}
                            <div className={styles.fieldGroup}>
                                <label className={styles.fieldLabel} htmlFor="userLogin">
                                    {t('userName')}
                                </label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        id="userLogin"
                                        type="text"
                                        className={styles.fieldInput}
                                        value={userLogin}
                                        onChange={(e) => setUserLogin(e.target.value)}
                                        onKeyUp={handleKeyUp}
                                        required
                                        autoComplete="username"
                                        ref={usernameRef}
                                    />
                                    <span className={styles.inputIcon} aria-label={userNameLabel}>
                                        <PersonIcon />
                                    </span>
                                </div>
                            </div>

                            {/* Password */}
                            <div className={styles.fieldGroup}>
                                <label className={styles.fieldLabel} htmlFor="userPassword">
                                    {t('password')}
                                </label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        id="userPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        className={styles.fieldInput}
                                        value={userPassword}
                                        onChange={(e) => setUserPassword(e.target.value)}
                                        onKeyUp={handleKeyUp}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className={styles.toggleBtn}
                                        onClick={() => setShowPassword((v) => !v)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                            </div>

                            {errorMessage && (
                                <p className={styles.errorMessage} role="alert">
                                    {errorMessage}
                                </p>
                            )}

                            <div className={styles.loginActions}>
                                <button
                                    type="button"
                                    className={styles.loginButton}
                                    onClick={handleLogin}
                                    disabled={loading}
                                    title={loginLabel}
                                >
                                    {loading ? (
                                        <span className={styles.spinner} aria-label="Logging in…" />
                                    ) : (
                                        <EnterIcon />
                                    )}
                                    <span>{loading ? 'Logging in…' : loginLabel}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
