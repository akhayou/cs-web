import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useTranslation } from '../utils/i18n.js';
import Sidebar from './MainPage/Sidebar.jsx';
import Topbar from './MainPage/Topbar.jsx';
import HomePage from './HomePage.jsx';
import Commands from './HomePage/Commands.jsx';
import PageRouter from './router/PageRouter.jsx';
import './MainPage/MainPage.css';
import '../assest/styles/Phosphor.css';

// ── Helpers ───────────────────────────────────────────────────
const findPath = (tree, targetId, path = []) => {
    for (const node of tree) {
        if (String(node.id) === String(targetId)) return [...path, node];
        if (node.children) {
            const result = findPath(node.children, targetId, [...path, node]);
            if (result) return result;
        }
    }
    return null;
};

// Change this helper to look for 'item'
const getItemFromUrl = () => new URLSearchParams(window.location.search).get('item');
// Add a helper for the 'node' (the page)
const getNodeFromUrl = () => new URLSearchParams(window.location.search).get('node');

// Drill sidebar to match a parent stack (no animation)
const syncSidebar = (ref, parents) => {
    setTimeout(() => {
        ref.current?.resetToRoot();
        parents.forEach((node) => {
            if (node.children?.length) ref.current?.drillInById?.(node.id);
        });
    }, 50);
};

export default function MainPage() {
    const { username, menuTree, logout, isDark, setIsDark, onlyIcons, setOnlyIcons, language, setLanguage } = useApp();
    const t = useTranslation(language);
    const isRTL = language === 'ar-SY';

    const menuRef = useRef();
    const restored = useRef(false); // prevent double-restore

    // ── URL item key (for ListPanel default selection) ────────
    const [selectedKey, setSelectedKey] = useState(getItemFromUrl);

    // ── Active leaf (persisted in sessionStorage) ─────────────
    const [activeLeaf, setActiveLeaf] = useState(() => {
        try {
            const saved = sessionStorage.getItem('activeLeaf');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    // ── Parent stack ──────────────────────────────────────────
    const [nodeStack, setNodeStack] = useState([]);

    // ── Restore nav state when menuTree loads ─────────────────
    // Priority: URL ?item=ID > sessionStorage activeLeaf
    useEffect(() => {
        if (!menuTree?.length || restored.current) return;
        restored.current = true;

        const urlNodeId = getNodeFromUrl(); // Identify which PAGE to open
        const urlItemId = getItemFromUrl(); // Identify which RECORD to select

        // Priority: URL node > session activeLeaf
        const targetNodeId = urlNodeId ?? activeLeaf?.id;
        if (!targetNodeId) return;

        const path = findPath(menuTree, targetNodeId);
        if (!path) return;

        const leaf = path[path.length - 1];
        const parents = path.slice(0, -1);

        setActiveLeaf(leaf);
        setNodeStack(parents);

        // This 'selectedKey' is passed to the PageRouter and then to ListPanel
        setSelectedKey(urlItemId);

        syncSidebar(menuRef, parents);
    }, [menuTree]);

    // ── Persist activeLeaf to sessionStorage ──────────────────
    useEffect(() => {
        if (activeLeaf) {
            sessionStorage.setItem('activeLeaf', JSON.stringify(activeLeaf));
        } else {
            sessionStorage.removeItem('activeLeaf');
        }
    }, [activeLeaf]);

    // ── Browser back / forward ────────────────────────────────
    useEffect(() => {
        const handlePopState = (e) => {
            const state = e.state;

            if (!state || !menuTree?.length) {
                // Back past our app → home
                setNodeStack([]);
                setActiveLeaf(null);
                setSelectedKey(null);
                menuRef.current?.resetToRoot();
                return;
            }

            // Restore leaf
            const leaf = state.leafId ? (findPath(menuTree, state.leafId)?.slice(-1)[0] ?? null) : null;

            // Restore stack
            const parents = (state.stackIds ?? []).map((id) => findPath(menuTree, id)?.slice(-1)[0]).filter(Boolean);

            setActiveLeaf(leaf);
            setNodeStack(parents);
            setSelectedKey(leaf ? String(leaf.id) : null);
            syncSidebar(menuRef, parents);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [menuTree]);

    // ── Resize ────────────────────────────────────────────────
    const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 600);
    useEffect(() => {
        const onResize = () => setIsSmallScreen(window.innerWidth < 600);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const [drawerOpen, setDrawerOpen] = useState(false);

    const activeMenuNode = nodeStack.length > 0 ? nodeStack[nodeStack.length - 1] : null;
    const currentPage = activeLeaf
        ? t(`router.${activeLeaf.id}`)
        : activeMenuNode
          ? t(`router.${activeMenuNode.id}`)
          : t('home');

    // ── Push history entry ────────────────────────────────────
    const pushHistory = (leaf, stack, recordId = null) => {
        const state = {
            leafId: leaf?.id ?? null,
            stackIds: stack.map((n) => n.id),
        };

        const params = new URLSearchParams();
        if (leaf) params.set('node', leaf.id);
        if (recordId) params.set('item', recordId);

        const queryString = params.toString();
        const url = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;

        window.history.pushState(state, '', url);
    };

    // ── Single navigation entry point ─────────────────────────
    const handleNavigate = (node) => {
        if (!node) {
            // Go home
            setNodeStack([]);
            setActiveLeaf(null);
            setSelectedKey(null);
            menuRef.current?.resetToRoot();
            pushHistory(null, []);
        } else if (node.children?.length > 0) {
            // Parent node — drill in or back to ancestor
            setActiveLeaf(null);
            setSelectedKey(null);

            const existingIndex = nodeStack.findIndex((n) => n.id === node.id);
            if (existingIndex !== -1) {
                // Going back to ancestor
                const newStack = nodeStack.slice(0, existingIndex + 1);
                const levelsBack = nodeStack.length - 1 - existingIndex;
                setNodeStack(newStack);
                for (let i = 0; i < levelsBack; i++) menuRef.current?.drillOut();
                pushHistory(null, newStack);
            } else {
                // Drilling into new level
                const newStack = [...nodeStack, node];
                setNodeStack(newStack);
                pushHistory(null, newStack);
            }
        } else {
            // Leaf node — show page
            setActiveLeaf(node);
            setSelectedKey(null); // Clear previous selection when switching nodes
            pushHistory(node, nodeStack);
        }

        if (isSmallScreen) setDrawerOpen(false);
    };

    // ── Back ──────────────────────────────────────────────────
    const handleBack = () => {
        // Always use browser history — popstate handler restores state
        window.history.back();
    };

    // ── Go home ───────────────────────────────────────────────
    const handleGoHome = () => {
        setNodeStack([]);
        setActiveLeaf(null);
        setSelectedKey(null);
        menuRef.current?.resetToRoot();
        pushHistory(null, []);
    };

    // ── Render content ────────────────────────────────────────
    const renderContent = () => {
        if (activeLeaf) {
            return (
                <PageRouter
                    nodeId={activeLeaf.id}
                    t={t}
                    isMobile={isSmallScreen}
                    onBack={handleBack}
                    logout={logout}
                    isRTL={isRTL}
                    routerKey={selectedKey}
                />
            );
        }

        if (activeMenuNode) {
            return (
                <div className="home-main">
                    <button className="submenu-back-btn" onClick={handleBack}>
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
                        <span>
                            {nodeStack.length > 1 ? t(`router.${nodeStack[nodeStack.length - 2].id}`) : t('home')}
                        </span>
                    </button>
                    <Commands commands={activeMenuNode.children} onNavigate={handleNavigate} t={t} isFavorite={false} />
                </div>
            );
        }

        return (
            <HomePage menuTree={menuTree} t={t} isMobile={isSmallScreen} logout={logout} onNavigate={handleNavigate} />
        );
    };

    return (
        <div className={`app-shell ${isDark ? '' : 'light-theme'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <Sidebar
                ref={menuRef}
                menuTree={menuTree}
                onlyIcons={onlyIcons}
                setOnlyIcons={setOnlyIcons}
                t={t}
                isMobile={isSmallScreen}
                drawerOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onNavigate={handleNavigate}
            />

            <div className="main-area">
                <Topbar
                    username={username}
                    currentPage={currentPage}
                    language={language}
                    setLanguage={setLanguage}
                    isDark={isDark}
                    setIsDark={setIsDark}
                    logout={logout}
                    t={t}
                    isMobile={isSmallScreen}
                    onGoHome={handleGoHome}
                    onHamburgerClick={() => setDrawerOpen(true)}
                />

                <main className="content">
                    <div className="home-body">{renderContent()}</div>
                </main>
            </div>
        </div>
    );
}
