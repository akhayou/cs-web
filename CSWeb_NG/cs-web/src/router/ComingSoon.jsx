import { getMenuIcon } from '../components/MainPage/menuIcons.jsx';

/**
 * ComingSoon
 * Shown for any leaf node that doesn't have a page component yet.
 */
export default function ComingSoon({ nodeId, t, onBack, logout, isRTL, routerKey = null }) {
    const label = t ? t(`router.${nodeId}`) : nodeId;

    return (
        <div className="coming-soon">
            <div className="coming-soon-icon">{getMenuIcon(nodeId)}</div>
            <h2 className="coming-soon-title">{label}</h2>
            <p className="coming-soon-subtitle">{t ? t('comingSoon') : 'This page is coming soon'}</p>
            <button className="coming-soon-back" onClick={onBack}>
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                >
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                {t ? t('commands.back') : 'Back'}
            </button>
        </div>
    );
}
