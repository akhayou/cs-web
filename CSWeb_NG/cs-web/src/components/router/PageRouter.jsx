/**
 * PageRouter.jsx
 *
 * Maps leaf node IDs to their page components.
 * To add a new page:
 *   1. Create the component in src/pages/
 *   2. Import it here
 *   3. Add an entry to PAGE_MAP
 *
 * Any ID not in PAGE_MAP automatically shows <ComingSoon />.
 */

import ComingSoon from './ComingSoon.jsx';
import DescriptorsPage from '../pages/DescriptorsPage.jsx';
import UsersPage from '../pages/UsersPage.jsx';
import AccountsPage from '../pages/AccountsPage.jsx';
import MaterialsPage from '../pages/MaterialsPage.jsx';
import MunimentsPage from '../pages/MunimentsPage.jsx';

const PAGE_MAP = {
    // ── General ──────────────────────────────────────────────
    descriptors: DescriptorsPage,
    users: UsersPage,
    muniments: MunimentsPage,
    // srvBill:          SrvBillPage,

    // ── Agenda ───────────────────────────────────────────────
    // contacts:         ContactsPage,

    // ── Accounting ───────────────────────────────────────────
    accounts: AccountsPage,
    // subAccounts:      SubAccountsPage,
    // currencies:       CurrenciesPage,
    // cashVouchers:     CashVouchersPage,
    // BranchVoucher:    BranchVoucherPage,
    // Voucher:          VoucherPage,
    // CashVoucher:      CashVoucherPage,
    // CurDiffVoucher:   CurDiffVoucherPage,
    // OpenVoucher:      OpenVoucherPage,
    // CreditPayment:    CreditPaymentPage,
    // DebitPayment:     DebitPaymentPage,
    // repVouItems:      RepVouItemsPage,
    // repAccBalances:   RepAccBalancesPage,
    // AccReconcilement: AccReconcilementPage,

    // ── Stock ─────────────────────────────────────────────────
    materials: MaterialsPage,
    // prices:           PricesPage,
    // unities:          UnitiesPage,
    // warehouses:       WarehousesPage,
    // categories:       CategoriesPage,
    // matClasses:       MatClassesPage,
    // taxes:            TaxesPage,
    // BuyBill:          BuyBillPage,
    // RetBuyBill:       RetBuyBillPage,
    // SaleBill:         SaleBillPage,
    // RetSaleBill:      RetSaleBillPage,
    // OpenBill:         OpenBillPage,
    // TransBill:        TransBillPage,
};

export default function PageRouter({ nodeId, t, isMobile, onBack, logout, isRTL, routerKey }) {
    const PageComponent = PAGE_MAP[nodeId];

    if (PageComponent) {
        return (
            <PageComponent
                nodeId={nodeId}
                t={t}
                isMobile={isMobile}
                onBack={onBack}
                logout={logout}
                isRTL={isRTL}
                routerKey={routerKey}
            />
        );
    }

    return (
        <ComingSoon
            nodeId={nodeId}
            t={t}
            isMobile={isMobile}
            onBack={onBack}
            logout={logout}
            isRTL={isRTL}
            routerKey={routerKey}
        />
    );
}
