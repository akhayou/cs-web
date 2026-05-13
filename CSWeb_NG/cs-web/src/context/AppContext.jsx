import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [loggedIn, setLoggedIn] = useState(!!sessionStorage.getItem('user'));
    const [username, setUsername] = useState(sessionStorage.getItem('user') || null);
    const [menuTree, setMenuTree] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('menuTree')) || [];
        } catch {
            return [];
        }
    });
    const [currentPage, setCurrentPage] = useState(sessionStorage.getItem('currentPage') || 'home');
    const [isDark, setIsDark] = useState(() => localStorage.getItem('isDark') === 'true');
    const [onlyIcons, setOnlyIcons] = useState(() => sessionStorage.getItem('onlyIcons') === 'true');
    const [language, setLanguage] = useState(() => localStorage.getItem('appLanguage') || 'en-us');

    const checkSession = useCallback(async () => {
        try {
            const { buildEndpointURL } = await import('../services/config.js');
            const url = buildEndpointURL('main');

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    command: 'session',
                    params: { action: 'check' },
                }),
            });

            const data = await response.json();

            if (data.errors) {
                // Equivalent to this._logout() in your JET code
                handleForceLogout();
            } else {
                // Session is valid, ensure state matches storage
                setLoggedIn(true);
                setUsername(sessionStorage.getItem('user'));
                // this._initHomePage() logic here if needed
            }
        } catch (error) {
            console.error('Error checking session:', error);
            handleForceLogout();
        }
    }, []);

    const handleForceLogout = () => {
        sessionStorage.clear();
        localStorage.clear;
        setLoggedIn(false);
        setUsername(null);
        setMenuTree([]);
    };

    useEffect(() => {
        // if (sessionStorage.getItem('user')) {
        checkSession();
        // }
    }, []);

    // Mirrors: isDarkTheme.subscribe → document.body.classList.toggle('dark-theme', value)
    useEffect(() => {
        document.body.classList.toggle('dark-theme', isDark);
        localStorage.setItem('isDark', isDark);
    }, [isDark]);

    // Mirrors: languageValue.subscribe → document.dir
    useEffect(() => {
        document.dir = language === 'ar-SY' ? 'rtl' : 'ltr';
        localStorage.setItem('appLanguage', language);
    }, [language]);

    const logout = async () => {
        try {
            const { buildEndpointURL } = await import('../services/config.js');
            await fetch(buildEndpointURL('main'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ command: 'session', params: { action: 'logout' } }),
            });
        } catch (e) {
            console.error('Logout error', e);
        }

        sessionStorage.clear();
        localStorage.clear;
        setLoggedIn(false);
        setUsername(null);
        setMenuTree([]);
        setCurrentPage('home');
        history.replaceState(null, '', window.location.pathname);
        // handleForceLogout();
    };

    const initAfterLogin = (result) => {
        setUsername(result.username);
        setMenuTree(result.menuTree);
        setLoggedIn(true);
        setCurrentPage(sessionStorage.getItem('currentPage') || 'home');
    };

    return (
        <AppContext.Provider
            value={{
                loggedIn,
                username,
                menuTree,
                currentPage,
                setCurrentPage,
                isDark,
                setIsDark,
                onlyIcons,
                setOnlyIcons,
                language,
                setLanguage,
                logout,
                initAfterLogin,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => useContext(AppContext);
