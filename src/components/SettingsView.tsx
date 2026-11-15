import React, { useState } from 'react';
import { RotateCcw, Save, CheckCircle2 } from 'lucide-react';
import { useHospitality } from '../context/HospitalityContext';
import { PermissionKey, UserRole } from '../types/hospitality';

const ALL_ROLES: UserRole[] = [
  'System Administrator',
  'Hotel Manager',
  'Cashier',
  'Barman',
  'Kitchen Staff',
  'Storekeeper',
  'Accountant',
  'Supervisor',
];

const PERMISSION_LABELS: { key: PermissionKey; label: string }[] = [
  { key: 'view_dashboard', label: 'Management Dashboard' },
  { key: 'pos_create', label: 'Create POS Orders' },
  { key: 'pos_cancel', label: 'Cancel Orders' },
  { key: 'kds_manage', label: 'Kitchen Display (KDS)' },
  { key: 'bar_redeem_bono', label: 'Redeem Bonos (Bar)' },
  { key: 'bono_issue', label: 'Issue New Bonos' },
  { key: 'inventory_manage', label: 'Manage Stock & Recipes' },
  { key: 'finance_view', label: 'View P&L & Finance' },
  { key: 'finance_expenses', label: 'Record Expenses' },
  { key: 'shift_approve', label: 'Approve Cashier Shifts' },
  { key: 'reports_export', label: 'Export Reports' },
  { key: 'staff_audit', label: 'Staff & Audit Logs' },
  { key: 'user_manage', label: 'Manage Users & Employees' },
  { key: 'settings_admin', label: 'System Settings' },
];

export const SettingsView: React.FC = () => {
  const { state, updateConfig, toggleRolePermission, updateEmployeePassword, resetDemoData } =
    useHospitality();
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [pwSavedId, setPwSavedId] = useState<string | null>(null);
  const [hotelName, setHotelName] = useState(state.config.hotelName);
  const [branchName, setBranchName] = useState(state.config.branchName);
  const [address, setAddress] = useState(state.config.address);
  const [phone, setPhone] = useState(state.config.phone);
  const [currencyCode, setCurrencyCode] = useState(state.config.currencyCode);
  const [taxRate, setTaxRate] = useState(String(state.config.taxRatePercent));
  const [serviceCharge, setServiceCharge] = useState(String(state.config.serviceChargePercent));
  const [enableTables, setEnableTables] = useState(state.config.enableTableManagement);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const symbolMap = { ETB: 'ETB ', USD: '$', EUR: '€' };
    updateConfig({
      hotelName,
      branchName,
      address,
      phone,
      currencyCode,
      currencySymbol: symbolMap[currencyCode],
      taxRatePercent: Number(taxRate) || 0,
      serviceChargePercent: Number(serviceCharge) || 0,
      enableTableManagement: enableTables,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Property & SaaS Tenant Configuration */}
      <form
        onSubmit={handleSave}
        className="rounded-xl border border-[#E8ECF2] bg-white p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8ECF2] pb-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Property &amp; SaaS Platform Configuration
            </h2>
            <p className="text-xs text-slate-500">
              Configure hotel identity, currency, taxes, and operational modules
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetDemoData}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Demo Data
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-[#FF5A1F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#E64A12]"
            >
              <Save className="h-3.5 w-3.5" />
              Save Configuration
            </button>
          </div>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            Property configuration updated and logged to audit trail.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Hotel / Hospitality Name
            </label>
            <input
              type="text"
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Branch Name
            </label>
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Business Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 font-mono text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Platform Currency
            </label>
            <select
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value as 'ETB' | 'USD' | 'EUR')}
              className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs font-medium"
            >
              <option value="ETB">ETB (Ethiopian Birr)</option>
              <option value="USD">USD ($ US Dollar)</option>
              <option value="EUR">EUR (€ Euro)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">VAT / Tax %</label>
              <input
                type="number"
                step="0.5"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 font-mono text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Service %</label>
              <input
                type="number"
                step="0.5"
                value={serviceCharge}
                onChange={(e) => setServiceCharge(e.target.value)}
                className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 font-mono text-xs"
              />
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 pt-1">
          <input
            type="checkbox"
            checked={enableTables}
            onChange={(e) => setEnableTables(e.target.checked)}
            className="h-4 w-4 rounded accent-[#FF5A1F]"
          />
          Enable Floor &amp; Table Management Module (disable for quick-service counter POS)
        </label>
      </form>

      {/* Role-Based Access Control Matrix */}
      <div className="rounded-xl border border-[#E8ECF2] bg-white p-6 space-y-4">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            Role-Based Access Control Matrix
          </h2>
          <p className="text-xs text-slate-500">
            Configure operational permissions per hospitality role (changes apply immediately)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E8ECF2] text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 pr-4">Permission</th>
                {ALL_ROLES.map((role) => (
                  <th key={role} className="py-2.5 px-2 text-center whitespace-nowrap">
                    {role.replace('System Administrator', 'Sys Admin').replace('Hotel Manager', 'Manager')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {PERMISSION_LABELS.map((perm) => (
                <tr key={perm.key} className="hover:bg-slate-50/70">
                  <td className="py-2.5 pr-4 font-medium text-slate-800 whitespace-nowrap">
                    {perm.label}
                  </td>
                  {ALL_ROLES.map((role) => {
                    const checked = state.config.rolePermissions[role]?.includes(perm.key);
                    return (
                      <td key={role} className="py-2.5 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(checked)}
                          disabled={role === 'System Administrator' && perm.key === 'settings_admin'}
                          onChange={() => toggleRolePermission(role, perm.key)}
                          className="h-4 w-4 rounded accent-[#FF5A1F] cursor-pointer"
                          aria-label={`${perm.label} for ${role}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Account Passwords */}
      <div className="rounded-xl border border-[#E8ECF2] bg-white p-6 space-y-4">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            Staff Login Credentials &amp; Password Management
          </h2>
          <p className="text-xs text-slate-500">
            Update employee passwords used to unlock the Dashboard and staff interfaces
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E8ECF2] text-[11px] font-semibold text-slate-500">
                <th className="py-2 pr-3">Employee</th>
                <th className="py-2 px-3">Role</th>
                <th className="py-2 px-3">Username</th>
                <th className="py-2 px-3">New Password</th>
                <th className="py-2 pl-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {state.employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="py-2.5 pr-3 font-semibold text-slate-900">{emp.name}</td>
                  <td className="py-2.5 px-3 text-slate-600">{emp.role}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-700">{emp.username}</td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={passwordDrafts[emp.id] ?? emp.password}
                      onChange={(e) =>
                        setPasswordDrafts((prev) => ({ ...prev, [emp.id]: e.target.value }))
                      }
                      className="w-40 rounded-lg border border-[#E8ECF2] px-2.5 py-1.5 font-mono text-xs"
                    />
                  </td>
                  <td className="py-2.5 pl-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        const nextPw = passwordDrafts[emp.id] ?? emp.password;
                        updateEmployeePassword(emp.id, nextPw);
                        setPwSavedId(emp.id);
                        setTimeout(() => setPwSavedId(null), 2000);
                      }}
                      className="rounded-lg bg-[#181C24] px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      {pwSavedId === emp.id ? 'Updated' : 'Save Password'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
