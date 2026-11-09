import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import { PageLoader } from './components/ui/Processing';
import { useAuth } from './contexts/AuthContext';
import { APP } from './lib/httpSurface';
import {
  AcceptInvitePage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from './pages/AuthMiscPages';
import { BillingChargesPage } from './pages/billing/BillingChargesPage';
import { BillingContractsPage } from './pages/billing/BillingContractsPage';
import { BillingLayout } from './pages/billing/BillingLayout';
import { BillingServicesPage } from './pages/billing/BillingServicesPage';
import { BillingTaxesPage } from './pages/billing/BillingTaxesPage';
import { DashboardPage } from './pages/DashboardPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { LoginPage } from './pages/LoginPage';
import { PartiesPage } from './pages/PartiesPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsAccountsPage } from './pages/settings/SettingsAccountsPage';
import { SettingsAsaasPage } from './pages/settings/SettingsAsaasPage';
import { SettingsCardsPage } from './pages/settings/SettingsCardsPage';
import { SettingsCategoriesPage } from './pages/settings/SettingsCategoriesPage';
import { SettingsCompanyPage } from './pages/settings/SettingsCompanyPage';
import { SettingsCostCentersPage } from './pages/settings/SettingsCostCentersPage';
import { SettingsLayout } from './pages/settings/SettingsLayout';
import { TransactionsPage } from './pages/TransactionsPage';
import { UsersPage } from './pages/UsersPage';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <PageLoader active />;
  }
  if (!user) return <Navigate to={APP.login} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={APP.home} replace />;
  return children;
}

function AdminRoute({ children }) {
  return (
    <PrivateRoute roles={['OWNER', 'ADMIN']}>
      {children}
    </PrivateRoute>
  );
}

export function App() {
  return (
    <Routes>
      <Route path={APP.login} element={<LoginPage />} />
      <Route path={APP.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path={APP.resetPassword} element={<ResetPasswordPage />} />
      <Route path={APP.acceptInvite} element={<AcceptInvitePage />} />
      <Route
        path={APP.home}
        element={
          <PrivateRoute>
            <Shell />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="p" element={<ProfilePage />} />
        <Route
          path="m"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="c"
          element={
            <AdminRoute>
              <PartiesPage />
            </AdminRoute>
          }
        />
        <Route
          path="n"
          element={
            <AdminRoute>
              <TransactionsPage />
            </AdminRoute>
          }
        />
        <Route
          path="n/i"
          element={
            <AdminRoute>
              <InvoicesPage />
            </AdminRoute>
          }
        />
        <Route
          path="f"
          element={
            <AdminRoute>
              <BillingLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to={APP.billingContracts} replace />} />
          <Route path="c" element={<BillingContractsPage />} />
          <Route path="h" element={<BillingChargesPage />} />
          <Route path="s" element={<BillingServicesPage />} />
          <Route path="t" element={<BillingTaxesPage />} />
        </Route>
        <Route
          path="s"
          element={
            <AdminRoute>
              <SettingsLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to={APP.settingsCompany} replace />} />
          <Route path="e" element={<SettingsCompanyPage />} />
          <Route path="n" element={<SettingsAsaasPage />} />
          <Route path="a" element={<SettingsAccountsPage />} />
          <Route path="k" element={<SettingsCardsPage />} />
          <Route path="g" element={<SettingsCategoriesPage />} />
          <Route path="o" element={<SettingsCostCentersPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={APP.home} replace />} />
    </Routes>
  );
}
