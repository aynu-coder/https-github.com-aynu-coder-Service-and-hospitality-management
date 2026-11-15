import React, { useMemo, useState } from 'react';
import { CheckCircle2, Plus, Lock, AlertTriangle } from 'lucide-react';
import { useHospitality } from '../context/HospitalityContext';
import {
  DepartmentName,
  ExpenseCategory,
  PaymentMethod,
} from '../types/hospitality';
import { formatDateTimeShort, formatMoney } from '../utils/formatters';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food Purchases',
  'Beverage Purchases',
  'Employee Expenses',
  'Utilities',
  'Maintenance',
  'Transportation',
  'Rent',
  'Operational',
];

export const FinanceView: React.FC = () => {
  const {
    state,
    currentEmployee,
    hasPermission,
    openCashierShift,
    closeCashierShift,
    approveCashierShift,
    addExpense,
  } = useHospitality();

  // Open Shift form
  const [openingFloat, setOpeningFloat] = useState('2000');
  const [shiftDept, setShiftDept] =
    useState<Exclude<DepartmentName, 'All Departments'>>('Main Restaurant');
  const [shiftMsg, setShiftMsg] = useState<string | null>(null);

  // Close Shift Modal
  const [closingShiftId, setClosingShiftId] = useState<string | null>(null);
  const [actualCashInput, setActualCashInput] = useState('');
  const [closingNote, setClosingNote] = useState('');

  // Add Expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expCat, setExpCat] = useState<ExpenseCategory>('Food Purchases');
  const [expDept, setExpDept] =
    useState<Exclude<DepartmentName, 'All Departments'>>('Main Restaurant');
  const [expMethod, setExpMethod] = useState<Exclude<PaymentMethod, 'Bono Voucher'>>('Bank Transfer');
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');

  const canViewFinancials = hasPermission('finance_view');

  const pnl = useMemo(() => {
    const validOrders = state.orders.filter((o) => o.status !== 'Cancelled');
    const revenue = validOrders.reduce((s, o) => s + o.totalAmount, 0);
    const cogs = validOrders.reduce((s, o) => s + o.totalCost, 0);
    const grossProfit = revenue - cogs;
    const totalExpenses = state.expenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;
    const creditOutstanding = validOrders
      .flatMap((o) => o.payments)
      .filter((p) => p.method === 'Credit / Deferred')
      .reduce((s, p) => s + p.amount, 0);
    return { revenue, cogs, grossProfit, totalExpenses, netProfit, creditOutstanding };
  }, [state.orders, state.expenses]);

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const res = openCashierShift(Number(openingFloat) || 0, shiftDept);
    setShiftMsg(res.message);
  };

  const handleCloseShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingShiftId) return;
    closeCashierShift(closingShiftId, Number(actualCashInput) || 0, closingNote);
    setClosingShiftId(null);
    setActualCashInput('');
    setClosingNote('');
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expAmount);
    if (!amt || amt <= 0) return;
    addExpense({
      category: expCat,
      department: expDept,
      amount: amt,
      paymentMethod: expMethod,
      description: expDesc || expCat,
    });
    setExpAmount('');
    setExpDesc('');
    setShowExpenseForm(false);
  };

  return (
    <div className="space-y-6">
      {/* P&L Summary (Restricted to roles with finance_view permission) */}
      {canViewFinancials ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
            <div className="text-xs font-medium text-slate-500">Recorded Revenue</div>
            <div className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
              {formatMoney(pnl.revenue, state.config)}
            </div>
          </div>
          <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
            <div className="text-xs font-medium text-slate-500">Cost of Goods (COGS)</div>
            <div className="mt-1 font-mono text-xl font-bold text-slate-700 tabular-nums">
              {formatMoney(pnl.cogs, state.config)}
            </div>
          </div>
          <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
            <div className="text-xs font-medium text-slate-500">Gross Profit</div>
            <div className="mt-1 font-mono text-xl font-bold text-emerald-700 tabular-nums">
              {formatMoney(pnl.grossProfit, state.config)}
            </div>
          </div>
          <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
            <div className="text-xs font-medium text-slate-500">Operating Expenses</div>
            <div className="mt-1 font-mono text-xl font-bold text-red-600 tabular-nums">
              {formatMoney(pnl.totalExpenses, state.config)}
            </div>
          </div>
          <div className="col-span-2 lg:col-span-1 rounded-xl border border-[#E8ECF2] bg-white p-4">
            <div className="text-xs font-medium text-slate-500">Net Profit</div>
            <div
              className={`mt-1 font-mono text-xl font-bold tabular-nums ${
                pnl.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {formatMoney(pnl.netProfit, state.config)}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
          <Lock className="h-4 w-4 text-slate-400 shrink-0" />
          <span>
            Company P&amp;L and expense reports are restricted for <strong>{currentEmployee.role}</strong>. You can manage your personal cashier shift below.
          </span>
        </div>
      )}

      {/* Cashier Shift Management & Cash Reconciliation */}
      <div className="rounded-xl border border-[#E8ECF2] bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8ECF2] pb-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Cashier Shift Reconciliation
            </h2>
            <p className="text-xs text-slate-500">
              Expected Cash = Opening Balance + Cash Sales − Refunds · Discrepancies require Supervisor review
            </p>
          </div>

          <form onSubmit={handleOpenShift} className="flex flex-wrap items-center gap-2">
            <select
              value={shiftDept}
              onChange={(e) =>
                setShiftDept(e.target.value as Exclude<DepartmentName, 'All Departments'>)
              }
              className="rounded-lg border border-[#E8ECF2] px-2.5 py-2 text-xs"
            >
              <option value="Main Restaurant">Main Restaurant</option>
              <option value="Main Bar">Main Bar</option>
              <option value="Outdoor Lounge">Outdoor Lounge</option>
              <option value="Coffee Shop">Coffee Shop</option>
            </select>
            <input
              type="number"
              min={0}
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
              placeholder="Opening float"
              className="w-28 rounded-lg border border-[#E8ECF2] px-2.5 py-2 font-mono text-xs"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#FF5A1F] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#E64A12] whitespace-nowrap"
            >
              Open My Shift
            </button>
          </form>
        </div>

        {shiftMsg && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            {shiftMsg}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E8ECF2] text-[11px] font-semibold text-slate-500">
                <th className="py-2 pr-3">Shift</th>
                <th className="py-2 px-3">Cashier / Dept</th>
                <th className="py-2 px-3 text-right">Opening</th>
                <th className="py-2 px-3 text-right">Cash Sales</th>
                <th className="py-2 px-3 text-right">Digital Sales</th>
                <th className="py-2 px-3 text-right">Expected Cash</th>
                <th className="py-2 px-3 text-right">Actual Cash</th>
                <th className="py-2 px-3 text-right">Difference</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 pl-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {state.shifts
                .filter((s) => canViewFinancials || s.cashierId === currentEmployee.id)
                .map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-3 font-mono font-semibold text-slate-900">{s.id}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{s.cashierName}</div>
                      <div className="text-[11px] text-slate-500">
                        {s.department} · {formatDateTimeShort(s.openedAt)}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {formatMoney(s.openingCash, state.config)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {formatMoney(s.cashSales, state.config)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {formatMoney(s.digitalSales, state.config)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatMoney(s.expectedCash, state.config)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {s.actualCash !== undefined ? formatMoney(s.actualCash, state.config) : '—'}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono font-bold tabular-nums ${
                        s.cashDifference === undefined
                          ? 'text-slate-400'
                          : s.cashDifference === 0
                          ? 'text-emerald-700'
                          : 'text-red-600'
                      }`}
                    >
                      {s.cashDifference !== undefined
                        ? formatMoney(s.cashDifference, state.config)
                        : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${
                          s.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : s.status === 'Pending Approval'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 pl-3 text-right whitespace-nowrap">
                      {s.status === 'Open' && (
                        <button
                          onClick={() => {
                            setClosingShiftId(s.id);
                            setActualCashInput(String(s.expectedCash));
                          }}
                          className="rounded-md bg-[#181C24] px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          Close Shift
                        </button>
                      )}
                      {s.status === 'Pending Approval' && hasPermission('shift_approve') && (
                        <button
                          onClick={() => approveCashierShift(s.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Management Ledger */}
      {canViewFinancials && (
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Expense Management Ledger
              </h2>
              <p className="text-xs text-slate-500">
                Outstanding Credit / Folio Balances: {formatMoney(pnl.creditOutstanding, state.config)}
              </p>
            </div>
            {hasPermission('finance_expenses') && (
              <button
                onClick={() => setShowExpenseForm((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg bg-[#181C24] px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Record Expense
              </button>
            )}
          </div>

          {showExpenseForm && (
            <form
              onSubmit={handleAddExpense}
              className="grid grid-cols-1 gap-3 rounded-xl border border-[#E8ECF2] bg-[#F7F8FA] p-4 sm:grid-cols-5"
            >
              <select
                value={expCat}
                onChange={(e) => setExpCat(e.target.value as ExpenseCategory)}
                className="rounded-lg border border-[#E8ECF2] bg-white px-2.5 py-2 text-xs"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={expDept}
                onChange={(e) =>
                  setExpDept(e.target.value as Exclude<DepartmentName, 'All Departments'>)
                }
                className="rounded-lg border border-[#E8ECF2] bg-white px-2.5 py-2 text-xs"
              >
                <option value="Main Restaurant">Main Restaurant</option>
                <option value="Main Bar">Main Bar</option>
                <option value="Outdoor Lounge">Outdoor Lounge</option>
                <option value="Coffee Shop">Coffee Shop</option>
              </select>
              <select
                value={expMethod}
                onChange={(e) =>
                  setExpMethod(e.target.value as Exclude<PaymentMethod, 'Bono Voucher'>)
                }
                className="rounded-lg border border-[#E8ECF2] bg-white px-2.5 py-2 text-xs"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="POS / Card">POS / Card</option>
              </select>
              <input
                type="number"
                required
                min={1}
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder="Amount"
                className="rounded-lg border border-[#E8ECF2] bg-white px-2.5 py-2 font-mono text-xs"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="Description"
                  className="flex-1 rounded-lg border border-[#E8ECF2] bg-white px-2.5 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
                >
                  Save
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E8ECF2] text-[11px] font-semibold text-slate-500">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Department</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Payment Method</th>
                  <th className="py-2 px-3">Recorded By</th>
                  <th className="py-2 pl-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {state.expenses.map((ex) => (
                  <tr key={ex.id}>
                    <td className="py-2.5 pr-3 font-mono text-slate-500">
                      {formatDateTimeShort(ex.date)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{ex.category}</td>
                    <td className="py-2.5 px-3 text-slate-600">{ex.department}</td>
                    <td className="py-2.5 px-3 text-slate-700">{ex.description}</td>
                    <td className="py-2.5 px-3 text-slate-600">{ex.paymentMethod}</td>
                    <td className="py-2.5 px-3 text-slate-600">{ex.recordedByName}</td>
                    <td className="py-2.5 pl-3 text-right font-mono font-bold text-red-600 tabular-nums">
                      -{formatMoney(ex.amount, state.config)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {closingShiftId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleCloseShiftSubmit}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4"
          >
            <h3 className="font-display text-base font-bold text-slate-900">
              Submit Cashier Shift Closing ({closingShiftId})
            </h3>
            {(() => {
              const shf = state.shifts.find((s) => s.id === closingShiftId);
              if (!shf) return null;
              const diff = (Number(actualCashInput) || 0) - shf.expectedCash;
              return (
                <div className="rounded-lg bg-[#F7F8FA] p-3 text-xs space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Expected Cash in Drawer:</span>
                    <span className="font-bold">{formatMoney(shf.expectedCash, state.config)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Calculated Difference:</span>
                    <span className={`font-bold ${diff === 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatMoney(diff, state.config)}
                    </span>
                  </div>
                  {diff !== 0 && (
                    <div className="flex items-center gap-1.5 pt-1 text-amber-800 font-sans">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Discrepancy will notify Supervisor &amp; Accountant.</span>
                    </div>
                  )}
                </div>
              );
            })()}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Actual Counted Cash
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={actualCashInput}
                onChange={(e) => setActualCashInput(e.target.value)}
                className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Closing Note (Optional)
              </label>
              <input
                type="text"
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                placeholder="Explain any variance if applicable"
                className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setClosingShiftId(null)}
                className="rounded-lg border border-[#E8ECF2] px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#FF5A1F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#E64A12]"
              >
                Submit Shift for Review
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
