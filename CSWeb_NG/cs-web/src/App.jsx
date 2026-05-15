import { useState, useEffect } from 'react';
import { useApp } from './context/AppContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MainPage from './/pages/MainPage.jsx';
import { handleLogin as authLogin } from './services/authService.js';
import { useTranslation } from './utils/i18n.js';

export default function App() {
    const { loggedIn, initAfterLogin } = useApp();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const handleLogin = async ({ userLogin, userPassword }) => {
        if (!userLogin?.trim()) {
            setError('Session.emptyUsername');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = await authLogin(userLogin, userPassword);
            initAfterLogin(result); // mirrors: _initHomePage + loggedIn(true)
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };
    const [language, setLanguage] = useState(() => localStorage.getItem('appLanguage') || 'en-us');
    const t = useTranslation(language);
    useEffect(() => {
        document.title = t('appName');
    }, [language]);

    if (loggedIn) return <MainPage />;

    return <LoginPage loading={loading} errorMessage={error} onLogin={handleLogin} />;
}
