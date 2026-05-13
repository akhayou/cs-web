import BarChart from '../components/homepage/BarChart.jsx';
import PieChart from '../components/homepage/PieChart.jsx';
import FavoriteCommands from '../components/HomePage/FavoriteCommands.jsx';
import ClockPanel from '../components/HomePage/ClockPanel.jsx';
import '../assest/styles/App.css';

export default function HomePage({ menuTree = [], t, onNavigate, isMobile, logout, isRTL }) {
    const getLeafNodes = (menu = []) => {
        const leaves = [];
        const traverse = (nodes) => {
            nodes.forEach((node) => {
                // Check if node has non-empty children
                if (node.children && node.children.length > 0) {
                    traverse(node.children);
                } else {
                    // In React/JS, we ensure we only push if it's a true leaf
                    leaves.push({
                        id: node.id,
                        icon: node.icons,
                        command: node.id,
                    });
                }
            });
        };

        traverse(menu);
        return leaves;
    };

    const availableCommands = getLeafNodes(menuTree);

    // const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <>
            <div className="home-main">
                <FavoriteCommands availableCommands={availableCommands} t={t} onNavigate={onNavigate} isRTL={isRTL} />
                <div>
                    <p className="section-title">{t('dashboards')}</p>
                    <div className="charts-grid">
                        <div className="chart-card">
                            <div className="chart-title">{t('salesSummary')}</div>
                            <div className="chart-body">
                                <BarChart t={t} />
                            </div>
                        </div>
                        <div className="chart-card">
                            <div className="chart-title">{t('inventoryStatus')}</div>
                            <div className="chart-body">
                                <PieChart t={t} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ClockPanel is the second child: right in LTR, left in RTL */}
            <ClockPanel t={t} isMobile={isMobile} logout={logout} isRTL={isRTL} />
        </>
    );
}
