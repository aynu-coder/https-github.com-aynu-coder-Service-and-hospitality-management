import React, { useMemo, useState } from 'react';
import {
  Ticket,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Wine,
  Ban,
  CheckCircle2,
} from 'lucide-react';
import { useHospitality } from '../context/HospitalityContext';
import { BonoRecord, BonoStatus, BonoType } from '../types/hospitality';
import { formatDateTimeShort, formatMoney } from '../utils/formatters';

const BONO_TYPES: BonoType[] = [
  'Drink Bono',
  'Food Bono',
  'Value Bono',
  'Staff Bono',
  'Promotional Bono',
  'Complimentary Bono',
];

export const BarBonoView: React.FC = () => {
  const { state, currentEmployee, hasPermission, issueBonos, redeemBono, cancelBono } =
    useHospitality();

  // Redemption state
  const [scanCode, setScanCode] = useState('BON-1001');
  const [redeemProductId, setRedeemProductId] = useState('prd-beer');
  const [redeemNote, setRedeemNote] = useState('');
  const [redeemResult, setRedeemResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Issuance modal/panel state
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [newType, setNewType] = useState<BonoType>('Drink Bono');
  const [newAccountingMode, setNewAccountingMode] =
    useState<BonoRecord['accountingMode']>('Prepaid');
  const [newEligibleProductId, setNewEligibleProductId] = useState('prd-beer');
  const [newValueAmount, setNewValueAmount] = useState('185');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newValidDays, setNewValidDays] = useState('7');
  const [newCustomerEvent, setNewCustomerEvent] = useState('');

  // Registry filter
  const [statusFilter, setStatusFilter] = useState<'All' | BonoStatus>('All');
  const [searchCode, setSearchCode] = useState('');

  const drinkAndBarProducts = state.menuProducts.filter(
    (p) =>
      p.category === 'Beer & Spirits' ||
      p.category === 'Soft Drinks' ||
      p.category === 'Fresh Juices' ||
      p.category === 'Coffee & Bakery'
  );

  const summary = useMemo(() => {
    const issued = state.bonos.length;
    const redeemed = state.bonos.filter((b) => b.status === 'Redeemed').length;
    const active = state.bonos.filter((b) => b.status === 'Active').length;
    const expiredOrCancelled = state.bonos.filter(
      (b) => b.status === 'Expired' || b.status === 'Cancelled'
    ).length;
    const redeemedValue = state.bonos
      .filter((b) => b.status === 'Redeemed')
      .reduce((s, b) => s + b.valueAmount, 0);
    const outstandingLiability = state.bonos
      .filter((b) => b.status === 'Active' && b.accountingMode === 'Prepaid')
      .reduce((s, b) => s + b.valueAmount, 0);
    return { issued, redeemed, active, expiredOrCancelled, redeemedValue, outstandingLiability };
  }, [state.bonos]);

  const filteredBonos = useMemo(() => {
    return state.bonos.filter((b) => {
      const okStatus = statusFilter === 'All' || b.status === statusFilter;
      const okSearch =
        !searchCode.trim() ||
        b.code.toLowerCase().includes(searchCode.toLowerCase()) ||
        b.customerOrEvent.toLowerCase().includes(searchCode.toLowerCase());
      return okStatus && okSearch;
    });
  }, [state.bonos, statusFilter, searchCode]);

  const matchedScannedBono = state.bonos.find(
    (b) => b.code.toUpperCase() === scanCode.trim().toUpperCase()
  );

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    const targetProd = matchedScannedBono?.eligibleProductId || redeemProductId;
    const res = redeemBono(scanCode, targetProd, redeemNote);
    setRedeemResult({ ok: res.ok, message: res.message });
    if (res.ok) {
      setRedeemNote('');
    }
  };

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    const created = issueBonos({
      type: newType,
      accountingMode: newAccountingMode,
      valueAmount: Number(newValueAmount) || 185,
      eligibleProductId: newType === 'Value Bono' ? undefined : newEligibleProductId,
      customerOrEvent: newCustomerEvent || 'Hotel Event Guest',
      quantity: Number(newQuantity) || 1,
      validDays: Number(newValidDays) || 7,
    });
    setShowIssueForm(false);
    setNewCustomerEvent('');
    if (created[0]) {
      setScanCode(created[0].code);
      setRedeemResult({
        ok: true,
        message: `Issued ${created.length} bono(s) starting at ${created[0].code}.`,
      });
    }
  };

  const statusChip = (status: BonoStatus) => {
    switch (status) {
      case 'Active':
        return 'bg-sky-50 text-sky-700 border border-sky-200';
      case 'Redeemed':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Expired':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'Cancelled':
        return 'bg-red-50 text-red-700 border border-red-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Bono Reconciliation KPIs (Section 5.4 & 18.1) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Total Bonos Issued</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {summary.issued}
          </div>
        </div>
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Bonos Redeemed</div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {summary.redeemed}
          </div>
        </div>
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Unredeemed Active</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#FF5A1F] tabular-nums">
            {summary.active}
          </div>
        </div>
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Expired / Cancelled</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-700 tabular-nums">
            {summary.expiredOrCancelled}
          </div>
        </div>
        <div className="col-span-2 lg:col-span-1 rounded-xl border border-[#E8ECF2] bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Prepaid Liability</div>
          <div className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {formatMoney(summary.outstandingLiability, state.config)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left: Barman Bono Validation & Redemption Console */}
        <div className="xl:col-span-5 rounded-xl border border-[#E8ECF2] bg-white p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8ECF2] pb-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Barman Redemption Console
              </h2>
              <p className="text-xs text-slate-500">
                Operator: {currentEmployee.name} · Auto-deducts Bar Store stock
              </p>
            </div>
            <Wine className="h-5 w-5 text-[#FF5A1F]" />
          </div>

          <form onSubmit={handleRedeem} className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Bono Code / Voucher Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scanCode}
                  onChange={(e) => {
                    setScanCode(e.target.value);
                    setRedeemResult(null);
                  }}
                  placeholder="Enter code (e.g. BON-1001)"
                  className="flex-1 rounded-lg border border-[#E8ECF2] bg-[#F7F8FA] px-3 py-2.5 font-mono text-sm font-semibold uppercase text-slate-900 outline-none focus:border-[#FF5A1F] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    setScanCode('BON-1004');
                    setRedeemResult(null);
                  }}
                  className="rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                  title="Load already-redeemed bono to verify duplicate prevention"
                >
                  Test Duplicate
                </button>
              </div>
            </div>

            {matchedScannedBono && (
              <div className="rounded-lg border border-[#E8ECF2] bg-[#F7F8FA] p-3 text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>
                    {matchedScannedBono.code} · {matchedScannedBono.type}
                  </span>
                  <span className={`rounded px-2 py-0.5 text-[11px] ${statusChip(matchedScannedBono.status)}`}>
                    {matchedScannedBono.status}
                  </span>
                </div>
                <div className="text-slate-600">
                  Event/Guest: {matchedScannedBono.customerOrEvent} · Mode:{' '}
                  {matchedScannedBono.accountingMode}
                </div>
                <div className="font-mono text-slate-700">
                  Issued by {matchedScannedBono.issuedByName} · Value:{' '}
                  {formatMoney(matchedScannedBono.valueAmount, state.config)}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Drink / Product to Issue
              </label>
              <select
                value={matchedScannedBono?.eligibleProductId || redeemProductId}
                disabled={Boolean(matchedScannedBono?.eligibleProductId)}
                onChange={(e) => setRedeemProductId(e.target.value)}
                className="w-full rounded-lg border border-[#E8ECF2] bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-[#FF5A1F] disabled:bg-slate-100"
              >
                {drinkAndBarProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatMoney(p.sellingPrice, state.config)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Redemption Note (Optional)
              </label>
              <input
                type="text"
                value={redeemNote}
                onChange={(e) => setRedeemNote(e.target.value)}
                placeholder="e.g., Issued at Main Bar counter"
                className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#FF5A1F]"
              />
            </div>

            {redeemResult && (
              <div
                className={`flex items-start gap-2 rounded-lg border p-3 text-xs font-medium ${
                  redeemResult.ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {redeemResult.ok ? (
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span>{redeemResult.message}</span>
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF5A1F] py-3 text-sm font-semibold text-white hover:bg-[#E64A12] transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              Validate Bono &amp; Deduct Stock
            </button>
          </form>
        </div>

        {/* Right: Bono Registry & Issuance */}
        <div className="xl:col-span-7 rounded-xl border border-[#E8ECF2] bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Bono Issuance &amp; Reconciliation Registry
              </h2>
              <p className="text-xs text-slate-500">
                Track issued, redeemed, unredeemed, and cancelled vouchers
              </p>
            </div>
            {(hasPermission('bono_issue') || hasPermission('view_dashboard')) && (
              <button
                onClick={() => setShowIssueForm((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg bg-[#181C24] px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                {showIssueForm ? 'Close Issuance Form' : 'Issue New Bonos'}
              </button>
            )}
          </div>

          {showIssueForm && (
            <form
              onSubmit={handleIssue}
              className="rounded-xl border border-[#E8ECF2] bg-[#F7F8FA] p-4 space-y-3"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                    Bono Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as BonoType)}
                    className="w-full rounded-lg border border-[#E8ECF2] bg-white px-2.5 py-2 text-xs"
                  >
                    {BONO_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                    Accounting Treatment
                  </label>
                  <select
                    value={newAccountingMode}
                    onChange={(e) =>
                      setNewAccountingMode(e.target.value as BonoRecord['accountingMode'])
                    }
                    className="w-full rounded-lg border border-[#E8ECF2] bg-white px-2.5 py-2 text-xs"
                  >
                    <option value="Prepaid">Prepaid</option>
                    <option value="Complimentary">Complimentary</option>
                    <option value="Promotional">Promotional</option>
                    <option value="Staff Authorized">Staff Authorized</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                    Eligible Product
                  </label>
                  <select
                    disabled={newType === 'Value Bono'}
                    value={newEligibleProductId}
                    onChange={(e) => {
                      setNewEligibleProductId(e.target.value);
                      const prod = state.menuProducts.find((p) => p.id === e.target.value);
                      if (prod) setNewValueAmount(String(prod.sellingPrice));
                    }}
                    className="w-full rounded-lg border border-[#E8ECF2] bg-white px-2.5 py-2 text-xs disabled:bg-slate-100"
                  >
                    {state.menuProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                    Value ({state.config.currencyCode})
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newValueAmount}
                    onChange={(e) => setNewValueAmount(e.target.value)}
                    className="w-full rounded-lg border border-[#E8ECF2] bg-white px-2.5 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                    Batch Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="w-full rounded-lg border border-[#E8ECF2] bg-white px-2.5 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                    Valid (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newValidDays}
                    onChange={(e) => setNewValidDays(e.target.value)}
                    className="w-full rounded-lg border border-[#E8ECF2] bg-white px-2.5 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                    Customer / Event
                  </label>
                  <input
                    type="text"
                    value={newCustomerEvent}
                    onChange={(e) => setNewCustomerEvent(e.target.value)}
                    placeholder="Conference / Guest"
                    className="w-full rounded-lg border border-[#E8ECF2] bg-white px-2.5 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-[#FF5A1F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#E64A12]"
                >
                  <Ticket className="h-3.5 w-3.5" />
                  Generate Bono(s)
                </button>
              </div>
            </form>
          )}

          {/* Filter & Search */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg bg-[#F7F8FA] p-1">
              {(['All', 'Active', 'Redeemed', 'Expired', 'Cancelled'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    statusFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Filter code or event..."
              className="rounded-lg border border-[#E8ECF2] px-3 py-1.5 text-xs outline-none focus:border-[#FF5A1F]"
            />
          </div>

          {/* Registry Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E8ECF2] text-[11px] font-semibold text-slate-500">
                  <th className="py-2 pr-3">Code</th>
                  <th className="py-2 px-3">Type / Mode</th>
                  <th className="py-2 px-3">Event / Eligible Item</th>
                  <th className="py-2 px-3">Issued By</th>
                  <th className="py-2 px-3">Redemption</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 pl-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredBonos.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 pr-3 font-mono font-bold text-slate-900">
                      <button
                        onClick={() => {
                          setScanCode(b.code);
                          setRedeemResult(null);
                        }}
                        className="hover:text-[#FF5A1F] hover:underline"
                        title="Load code into redemption scanner"
                      >
                        {b.code}
                      </button>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900">{b.type}</div>
                      <div className="text-[11px] text-slate-500">{b.accountingMode}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-slate-800">{b.customerOrEvent}</div>
                      <div className="text-[11px] text-slate-500">
                        {b.eligibleProductName || b.eligibleCategory} ·{' '}
                        <span className="font-mono">{formatMoney(b.valueAmount, state.config)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{b.issuedByName}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {b.status === 'Redeemed' ? (
                        <div>
                          <div className="font-medium text-emerald-700">{b.redeemedByName}</div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {b.redeemedAt ? formatDateTimeShort(b.redeemedAt) : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">Pending</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${statusChip(b.status)}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                      {b.status === 'Active' && (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => {
                              setScanCode(b.code);
                              setRedeemResult(null);
                            }}
                            className="text-xs font-semibold text-[#FF5A1F] hover:underline"
                          >
                            Redeem
                          </button>
                          <button
                            onClick={() => cancelBono(b.id, 'Cancelled by staff')}
                            className="text-slate-400 hover:text-red-600"
                            title="Cancel bono"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
