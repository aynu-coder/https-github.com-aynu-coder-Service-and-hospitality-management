import React, { useEffect, useState } from 'react';
import { HospitalityProvider, useHospitality } from './context/HospitalityContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { AdminLoginView } from './components/AdminLoginView';
import { DashboardView } from './components/DashboardView';
import { PosView } from './components/PosView';
import { TablesView } from './components/TablesView';
import { KdsView } from './components/KdsView';
import { BarBonoView } from './components/BarBonoView';
import { InventoryView } from './components/InventoryView';
import { FinanceView } from './components/FinanceView';
import { StaffAuditView } from './components/StaffAuditView';
import { UserManagementView } from './components/UserManagementView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { Employee, NavSection } from './types/hospitality';

function isAdminLocation(pathname: string, hash: string, search: string): boolean {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  if (
    normalizedPath === '/admin' ||
    normalizedPath.endsWith('/admin') ||
    normalizedPath.includes('/admin/')
  ) {
    return true;
  }

  const normalizedHash = hash.replace(/^#/, '').replace(/\/+$/, '');
  if (normalizedHash === '/admin' || normalizedHash === 'admin' || normalizedHash.startsWith('/admin/')) {
    return true;
  }

  const params = new URLSearchParams(search);
  const routeParam = params.get('route')?.replace(/\/+$/, '');
  if (params.has('admin') || routeParam === '/admin' || routeParam === 'admin') {
    return true;
  }

  return false;
}

const AppShell: React.FC = () => {
  const { state, hasPermission, logout } = useHospitality();
  const [locationState, setLocationState] = useState(() => ({
    pathname: window.location.pathname,
    hash: window.location.hash,
    search: window.location.search,
  }));
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [preselectedTableId, setPreselectedTableId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const syncLocation = () =>
      setLocationState({
        pathname: window.location.pathname,
        hash: window.location.hash,
        search: window.location.search,
      });
    window.addEventListener('popstate', syncLocation);
    window.addEventListener('hashchange', syncLocation);
    return () => {
      window.removeEventListener('popstate', syncLocation);
      window.removeEventListener('hashchange', syncLocation);
    };
  }, []);

  const navigate = (to: '/' | '/admin') => {
    if (window.location.pathname !== to || window.location.hash || window.location.search) {
      window.history.pushState({}, '', to);
    }
    setLocationState({ pathname: to, hash: '', search: '' });
    window.scrollTo({ top: 0 });
  };

  const adminRoute = isAdminLocation(
    locationState.pathname,
    locationState.hash,
    locationState.search
  );

  const handleOpenPosForTable = (tableId: string) => {
    setPreselectedTableId(tableId);
    setActiveSection('pos');
  };

  const handleLoginSuccess = (employee: Employee) => {
    const perms = state.config.rolePermissions[employee.role] || [];
    if (perms.includes('view_dashboard')) {
      setActiveSection('dashboard');
    } else if (perms.includes('kds_manage')) {
      setActiveSection('kitchen');
    } else if (perms.includes('bar_redeem_bono')) {
      setActiveSection('bar-bonos');
    } else if (perms.includes('inventory_manage')) {
      setActiveSection('inventory');
    } else if (perms.includes('finance_view')) {
      setActiveSection('finance');
    } else {
      setActiveSection('pos');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Main route (/): strictly public Order & Food Menu with NO login controls
  if (!adminRoute) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-[#F7F8FA] text-[#111827]">
        <TopBar
          activeSection="pos"
          publicMode
          onOpenMobileMenu={() => {}}
          onSelectSection={() => {}}
          onLogout={handleLogout}
        />
        <main className="flex-1">
          <PosView publicMode />
        </main>
      </div>
    );
  }

  // /admin route when not authenticated: render dedicated Admin Sign-In portal
  if (!state.isAuthenticated) {
    return (
      <AdminLoginView
        onSuccess={handleLoginSuccess}
        onBackToMenu={() => navigate('/')}
      />
    );
  }

  // /admin route when authenticated: render full Admin & Hospitality Management Console
  const resolvedSection: NavSection = (() => {
    if (activeSection === 'dashboard' && !hasPermission('view_dashboard')) {
      if (hasPermission('kds_manage')) return 'kitchen';
      if (hasPermission('bar_redeem_bono')) return 'bar-bonos';
      if (hasPermission('pos_create')) return 'pos';
      if (hasPermission('inventory_manage')) return 'inventory';
      if (hasPermission('finance_view')) return 'finance';
    }
    return activeSection;
  })();

  return (
    <div className="flex min-h-screen w-full bg-[#F7F8FA] text-[#111827]">
      <Sidebar
        activeSection={resolvedSection}
        onSelectSection={setActiveSection}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          activeSection={resolvedSection}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onSelectSection={setActiveSection}
          onLogout={handleLogout}
        />

        <main className={resolvedSection === 'pos' ? 'flex-1' : 'flex-1 p-4 sm:p-6 lg:p-7'}>
          {resolvedSection === 'dashboard' && <DashboardView onNavigate={setActiveSection} />}
          {resolvedSection === 'pos' && (
            <PosView
              preselectedTableId={preselectedTableId}
              onClearPreselectedTable={() => setPreselectedTableId(undefined)}
            />
          )}
          {resolvedSection === 'tables' && (
            <TablesView onOpenPosForTable={handleOpenPosForTable} />
          )}
          {resolvedSection === 'kitchen' && <KdsView />}
          {resolvedSection === 'bar-bonos' && <BarBonoView />}
          {resolvedSection === 'inventory' && <InventoryView />}
          {resolvedSection === 'finance' && <FinanceView />}
          {resolvedSection === 'staff-audit' && <StaffAuditView />}
          {resolvedSection === 'users' && <UserManagementView />}
          {resolvedSection === 'reports' && <ReportsView />}
          {resolvedSection === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <HospitalityProvider>
      <AppShell />
    </HospitalityProvider>
  );
}
