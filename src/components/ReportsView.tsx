import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { useHospitality } from '../context/HospitalityContext';
import { downloadTextFile, formatDateTimeShort, formatMoney } from '../utils/formatters';

type ReportType =
  | 'Daily Sales Report'
  | 'Bono Reconciliation Report'
  | 'Inventory Valuation Report'
  | 'Expense & P&L Summary'
  | 'Employee Performance Report';

export const ReportsView: React.FC = () => {
  const { state } = useHospitality();
  const [reportType, setReportType] = useState<ReportType>('Daily Sales Report');
  const [deptFilter, setDeptFilter] = useState<string>('All Departments');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');

  const tablePayload = useMemo((): { headers: string[]; rows: (string | number)[][] } => {
    if (reportType === 'Daily Sales Report') {
      const orders = state.orders.filter(
        (o) =>
          (deptFilter === 'All Departments' || o.department === deptFilter) &&
          (paymentFilter === 'All' || o.payments.some((p) => p.method === paymentFilter))
      );
      return {
        headers: ['Order #', 'Date/Time', 'Department', 'Channel', 'Cashier', 'Status', 'Payment', 'Total'],
        rows: orders.map((o) => [
          o.orderNumber,
          formatDateTimeShort(o.createdAt),
          o.department,
          o.tableLabel ? `Table ${o.tableLabel}` : o.roomNumber || o.channel,
          o.cashierName,
          o.status,
          o.payments.map((p) => p.method).join(' + '),
          o.totalAmount.toFixed(2),
        ]),
      };
    }

    if (reportType === 'Bono Reconciliation Report') {
      return {
        headers: ['Bono Code', 'Type', 'Mode', 'Status', 'Issued By', 'Redeemed By', 'Product', 'Value'],
        rows: state.bonos.map((b) => [
          b.code,
          b.type,
          b.accountingMode,
          b.status,
          b.issuedByName,
          b.redeemedByName || '—',
          b.redeemedProductName || b.eligibleProductName || b.eligibleCategory || '—',
          b.valueAmount.toFixed(2),
        ]),
      };
    }

    if (reportType === 'Inventory Valuation Report') {
      return {
        headers: ['SKU', 'Item Name', 'Category', 'Main Store', 'Bar Store', 'Kitchen Store', 'Total Qty', 'Unit Cost', 'Total Value'],
        rows: state.stockItems.map((s) => {
          const total = Object.values(s.quantities).reduce((a, b) => a + b, 0);
          return [
            s.sku,
            s.name,
            s.category,
            s.quantities['Main Store'].toFixed(1),
            s.quantities['Bar Store'].toFixed(1),
            s.quantities['Kitchen Store'].toFixed(1),
            `${total.toFixed(1)} ${s.unit}`,
            s.purchasePrice.toFixed(2),
            (total * s.purchasePrice).toFixed(2),
          ];
        }),
      };
    }

    if (reportType === 'Expense & P&L Summary') {
      return {
        headers: ['Expense ID', 'Date', 'Category', 'Department', 'Method', 'Recorded By', 'Description', 'Amount'],
        rows: state.expenses
          .filter((e) => deptFilter === 'All Departments' || e.department === deptFilter)
          .map((e) => [
            e.id,
            formatDateTimeShort(e.date),
            e.category,
            e.department,
            e.paymentMethod,
            e.recordedByName,
            e.description,
            e.amount.toFixed(2),
          ]),
      };
    }

    // Employee Performance Report
    return {
      headers: ['Employee', 'Role', 'Department', 'Orders Handled', 'Total Sales', 'Bonos Redeemed'],
      rows: state.employees.map((emp) => {
        const orders = state.orders.filter((o) => o.cashierId === emp.id && o.status !== 'Cancelled');
        const total = orders.reduce((s, o) => s + o.totalAmount, 0);
        const bonos = state.bonos.filter((b) => b.redeemedById === emp.id).length;
        return [emp.name, emp.role, emp.department, orders.length, total.toFixed(2), bonos];
      }),
    };
  }, [reportType, deptFilter, paymentFilter, state]);

  const exportCsv = (extension: 'csv' | 'xls') => {
    const escape = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
    const csvBody = [
      tablePayload.headers.map(escape).join(','),
      ...tablePayload.rows.map((r) => r.map(escape).join(',')),
    ].join('\n');
    const slug = reportType.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadTextFile(
      `${slug}.${extension}`,
      csvBody,
      extension === 'xls' ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;'
    );
  };

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <div className="no-print rounded-xl border border-[#E8ECF2] bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Management Report Builder
            </h2>
            <p className="text-xs text-slate-500">
              Filter by department and export directly to CSV, Excel (.xls), or Printable PDF
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportCsv('csv')}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8ECF2] bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <button
              onClick={() => exportCsv('xls')}
              className="flex items-center gap-1.5 rounded-lg bg-[#181C24] px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              Export Excel (.xls)
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-[#FF5A1F] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#E64A12]"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Report Template
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs font-medium"
            >
              <option>Daily Sales Report</option>
              <option>Bono Reconciliation Report</option>
              <option>Inventory Valuation Report</option>
              <option>Expense &amp; P&amp;L Summary</option>
              <option>Employee Performance Report</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Department / Sales Point
            </label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs font-medium"
            >
              <option>All Departments</option>
              <option>Main Restaurant</option>
              <option>Main Bar</option>
              <option>Outdoor Lounge</option>
              <option>Coffee Shop</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Payment Method Filter
            </label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs font-medium"
            >
              <option value="All">All Payment Methods</option>
              <option value="Cash">Cash</option>
              <option value="POS / Card">POS / Card</option>
              <option value="Mobile Money">Mobile Money</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Credit / Deferred">Credit / Deferred</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Preview Table */}
      <div className="rounded-xl border border-[#E8ECF2] bg-white p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8ECF2] pb-3">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              {state.config.hotelName} — {reportType}
            </h3>
            <p className="text-xs text-slate-500">
              Scope: {deptFilter} · Currency: {state.config.currencyCode} · {tablePayload.rows.length} records
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500">
            Generated {new Date().toLocaleDateString()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E8ECF2] text-[11px] font-semibold text-slate-500">
                {tablePayload.headers.map((h) => (
                  <th key={h} className="py-2.5 px-3 first:pl-0 last:pr-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {tablePayload.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/70">
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="py-2.5 px-3 first:pl-0 last:pr-0 font-mono text-slate-800 tabular-nums"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-2 border-t border-[#E8ECF2] flex justify-between text-xs text-slate-500">
          <span>BelTech Hospitality Reporting Engine</span>
          <span>
            Sample Total Valuation:{' '}
            <strong className="font-mono text-slate-900">
              {formatMoney(
                state.orders
                  .filter((o) => o.status !== 'Cancelled')
                  .reduce((s, o) => s + o.totalAmount, 0),
                state.config
              )}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};
