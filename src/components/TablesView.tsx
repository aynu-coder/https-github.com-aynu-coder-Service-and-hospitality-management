import React, { useState } from 'react';
import { ArrowRightLeft, Combine, ShoppingBag, Users } from 'lucide-react';
import { useHospitality } from '../context/HospitalityContext';
import { DiningTable, TableStatus } from '../types/hospitality';
import { formatMoney } from '../utils/formatters';

interface TablesViewProps {
  onOpenPosForTable: (tableId: string) => void;
}

const STATUSES: ('All' | TableStatus)[] = [
  'All',
  'Available',
  'Occupied',
  'Reserved',
  'Waiting for Service',
  'Cleaning',
];

export const TablesView: React.FC<TablesViewProps> = ({ onOpenPosForTable }) => {
  const { state, updateTableStatus, transferTableOrder, mergeTables } = useHospitality();

  const [statusFilter, setStatusFilter] = useState<'All' | TableStatus>('All');
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [targetTableId, setTargetTableId] = useState('');
  const [resName, setResName] = useState('');
  const [resTime, setResTime] = useState('19:30');
  const [feedback, setFeedback] = useState<string | null>(null);

  const tables = state.tables.filter((t) => {
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesDept =
      state.activeDepartment === 'All Departments' || t.area === state.activeDepartment;
    return matchesStatus && matchesDept;
  });

  const badgeStyle = (status: TableStatus) => {
    switch (status) {
      case 'Occupied':
        return 'bg-[#FF5A1F] text-white border-[#FF5A1F]';
      case 'Available':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Reserved':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Waiting for Service':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'Cleaning':
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-[#E8ECF2] bg-white p-1">
          {STATUSES.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === st
                  ? 'bg-[#181C24] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500 font-mono tabular-nums">
          {state.tables.filter((t) => t.status === 'Occupied').length} occupied ·{' '}
          {state.tables.filter((t) => t.status === 'Available').length} available
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Floor Grid */}
        <div className="lg:col-span-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {tables.map((tbl) => {
            const isSelected = selectedTable?.id === tbl.id;
            return (
              <button
                key={tbl.id}
                onClick={() => {
                  setSelectedTable(tbl);
                  setFeedback(null);
                  setTargetTableId('');
                }}
                className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                  isSelected ? 'ring-2 ring-[#FF5A1F]' : ''
                } ${badgeStyle(tbl.status)}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base font-bold">{tbl.name}</span>
                    <span className="flex items-center gap-1 font-mono text-xs tabular-nums">
                      <Users className="h-3.5 w-3.5" />
                      {tbl.guests}/{tbl.capacity}
                    </span>
                  </div>
                  <div className="mt-1 text-xs opacity-85">{tbl.area}</div>
                </div>

                <div className="mt-4 flex items-end justify-between gap-2 pt-3 border-t border-current/15">
                  <span className="text-xs font-semibold">{tbl.status}</span>
                  <span className="font-mono text-sm font-bold tabular-nums">
                    {tbl.activeAmount
                      ? formatMoney(tbl.activeAmount, state.config)
                      : tbl.reservationTime
                      ? `${tbl.reservationTime}`
                      : 'Ready'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Table Action Panel */}
        <div className="lg:col-span-4">
          <div className="rounded-xl border border-[#E8ECF2] bg-white p-5 space-y-4">
            {!selectedTable ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Select any table card on the floor plan to assign orders, change status, transfer, or merge.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-[#E8ECF2] pb-3">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">
                      {selectedTable.name} ({selectedTable.number})
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedTable.area} · Capacity {selectedTable.capacity}
                    </p>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                    {selectedTable.status}
                  </span>
                </div>

                <button
                  onClick={() => onOpenPosForTable(selectedTable.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF5A1F] py-2.5 text-xs font-semibold text-white hover:bg-[#E64A12] transition-colors"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Create / Add POS Order for {selectedTable.number}
                </button>

                {/* Status Quick Controls */}
                <div>
                  <div className="mb-2 text-xs font-semibold text-slate-700">Set Table Status</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Available', 'Waiting for Service', 'Cleaning', 'Occupied'] as TableStatus[]).map(
                      (st) => (
                        <button
                          key={st}
                          onClick={() => {
                            updateTableStatus(selectedTable.id, st);
                            setSelectedTable((prev) => (prev ? { ...prev, status: st } : null));
                            setFeedback(`${selectedTable.name} marked as ${st}.`);
                          }}
                          className="rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {st}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Reserve Table */}
                <div className="border-t border-[#E8ECF2] pt-3 space-y-2">
                  <div className="text-xs font-semibold text-slate-700">Reserve Table</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={resName}
                      onChange={(e) => setResName(e.target.value)}
                      placeholder="Guest name"
                      className="rounded-lg border border-[#E8ECF2] px-2.5 py-1.5 text-xs outline-none focus:border-[#FF5A1F]"
                    />
                    <input
                      type="time"
                      value={resTime}
                      onChange={(e) => setResTime(e.target.value)}
                      className="rounded-lg border border-[#E8ECF2] px-2.5 py-1.5 font-mono text-xs outline-none focus:border-[#FF5A1F]"
                    />
                  </div>
                  <button
                    onClick={() => {
                      updateTableStatus(selectedTable.id, 'Reserved', resName || 'VIP Guest', resTime);
                      setFeedback(`${selectedTable.name} reserved for ${resName || 'VIP Guest'} at ${resTime}.`);
                    }}
                    className="w-full rounded-lg border border-[#E8ECF2] bg-[#F7F8FA] py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                  >
                    Confirm Reservation
                  </button>
                </div>

                {/* Transfer / Merge Order */}
                {selectedTable.status === 'Occupied' && (
                  <div className="border-t border-[#E8ECF2] pt-3 space-y-2">
                    <div className="text-xs font-semibold text-slate-700">
                      Transfer or Merge Table
                    </div>
                    <select
                      value={targetTableId}
                      onChange={(e) => setTargetTableId(e.target.value)}
                      className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs"
                    >
                      <option value="">Select destination table...</option>
                      {state.tables
                        .filter((t) => t.id !== selectedTable.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.status})
                          </option>
                        ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        disabled={!targetTableId}
                        onClick={() => {
                          const res = transferTableOrder(selectedTable.id, targetTableId);
                          setFeedback(res.message);
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-[#E8ECF2] py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        Transfer
                      </button>
                      <button
                        disabled={!targetTableId}
                        onClick={() => {
                          const res = mergeTables(selectedTable.id, targetTableId);
                          setFeedback(res.message);
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-[#E8ECF2] py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Combine className="h-3.5 w-3.5" />
                        Merge
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
