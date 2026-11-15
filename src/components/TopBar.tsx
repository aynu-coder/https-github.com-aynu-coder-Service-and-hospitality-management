import React, { useState } from 'react';
import {
  Bell,
  ChevronDown,
  Menu,
  CheckCheck,
  Shield,
  LogOut,
  UtensilsCrossed,
} from 'lucide-react';
import { DepartmentName, NavSection } from '../types/hospitality';
import { useHospitality } from '../context/HospitalityContext';
import { formatTimeShort } from '../utils/formatters';

interface TopBarProps {
  activeSection: NavSection;
  publicMode?: boolean;
  onOpenMobileMenu: () => void;
  onSelectSection: (section: NavSection) => void;
  onLogout: () => void;
}

const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: 'Dashboard',
  pos: 'Order & Cashier POS',
  tables: 'Floor & Table Management',
  kitchen: 'Kitchen Display System',
  'bar-bonos': 'Bar & Bono Console',
  inventory: 'Inventory & Recipes',
  finance: 'Finance & Cashier Shifts',
  'staff-audit': 'Staff Performance & Audit',
  users: 'User & Employee Management',
  reports: 'Reports & Export',
  settings: 'System Configuration',
};

const DEPARTMENTS: DepartmentName[] = [
  'All Departments',
  'Main Restaurant',
  'Main Bar',
  'Outdoor Lounge',
  'Coffee Shop',
];

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  publicMode = false,
  onOpenMobileMenu,
  onSelectSection,
  onLogout,
}) => {
  const {
    state,
    currentEmployee,
    switchEmployee,
    setActiveDepartment,
    markNotificationRead,
    markAllNotificationsRead,
  } = useHospitality();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const relevantNotifications = state.notifications.filter(
    (n) =>
      currentEmployee.role === 'System Administrator' ||
      currentEmployee.role === 'Hotel Manager' ||
      n.targetRoles.includes(currentEmployee.role)
  );
  const unreadCount = relevantNotifications.filter((n) => !n.read).length;

  const openShift = state.shifts.find(
    (s) =>
      s.status === 'Open' &&
      (s.cashierId === currentEmployee.id || s.department === state.activeDepartment)
  );

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleRoleSwitch = (empId: string) => {
    switchEmployee(empId);
    setProfileOpen(false);
    const emp = state.employees.find((e) => e.id === empId);
    if (!emp) return;
    if (emp.role === 'Kitchen Staff') onSelectSection('kitchen');
    else if (emp.role === 'Barman') onSelectSection('bar-bonos');
    else if (emp.role === 'Cashier') onSelectSection('pos');
    else if (emp.role === 'Storekeeper') onSelectSection('inventory');
    else if (emp.role === 'Accountant') onSelectSection('finance');
    else onSelectSection('dashboard');
  };

  if (publicMode || !state.isAuthenticated) {
    return (
      <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-[#4A312B] bg-[#2C1B17]/95 backdrop-blur-md px-4 py-3.5 sm:px-7">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#A8846F] text-[#2C1B17]">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold tracking-tight text-[#FAF6F0] truncate">
              {state.config.hotelName}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#D4C4B7]">
              <span>{formattedDate}</span>
              <span aria-hidden="true">·</span>
              <span>{state.activeDepartment}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{state.config.currencyCode}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <select
            aria-label="Filter department menu"
            value={state.activeDepartment}
            onChange={(e) => setActiveDepartment(e.target.value as DepartmentName)}
            className="rounded-lg border border-[#5C3E36] bg-[#3B2621] px-3 py-2 text-xs font-medium text-[#FAF6F0] outline-none focus:border-[#C49B82]"
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept} className="bg-[#2C1B17] text-[#FAF6F0]">
                {dept}
              </option>
            ))}
          </select>
        </div>
      </header>
    );
  }

  return (
    <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-[#E8ECF2] bg-white px-4 py-3.5 sm:px-7">
      {/* Left: Page Title + Unboxed Metadata */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden rounded-lg border border-[#E8ECF2] p-2 text-slate-600 hover:bg-slate-50"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight text-[#111827] truncate">
            {SECTION_TITLES[activeSection]}
          </h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
            <span>{formattedDate}</span>
            <span aria-hidden="true">·</span>
            <span>{state.activeDepartment}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{state.config.currencyCode}</span>
            {openShift && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 font-medium">
                  Shift Open ({openShift.cashierName})
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Notifications & Active Operator Menu */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setProfileOpen(false);
            }}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#E8ECF2] bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded bg-[#FF5A1F] px-1 font-mono text-[10px] font-semibold text-white tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-[#E8ECF2] bg-white shadow-lg z-50">
              <div className="flex items-center justify-between border-b border-[#E8ECF2] px-4 py-3">
                <span className="font-display text-sm font-semibold text-slate-900">
                  Department Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="flex items-center gap-1 text-xs font-medium text-[#FF5A1F] hover:underline"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-[#F1F5F9]">
                {relevantNotifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-500">
                    No active notifications for {currentEmployee.role}.
                  </div>
                ) : (
                  relevantNotifications.slice(0, 10).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                        !n.read ? 'bg-[#FFF9F6]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            n.severity === 'critical'
                              ? 'text-red-700'
                              : n.severity === 'warning'
                              ? 'text-amber-700'
                              : n.severity === 'success'
                              ? 'text-emerald-700'
                              : 'text-slate-900'
                          }`}
                        >
                          {n.title}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                          {formatTimeShort(n.timestamp)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">{n.message}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Employee Profile & Logout Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2.5 rounded-lg border border-[#E8ECF2] bg-white py-1.5 pl-2 pr-3 hover:bg-slate-50 transition-colors"
          >
            {currentEmployee.avatarUrl ? (
              <img
                src={currentEmployee.avatarUrl}
                alt={currentEmployee.name}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full object-cover bg-slate-100"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {currentEmployee.name
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                {currentEmployee.name}
              </div>
              <div className="text-[11px] text-slate-500 whitespace-nowrap">
                {currentEmployee.role}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl border border-[#E8ECF2] bg-white shadow-lg z-50">
              {(currentEmployee.role === 'System Administrator' ||
                currentEmployee.role === 'Hotel Manager') && (
                <>
                  <div className="border-b border-[#E8ECF2] px-4 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                      <Shield className="h-3.5 w-3.5 text-[#FF5A1F]" />
                      Switch Operator &amp; Role
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Preview another role view
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
                    {state.employees.map((emp) => {
                      const selected = emp.id === currentEmployee.id;
                      return (
                        <button
                          key={emp.id}
                          onClick={() => handleRoleSwitch(emp.id)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                            selected ? 'bg-[#FFF3EE] text-[#111827]' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{emp.name}</div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {emp.role} · {emp.department}
                            </div>
                          </div>
                          {selected && (
                            <span className="ml-2 text-[11px] font-semibold text-[#FF5A1F] shrink-0">
                              Active
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="border-t border-[#E8ECF2] p-2">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#181C24] px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5 text-[#FF5A1F]" />
                  Log Out to Order Page
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
