import React from 'react';
import {
  LayoutGrid,
  ShoppingBag,
  UtensilsCrossed,
  ChefHat,
  Ticket,
  Boxes,
  Wallet,
  Users,
  UserCog,
  FileSpreadsheet,
  Settings,
  Building2,
  X,
} from 'lucide-react';
import { DepartmentName, NavSection, PermissionKey } from '../types/hospitality';
import { useHospitality } from '../context/HospitalityContext';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: PermissionKey;
  badgeCount?: number;
}

const DEPARTMENTS: DepartmentName[] = [
  'All Departments',
  'Main Restaurant',
  'Main Bar',
  'Outdoor Lounge',
  'Coffee Shop',
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  mobileOpen,
  onCloseMobile,
}) => {
  const { state, hasPermission, setActiveDepartment } = useHospitality();

  const kdsPendingCount = state.orders.filter(
    (o) => o.status === 'Confirmed' || o.status === 'In Preparation'
  ).length;
  const lowStockCount = state.stockItems.filter((item) => {
    const total = Object.values(item.quantities).reduce((a, b) => a + b, 0);
    return total <= item.minStockLevel;
  }).length;
  const activeBonosCount = state.bonos.filter((b) => b.status === 'Active').length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, permission: 'view_dashboard' },
    { id: 'pos', label: 'Cashier POS', icon: ShoppingBag, permission: 'pos_create' },
    ...(state.config.enableTableManagement
      ? [{ id: 'tables' as NavSection, label: 'Floor & Tables', icon: UtensilsCrossed, permission: 'pos_create' as PermissionKey }]
      : []),
    {
      id: 'kitchen',
      label: 'Kitchen Display',
      icon: ChefHat,
      permission: 'kds_manage',
      badgeCount: kdsPendingCount > 0 ? kdsPendingCount : undefined,
    },
    {
      id: 'bar-bonos',
      label: 'Bar & Bonos',
      icon: Ticket,
      permission: 'bar_redeem_bono',
      badgeCount: activeBonosCount > 0 ? activeBonosCount : undefined,
    },
    {
      id: 'inventory',
      label: 'Inventory & Recipes',
      icon: Boxes,
      permission: 'inventory_manage',
      badgeCount: lowStockCount > 0 ? lowStockCount : undefined,
    },
    { id: 'finance', label: 'Finance & Shifts', icon: Wallet, permission: 'finance_view' },
    { id: 'staff-audit', label: 'Staff & Audit', icon: Users, permission: 'staff_audit' },
    { id: 'users', label: 'User Management', icon: UserCog, permission: 'user_manage' },
    { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet, permission: 'reports_export' },
    { id: 'settings', label: 'Settings', icon: Settings, permission: 'settings_admin' },
  ];

  const visibleNav = navItems.filter((item) => {
    if (!item.permission) return true;
    // Also allow Cashiers to issue bonos in Bar & Bonos or view Finance Shifts if they have pos_create
    if (item.id === 'bar-bonos' && hasPermission('bono_issue')) return true;
    if (item.id === 'finance' && hasPermission('pos_create')) return true;
    return hasPermission(item.permission);
  });

  const content = (
    <aside className="flex h-full w-64 flex-col bg-[#181C24] text-slate-300 select-none">
      {/* Brand Zone */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FF5A1F] text-white">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-base font-bold tracking-tight text-white truncate">
              BelTech
            </div>
            <div className="text-xs text-slate-400 truncate">
              {state.config.hotelName}
            </div>
          </div>
        </div>
        <button
          onClick={onCloseMobile}
          className="lg:hidden rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Multi-Department Selector */}
      <div className="px-4 pt-4 pb-2">
        <label
          htmlFor="dept-select"
          className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-400"
        >
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          <span>Active Sales Point</span>
        </label>
        <select
          id="dept-select"
          value={state.activeDepartment}
          onChange={(e) => setActiveDepartment(e.target.value as DepartmentName)}
          className="w-full rounded-lg border border-white/10 bg-[#232834] px-3 py-2 text-xs font-medium text-white outline-none focus:border-[#FF5A1F] transition-colors"
        >
          {DEPARTMENTS.map((dept) => (
            <option key={dept} value={dept} className="bg-[#181C24] text-white">
              {dept}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1" aria-label="Primary Navigation">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#232834] text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#FF5A1F]' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badgeCount !== undefined && (
                <span
                  className={`ml-2 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
                    isActive
                      ? 'bg-[#FF5A1F] text-white'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {item.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quiet Footer */}
      <div className="border-t border-white/10 px-5 py-3.5 text-[11px] text-slate-400">
        <div className="truncate font-medium text-slate-300">{state.config.branchName}</div>
        <div className="truncate text-slate-500">BelTech Hospitality Suite</div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block lg:shrink-0">{content}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px]"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
};
