import React, { useMemo, useState } from 'react';
import {
  UserPlus,
  Search,
  Trash2,
  CheckCircle2,
  XCircle,
  KeyRound,
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useHospitality } from '../context/HospitalityContext';
import { DepartmentName, Employee, UserRole } from '../types/hospitality';

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

const DEPARTMENTS: Exclude<DepartmentName, 'All Departments'>[] = [
  'Main Restaurant',
  'Main Bar',
  'Outdoor Lounge',
  'Coffee Shop',
];

export const UserManagementView: React.FC = () => {
  const { state, currentEmployee, addEmployee, updateEmployee, deleteEmployee } = useHospitality();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | UserRole>('All');
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Employee form state
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Cashier');
  const [newDepartment, setNewDepartment] =
    useState<Exclude<DepartmentName, 'All Departments'>>('Main Restaurant');

  // Inline edits & confirmation state
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const filteredEmployees = useMemo(() => {
    return state.employees.filter((emp) => {
      const matchesRole = roleFilter === 'All' || emp.role === roleFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.username.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [state.employees, search, roleFilter]);

  const activeCount = state.employees.filter((e) => e.status === 'Active').length;
  const offDutyCount = state.employees.filter((e) => e.status === 'Off Duty').length;
  const adminCount = state.employees.filter(
    (e) => e.role === 'System Administrator' || e.role === 'Hotel Manager'
  ).length;

  const handleNameChange = (val: string) => {
    setNewName(val);
    if (!newUsername || newUsername === suggestUsername(newName)) {
      setNewUsername(suggestUsername(val));
    }
  };

  function suggestUsername(fullName: string): string {
    const parts = fullName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    return `${parts[0]}.${parts[parts.length - 1]}`;
  }

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addEmployee({
      name: newName,
      username: newUsername,
      password: newPassword,
      role: newRole,
      department: newDepartment,
    });
    if (!res.ok) {
      setFeedback({ ok: false, text: res.error || 'Failed to add employee.' });
      return;
    }
    setFeedback({
      ok: true,
      text: `Added employee ${res.employee?.name} (${res.employee?.username}) as ${res.employee?.role}.`,
    });
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setNewRole('Cashier');
    setNewDepartment('Main Restaurant');
    setShowAddForm(false);
  };

  const handleUpdateField = (
    emp: Employee,
    partial: Partial<Pick<Employee, 'name' | 'role' | 'department' | 'status' | 'password'>>,
    successMsg: string
  ) => {
    const res = updateEmployee(emp.id, partial);
    if (!res.ok) {
      setFeedback({ ok: false, text: res.error || 'Could not update employee.' });
      return;
    }
    setFeedback({ ok: true, text: successMsg });
  };

  const handleDeleteEmployee = (emp: Employee) => {
    const res = deleteEmployee(emp.id);
    if (!res.ok) {
      setFeedback({ ok: false, text: res.error || 'Could not delete employee.' });
      setConfirmDeleteId(null);
      return;
    }
    setFeedback({ ok: true, text: `Employee ${emp.name} (${emp.username}) deleted.` });
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Staff Accounts</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {state.employees.length}
          </div>
        </div>
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Active Employees</span>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {activeCount}
          </div>
        </div>
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Off Duty / Disabled</span>
            <UserX className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-amber-700 tabular-nums">
            {offDutyCount}
          </div>
        </div>
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Admins &amp; Managers</span>
            <ShieldCheck className="h-4 w-4 text-[#FF5A1F]" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {adminCount}
          </div>
        </div>
      </div>

      {/* Feedback Notice */}
      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-medium ${
            feedback.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.ok ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Toolbar & Add Employee Form */}
      <div className="rounded-xl border border-[#E8ECF2] bg-white p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Admin Employee &amp; User Directory
            </h2>
            <p className="text-xs text-slate-500">
              Add new employees, assign roles and departments, update login passwords, or delete staff accounts
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-[#FF5A1F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#E64A12] transition-colors whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4" />
            {showAddForm ? 'Close Add Form' : 'Add New Employee'}
          </button>
        </div>

        {/* Add Employee Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateEmployee}
            className="rounded-xl border border-[#E8ECF2] bg-[#F8FAFC] p-4 space-y-4"
          >
            <div className="text-xs font-bold text-slate-800">Create New Staff Account</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Samuel Bekele"
                  className="w-full rounded-lg border border-[#E8ECF2] bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#FF5A1F]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  Login Username
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. samuel.cashier"
                  className="w-full rounded-lg border border-[#E8ECF2] bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-[#FF5A1F]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  Initial Password
                </label>
                <input
                  type="text"
                  required
                  minLength={4}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 4 characters"
                  className="w-full rounded-lg border border-[#E8ECF2] bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-[#FF5A1F]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full rounded-lg border border-[#E8ECF2] bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-[#FF5A1F]"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  Department
                </label>
                <select
                  value={newDepartment}
                  onChange={(e) =>
                    setNewDepartment(e.target.value as Exclude<DepartmentName, 'All Departments'>)
                  }
                  className="w-full rounded-lg border border-[#E8ECF2] bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-[#FF5A1F]"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-[#E8ECF2] bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#181C24] px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Create Employee Account
              </button>
            </div>
          </form>
        )}

        {/* Search & Role Filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee name, username, or role..."
              className="w-full rounded-lg border border-[#E8ECF2] bg-white py-2 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-[#FF5A1F]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Filter Role:</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'All' | UserRole)}
              className="rounded-lg border border-[#E8ECF2] bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#FF5A1F]"
            >
              <option value="All">All Roles ({state.employees.length})</option>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Employees Management Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E8ECF2] text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 pr-3">Employee</th>
                <th className="py-2.5 px-3">Username</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Password</th>
                <th className="py-2.5 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    No employees match the current search or filter.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelf = emp.id === currentEmployee.id;
                  const initials = emp.name
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          {emp.avatarUrl ? (
                            <img
                              src={emp.avatarUrl}
                              alt={emp.name}
                              referrerPolicy="no-referrer"
                              className="h-8 w-8 rounded-full object-cover bg-slate-100 shrink-0"
                            />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#181C24] text-[11px] font-bold text-white">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {emp.name}
                              {isSelf && (
                                <span className="ml-1.5 text-[10px] font-semibold text-[#FF5A1F]">
                                  (You)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {emp.username}
                      </td>

                      <td className="py-3 px-3">
                        <select
                          aria-label={`Role for ${emp.name}`}
                          value={emp.role}
                          onChange={(e) =>
                            handleUpdateField(
                              emp,
                              { role: e.target.value as UserRole },
                              `Updated ${emp.name}'s role to ${e.target.value}.`
                            )
                          }
                          className="rounded-lg border border-[#E8ECF2] bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-[#FF5A1F]"
                        >
                          {ALL_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 px-3">
                        <select
                          aria-label={`Department for ${emp.name}`}
                          value={emp.department}
                          onChange={(e) =>
                            handleUpdateField(
                              emp,
                              {
                                department: e.target.value as Exclude<
                                  DepartmentName,
                                  'All Departments'
                                >,
                              },
                              `Assigned ${emp.name} to ${e.target.value}.`
                            )
                          }
                          className="rounded-lg border border-[#E8ECF2] bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-[#FF5A1F]"
                        >
                          {DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateField(
                              emp,
                              { status: emp.status === 'Active' ? 'Off Duty' : 'Active' },
                              `${emp.name} marked ${
                                emp.status === 'Active' ? 'Off Duty' : 'Active'
                              }.`
                            )
                          }
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                            emp.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {emp.status}
                        </button>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            aria-label={`Password for ${emp.name}`}
                            value={passwordDrafts[emp.id] ?? emp.password}
                            onChange={(e) =>
                              setPasswordDrafts((prev) => ({ ...prev, [emp.id]: e.target.value }))
                            }
                            className="w-28 rounded-lg border border-[#E8ECF2] bg-white px-2 py-1 font-mono text-xs text-slate-800 outline-none focus:border-[#FF5A1F]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const nextPw = passwordDrafts[emp.id] ?? emp.password;
                              handleUpdateField(
                                emp,
                                { password: nextPw },
                                `Password updated for ${emp.name}.`
                              );
                            }}
                            title="Save Password"
                            className="flex items-center gap-1 rounded-lg border border-[#E8ECF2] bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <KeyRound className="h-3 w-3" />
                            Save
                          </button>
                        </div>
                      </td>

                      <td className="py-3 pl-3 text-right whitespace-nowrap">
                        {confirmDeleteId === emp.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteEmployee(emp)}
                              className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-lg border border-[#E8ECF2] px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setConfirmDeleteId(emp.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
