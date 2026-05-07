import UserDropdown from './UserDropdown.jsx';
import { HomeIcon, MenuToggleIcon } from './Icons.jsx';

export default function Topbar({
    username,
    language,
    setLanguage,
    isDark,
    setIsDark,
    logout,
    t,
    currentPage,
    isMobile,
    onGoHome,
    onHamburgerClick,
}) {
    return (
        <header className="topbar">
            {/* Hamburger — visible only on mobile via CSS */}
            <button className="hamburger-btn" onClick={onHamburgerClick} title="Open menu">
                <MenuToggleIcon />
            </button>

            {/* Desktop: home icon + nav */}
            <button className="topbar-home-btn" onClick={onGoHome} title={t('home')}>
                <HomeIcon />
            </button>
            <div className="topbar-nav">
                <button className="topbar-nav-btn active">{t(`router.${currentPage}`)}</button>
            </div>

            {/* Full title (desktop) */}
            <div className="topbar-title">{t('appName')}</div>

            {/* Short title (mobile) */}
            <div className="topbar-title-mobile">{t('company')}</div>

            <UserDropdown
                username={username}
                language={language}
                setLanguage={setLanguage}
                isDark={isDark}
                setIsDark={setIsDark}
                logout={logout}
                t={t}
                isMobile={isMobile}
            />
        </header>
    );
}
