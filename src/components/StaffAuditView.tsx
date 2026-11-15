import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield, Search } from 'lucide-react';
import { useHospitality } from '../context/HospitalityContext';
import { formatDateTimeShort, formatMoney } from '../utils/formatters';

export const StaffAuditView: React.FC = () => {
  const { state } = useHospitality();
  const [tab, setTab] = useState<'cashiers' | 'barmen' | 'audit'>('cashiers');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditModule, setAuditModule] = useState<string>('All');

  const cashierStats = useMemo(() => {
    const cashiers = state.employees.filter(
      (e) => e.role === 'Cashier' || e.role === 'Barman'
    );
    return cashiers.map((emp) => {
      const empOrders = state.orders.filter(
        (o) => o.cashierId === emp.id && o.status !== 'Cancelled'
      );
      const cancelledOrders = state.orders.filter(
        (o) => o.cashierId === emp.id && o.status === 'Cancelled'
      ).length;
      const totalSales = empOrders.reduce((s, o) => s + o.totalAmount, 0);
      const avgOrder = empOrders.length ? totalSales / empOrders.length : 0;
      const cashSales = empOrders
        .flatMap((o) => o.payments)
        .filter((p) => p.method === 'Cash')
        .reduce((s, p) => s + p.amount, 0);
      const digitalSales = totalSales - cashSales;
      const discrepancy = state.shifts
        .filter((s) => s.cashierId === emp.id && s.cashDifference !== undefined)
        .reduce((s, sh) => s + (sh.cashDifference || 0), 0);

      return {
        employee: emp,
        ordersCount: empOrders.length,
        totalSales,
        avgOrder,
        cashSales,
        digitalSales,
        cancelledOrders,
        discrepancy,
      };
    });
  }, [state.employees, state.orders, state.shifts]);

  const barmanStats = useMemo(() => {
    const barmen = state.employees.filter((e) => e.role === 'Barman');
    return barmen.map((emp) => {
      const redeemedBonos = state.bonos.filter((b) => b.redeemedById === emp.id);
      const paidOrders = state.orders.filter(
        (o) => o.cashierId === emp.id && o.status !== 'Cancelled'
      );
      const paidDrinksCount = paidOrders.reduce(
        (s, o) => s + o.items.reduce((is, it) => is + it.quantity, 0),
        0
      );
      const paidRevenue = paidOrders.reduce((s, o) => s + o.totalAmount, 0);
      const stockMovementsCount = state.stockMovements.filter(
        (m) => m.employeeId === emp.id
      ).length;

      return {
        employee: emp,
        bonosRedeemed: redeemedBonos.length,
        bonoValue: redeemedBonos.reduce((s, b) => s + b.valueAmount, 0),
        paidDrinksCount,
        paidRevenue,
        totalDrinksIssued: redeemedBonos.length + paidDrinksCount,
        stockMovementsCount,
      };
    });
  }, [state.employees, state.bonos, state.orders, state.stockMovements]);

  const filteredAudit = useMemo(() => {
    return state.auditLogs.filter((log) => {
      const okMod = auditModule === 'All' || log.module === auditModule;
      const q = auditSearch.trim().toLowerCase();
      const okSearch =
        !q ||
        log.userName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.reference.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q);
      return okMod && okSearch;
    });
  }, [state.auditLogs, auditModule, auditSearch]);

  return (
    <div className="space-y-6">
      {/* Segmented Tabs */}
      <div className="inline-flex rounded-lg border border-[#E8ECF2] bg-white p-1">
        <button
          onClick={() => setTab('cashiers')}
          className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
            tab === 'cashiers' ? 'bg-[#181C24] text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Cashier Performance
        </button>
        <button
          onClick={() => setTab('barmen')}
          className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
            tab === 'barmen' ? 'bg-[#181C24] text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Barman &amp; Bono Activity
        </button>
        <button
          onClick={() => setTab('audit')}
          className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
            tab === 'audit' ? 'bg-[#181C24] text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          Audit Trail ({state.auditLogs.length})
        </button>
      </div>

      {/* Cashier Comparison */}
      {tab === 'cashiers' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#E8ECF2] bg-white p-5">
            <h2 className="mb-4 font-display text-base font-bold text-slate-900">
              Sales Comparison by Employee
            </h2>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cashierStats.map((c) => ({
                    name: c.employee.name,
                    Sales: Math.round(c.totalSales),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF2" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(val) => formatMoney(Number(val ?? 0), state.config)} />
                  <Bar dataKey="Sales" fill="#FF5A1F" radius={[6, 6, 0, 0]} barSize={44} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-[#E8ECF2] bg-white p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E8ECF2] text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 pr-3">Employee</th>
                    <th className="py-2.5 px-3">Role · Dept</th>
                    <th className="py-2.5 px-3 text-right">Orders</th>
                    <th className="py-2.5 px-3 text-right">Total Sales</th>
                    <th className="py-2.5 px-3 text-right">Avg Ticket</th>
                    <th className="py-2.5 px-3 text-right">Cash</th>
                    <th className="py-2.5 px-3 text-right">Digital</th>
                    <th className="py-2.5 px-3 text-right">Cancelled</th>
                    <th className="py-2.5 pl-3 text-right">Cash Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {cashierStats.map((row) => (
                    <tr key={row.employee.id}>
                      <td className="py-3 pr-3 font-semibold text-slate-900">{row.employee.name}</td>
                      <td className="py-3 px-3 text-slate-600">
                        {row.employee.role} · {row.employee.department}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">{row.ordersCount}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatMoney(row.totalSales, state.config)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {formatMoney(row.avgOrder, state.config)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {formatMoney(row.cashSales, state.config)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {formatMoney(row.digitalSales, state.config)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {row.cancelledOrders}
                      </td>
                      <td
                        className={`py-3 pl-3 text-right font-mono font-bold tabular-nums ${
                          row.discrepancy === 0 ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {formatMoney(row.discrepancy, state.config)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Barman Performance */}
      {tab === 'barmen' && (
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-5">
          <h2 className="mb-4 font-display text-base font-bold text-slate-900">
            Barman Drink Issuance &amp; Bono Reconciliation
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E8ECF2] text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 pr-3">Barman</th>
                  <th className="py-2.5 px-3">Station</th>
                  <th className="py-2.5 px-3 text-right">Total Drinks Issued</th>
                  <th className="py-2.5 px-3 text-right">Paid Drinks</th>
                  <th className="py-2.5 px-3 text-right">Bonos Redeemed</th>
                  <th className="py-2.5 px-3 text-right">Bono Value</th>
                  <th className="py-2.5 px-3 text-right">Paid Sales</th>
                  <th className="py-2.5 pl-3 text-right">Stock Deductions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {barmanStats.map((b) => (
                  <tr key={b.employee.id}>
                    <td className="py-3 pr-3 font-semibold text-slate-900">{b.employee.name}</td>
                    <td className="py-3 px-3 text-slate-600">{b.employee.department}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {b.totalDrinksIssued}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {b.paidDrinksCount}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-[#FF5A1F] tabular-nums">
                      {b.bonosRedeemed}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {formatMoney(b.bonoValue, state.config)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {formatMoney(b.paidRevenue, state.config)}
                    </td>
                    <td className="py-3 pl-3 text-right font-mono tabular-nums">
                      {b.stockMovementsCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Immutable Audit Trail */}
      {tab === 'audit' && (
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5 rounded-lg bg-[#F7F8FA] p-1">
              {['All', 'POS', 'Kitchen', 'Bar & Bono', 'Inventory', 'Finance', 'Tables', 'Security'].map(
                (mod) => (
                  <button
                    key={mod}
                    onClick={() => setAuditModule(mod)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                      auditModule === mod ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    {mod}
                  </button>
                )
              )}
            </div>
            <div className="relative min-w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search user, action, ref..."
                className="w-full rounded-lg border border-[#E8ECF2] py-1.5 pl-8 pr-3 text-xs outline-none focus:border-[#FF5A1F]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E8ECF2] text-[11px] font-semibold text-slate-500">
                  <th className="py-2 pr-3">Timestamp</th>
                  <th className="py-2 px-3">User &amp; Role</th>
                  <th className="py-2 px-3">Module</th>
                  <th className="py-2 px-3">Action</th>
                  <th className="py-2 px-3">Reference</th>
                  <th className="py-2 pl-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredAudit.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 pr-3 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTimeShort(log.timestamp)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-900">{log.userName}</span>
                      <span className="ml-1.5 text-[11px] text-slate-500">({log.userRole})</span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                      {log.module}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#FF5A1F] whitespace-nowrap">
                      {log.reference}
                    </td>
                    <td className="py-2.5 pl-3 text-slate-600">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
