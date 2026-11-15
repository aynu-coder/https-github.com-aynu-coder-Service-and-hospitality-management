import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, Flame, AlertCircle } from 'lucide-react';
import { useHospitality } from '../context/HospitalityContext';
import { KitchenStation } from '../types/hospitality';
import { formatTimeShort, minutesElapsed } from '../utils/formatters';

const STATIONS: ('All Stations' | KitchenStation)[] = [
  'All Stations',
  'Main Kitchen',
  'Grill Section',
  'Juice Section',
  'Coffee Section',
  'Bakery Section',
  'Bar Station',
];

export const KdsView: React.FC = () => {
  const { state, updateOrderStatus } = useHospitality();
  const [station, setStation] = useState<'All Stations' | KitchenStation>('All Stations');
  const [showCompleted, setShowCompleted] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const activeOrders = state.orders.filter((o) => {
    const isKitchenActive =
      o.status === 'Confirmed' || o.status === 'In Preparation' || o.status === 'Ready';
    if (!isKitchenActive) return false;
    if (station === 'All Stations') return true;
    return o.items.some((it) => it.station === station);
  });

  const completedOrders = state.orders
    .filter((o) => o.status === 'Completed' || o.status === 'Delivered')
    .slice(0, 8);

  const avgPrepMins = (() => {
    const done = state.orders.filter((o) => o.prepStartedAt && o.readyAt);
    if (!done.length) return 11;
    const total = done.reduce((sum, o) => {
      const diff = (new Date(o.readyAt!).getTime() - new Date(o.prepStartedAt!).getTime()) / 60000;
      return sum + Math.max(1, diff);
    }, 0);
    return Math.round(total / done.length);
  })();

  const delayedCount = activeOrders.filter(
    (o) => (o.status === 'Confirmed' || o.status === 'In Preparation') && minutesElapsed(o.createdAt, nowMs) >= 12
  ).length;

  return (
    <div className="space-y-6">
      {/* Kitchen KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Pending Kitchen Queue</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {activeOrders.filter((o) => o.status !== 'Ready').length}
          </div>
        </div>
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Ready for Cashier</div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {activeOrders.filter((o) => o.status === 'Ready').length}
          </div>
        </div>
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Delayed Tickets (&ge;12m)</div>
          <div className="mt-1 font-mono text-2xl font-bold text-red-600 tabular-nums">
            {delayedCount}
          </div>
        </div>
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Avg Preparation Time</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {avgPrepMins} min
          </div>
        </div>
      </div>

      {/* Station Filter Tabs + Completed Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-[#E8ECF2] bg-white p-1">
          {STATIONS.map((st) => (
            <button
              key={st}
              onClick={() => setStation(st)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                station === st
                  ? 'bg-[#181C24] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCompleted((v) => !v)}
          className="rounded-lg border border-[#E8ECF2] bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
        >
          {showCompleted ? 'Show Active Queue' : `Completed History (${completedOrders.length})`}
        </button>
      </div>

      {/* Active KDS Tickets Board */}
      {!showCompleted ? (
        activeOrders.length === 0 ? (
          <div className="rounded-xl border border-[#E8ECF2] bg-white p-12 text-center text-sm text-slate-500">
            No pending orders for {station}. New POS tickets appear here immediately.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeOrders.map((order) => {
              const elapsed = minutesElapsed(order.createdAt, nowMs);
              const isDelayed = elapsed >= 12 && order.status !== 'Ready';
              const itemsToShow =
                station === 'All Stations'
                  ? order.items
                  : order.items.filter((it) => it.station === station);

              return (
                <div
                  key={order.id}
                  className={`flex flex-col justify-between rounded-xl border bg-white p-5 ${
                    isDelayed
                      ? 'border-red-300'
                      : order.status === 'Ready'
                      ? 'border-emerald-300'
                      : 'border-[#E8ECF2]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 border-b border-[#F1F5F9] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                            {order.orderNumber}
                          </span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {order.tableLabel ? `Table ${order.tableLabel}` : order.roomNumber || order.channel}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Cashier: {order.cashierName} · {formatTimeShort(order.createdAt)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs font-semibold tabular-nums ${
                            isDelayed
                              ? 'bg-red-50 text-red-700'
                              : order.status === 'Ready'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {isDelayed ? (
                            <AlertCircle className="h-3.5 w-3.5" />
                          ) : (
                            <Clock className="h-3.5 w-3.5" />
                          )}
                          {elapsed}m
                        </div>
                        <div className="mt-1 text-[11px] font-medium text-slate-500">
                          {order.status}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {itemsToShow.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-[#F7F8FA] px-3 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#181C24] font-mono text-xs font-bold text-white tabular-nums">
                              {it.quantity}
                            </span>
                            <span className="font-semibold text-slate-900 truncate">
                              {it.productName}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 shrink-0">
                            {it.station}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex gap-2">
                    {order.status === 'Confirmed' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'In Preparation')}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#181C24] py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                      >
                        <Flame className="h-3.5 w-3.5 text-[#FF5A1F]" />
                        Start Preparing
                      </button>
                    )}
                    {(order.status === 'Confirmed' || order.status === 'In Preparation') && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'Ready')}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark Ready &amp; Notify Cashier
                      </button>
                    )}
                    {order.status === 'Ready' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'Completed')}
                        className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 py-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                      >
                        Collected / Complete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-5">
          <h3 className="mb-3 font-display text-sm font-bold text-slate-900">
            Completed Kitchen Orders
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E8ECF2] text-[11px] font-semibold text-slate-500">
                  <th className="py-2 pr-3">Order</th>
                  <th className="py-2 px-3">Table / Channel</th>
                  <th className="py-2 px-3">Items</th>
                  <th className="py-2 px-3">Cashier</th>
                  <th className="py-2 px-3">Created</th>
                  <th className="py-2 pl-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {completedOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2.5 pr-3 font-mono font-semibold text-slate-900">
                      {o.orderNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {o.tableLabel ? `Table ${o.tableLabel}` : o.roomNumber || o.channel}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {o.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{o.cashierName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {formatTimeShort(o.createdAt)}
                    </td>
                    <td className="py-2.5 pl-3">
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        {o.status}
                      </span>
                    </td>
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
