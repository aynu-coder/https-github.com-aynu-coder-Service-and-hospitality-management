import React, { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ArrowUpRight, AlertTriangle, Utensils, Wine, Coffee, Flame } from 'lucide-react';
import { useHospitality } from '../context/HospitalityContext';
import { formatMoney, formatTimeShort } from '../utils/formatters';
import { NavSection } from '../types/hospitality';

interface DashboardViewProps {
  onNavigate: (section: NavSection) => void;
}

type PeriodFilter = 'Today' | 'Weekly' | 'Monthly' | 'Yearly';

const CHART_COLORS = ['#FF5A1F', '#181C24', '#0284C7', '#16A34A', '#D97706'];

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { state, getProductCost } = useHospitality();
  const [period, setPeriod] = useState<PeriodFilter>('Weekly');
  const [chartTab, setChartTab] = useState<'sales' | 'departments' | 'bonos' | 'payments'>('sales');

  const filteredOrders = useMemo(() => {
    return state.orders.filter(
      (o) =>
        o.status !== 'Cancelled' &&
        (state.activeDepartment === 'All Departments' || o.department === state.activeDepartment)
    );
  }, [state.orders, state.activeDepartment]);

  const periodMultiplier =
    period === 'Today' ? 1 : period === 'Weekly' ? 6.4 : period === 'Monthly' ? 26.5 : 312;

  const liveRevenue = filteredOrders.reduce((s, o) => s + o.totalAmount, 0);
  const liveCost = filteredOrders.reduce((s, o) => s + o.totalCost, 0);
  const totalOrdersCount = Math.round(filteredOrders.length * periodMultiplier);
  const displayRevenue = Number((liveRevenue * periodMultiplier).toFixed(2));
  const avgTicket = filteredOrders.length ? liveRevenue / filteredOrders.length : 0;
  const guestsServed = Math.round(
    (state.tables.reduce((s, t) => s + t.guests, 0) + filteredOrders.length * 2.2) *
      (period === 'Today' ? 1 : periodMultiplier * 0.75)
  );

  const totalExpenses =
    state.expenses
      .filter((e) => state.activeDepartment === 'All Departments' || e.department === state.activeDepartment)
      .reduce((s, e) => s + e.amount, 0) *
    (period === 'Today' ? 0.25 : period === 'Weekly' ? 1 : period === 'Monthly' ? 4 : 48);

  const grossProfit = displayRevenue - liveCost * periodMultiplier;
  const netProfit = grossProfit - totalExpenses;

  const totalStockValue = state.stockItems.reduce((sum, item) => {
    const qty = Object.values(item.quantities).reduce((a, b) => a + b, 0);
    return sum + qty * item.purchasePrice;
  }, 0);

  const lowStockItems = state.stockItems.filter((item) => {
    const qty = Object.values(item.quantities).reduce((a, b) => a + b, 0);
    return qty <= item.minStockLevel;
  });

  const bonosIssued = state.bonos.length;
  const bonosRedeemed = state.bonos.filter((b) => b.status === 'Redeemed').length;
  const bonosActive = state.bonos.filter((b) => b.status === 'Active').length;

  // Sales trend chart data
  const salesTrendData = useMemo(() => {
    const base =
      period === 'Today'
        ? [
            { label: '09:00', sales: 1850, profit: 920 },
            { label: '11:00', sales: 3200, profit: 1640 },
            { label: '13:00', sales: 5400, profit: 2810 },
            { label: '15:00', sales: 4100, profit: 2100 },
            { label: '17:00', sales: 6850, profit: 3420 },
            { label: '19:00', sales: Math.max(8200, Math.round(liveRevenue * 0.55)), profit: 4400 },
            { label: '21:00', sales: Math.max(9400, Math.round(liveRevenue * 0.72)), profit: 5120 },
          ]
        : [
            { label: 'Mon', sales: 12400, profit: 6400 },
            { label: 'Tue', sales: 26800, profit: 14100 },
            { label: 'Wed', sales: 23900, profit: 12450 },
            { label: 'Thu', sales: 52300, profit: 28900 },
            { label: 'Fri', sales: 41800, profit: 22100 },
            { label: 'Sat', sales: 68400, profit: 37200 },
            { label: 'Sun', sales: Math.max(78200, Math.round(liveRevenue * 4.9)), profit: 43800 },
          ];
    return base;
  }, [period, liveRevenue]);

  // Department revenue breakdown
  const departmentData = useMemo(() => {
    const depts = ['Main Restaurant', 'Main Bar', 'Outdoor Lounge', 'Coffee Shop'] as const;
    return depts.map((d) => {
      const val = state.orders
        .filter((o) => o.status !== 'Cancelled' && o.department === d)
        .reduce((s, o) => s + o.totalAmount, 0);
      return { name: d, value: Math.round(val) || 1200 };
    });
  }, [state.orders]);

  // Payment methods breakdown
  const paymentMethodData = useMemo(() => {
    const map = new Map<string, number>();
    for (const ord of filteredOrders) {
      for (const p of ord.payments) {
        map.set(p.method, (map.get(p.method) || 0) + p.amount);
      }
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [filteredOrders]);

  // Bono comparison data
  const bonoComparisonData = useMemo(() => {
    const types = ['Drink Bono', 'Food Bono', 'Value Bono', 'Staff Bono', 'Promotional Bono'] as const;
    return types.map((t) => ({
      name: t.replace(' Bono', ''),
      Issued: state.bonos.filter((b) => b.type === t).length,
      Redeemed: state.bonos.filter((b) => b.type === t && b.status === 'Redeemed').length,
    }));
  }, [state.bonos]);

  // Top selling products
  const topSellingItems = useMemo(() => {
    const counts = new Map<string, { qty: number; rev: number }>();
    for (const o of filteredOrders) {
      for (const it of o.items) {
        const prev = counts.get(it.productId) || { qty: 0, rev: 0 };
        counts.set(it.productId, { qty: prev.qty + it.quantity, rev: prev.rev + it.unitPrice * it.quantity });
      }
    }
    return state.menuProducts
      .map((p) => {
        const stat = counts.get(p.id) || { qty: 0, rev: 0 };
        const cost = getProductCost(p);
        const marginPct = p.sellingPrice > 0 ? Math.round(((p.sellingPrice - cost) / p.sellingPrice) * 100) : 0;
        return { product: p, qty: stat.qty, revenue: stat.rev, marginPct };
      })
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredOrders, state.menuProducts, getProductCost]);

  const visibleTables = state.tables
    .filter((t) => state.activeDepartment === 'All Departments' || t.area === state.activeDepartment)
    .slice(0, 12);

  const tableTileStyle = (status: string) => {
    switch (status) {
      case 'Occupied':
        return 'bg-[#FF5A1F] text-white border-[#FF5A1F]';
      case 'Available':
        return 'bg-[#DCFCE7] text-[#14532D] border-[#BBF7D0]';
      case 'Reserved':
        return 'bg-[#FEF9C3] text-[#713F12] border-[#FDE047]';
      case 'Waiting for Service':
        return 'bg-[#FFEDD5] text-[#9A3412] border-[#FDBA74]';
      default:
        return 'bg-[#F1F5F9] text-slate-700 border-slate-200';
    }
  };

  const orderStatusBadge = (status: string) => {
    switch (status) {
      case 'Ready':
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'In Preparation':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'Confirmed':
        return 'bg-sky-50 text-sky-700 border border-sky-200';
      case 'Cancelled':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const productIcon = (cat: string) => {
    if (cat === 'Grill & Burgers') return Flame;
    if (cat === 'Beer & Spirits' || cat === 'Soft Drinks' || cat === 'Fresh Juices') return Wine;
    if (cat === 'Coffee & Bakery') return Coffee;
    return Utensils;
  };

  return (
    <div className="space-y-6">
      {/* Period & Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center rounded-lg border border-[#E8ECF2] bg-white p-1">
          {(['Today', 'Weekly', 'Monthly', 'Yearly'] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                period === p
                  ? 'bg-[#181C24] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          {lowStockItems.length > 0 && (
            <button
              onClick={() => onNavigate('inventory')}
              className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="tabular-nums">{lowStockItems.length} Low Stock Alerts</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('pos')}
            className="flex items-center gap-1.5 rounded-lg bg-[#FF5A1F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#E64A12] transition-colors whitespace-nowrap shrink-0"
          >
            <span>New POS Order</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Primary 4 KPI Cards (DineLink Hero Strip) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Revenue with orange sparkline */}
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            {period === 'Today' ? "Today's Revenue" : `${period} Revenue`}
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="font-display text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {formatMoney(displayRevenue, state.config)}
            </span>
            <span className="text-xs font-semibold text-emerald-700 tabular-nums">+12.4%</span>
          </div>
          <div className="mt-3 h-10 w-full">
            <svg viewBox="0 0 220 42" className="h-full w-full overflow-visible">
              <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF5A1F" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#FF5A1F" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 2 36 C 28 32, 42 22, 65 25 C 88 28, 102 18, 124 21 C 146 24, 162 12, 184 15 C 198 17, 208 8, 218 4 L 218 40 L 2 40 Z"
                fill="url(#sparkFill)"
              />
              <path
                d="M 2 36 C 28 32, 42 22, 65 25 C 88 28, 102 18, 124 21 C 146 24, 162 12, 184 15 C 198 17, 208 8, 218 4"
                fill="none"
                stroke="#FF5A1F"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-5 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-500">Total Orders</div>
          <div className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {totalOrdersCount}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-emerald-700 tabular-nums">+8.2% vs prior</span>
            <span className="tabular-nums">
              {filteredOrders.filter((o) => o.status === 'Confirmed' || o.status === 'In Preparation').length} active
            </span>
          </div>
        </div>

        {/* Card 3: Avg Ticket */}
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-5 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-500">Average Ticket</div>
          <div className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {formatMoney(avgTicket, state.config)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-emerald-700 tabular-nums">+3.1%</span>
            <span className="tabular-nums">Gross Profit: {formatMoney(grossProfit, state.config)}</span>
          </div>
        </div>

        {/* Card 4: Guests Served / Net Profit */}
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-5 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-500">Guests Served</div>
          <div className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {guestsServed}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-emerald-700 tabular-nums">+5.4%</span>
            <span className="tabular-nums">Net: {formatMoney(netProfit, state.config)}</span>
          </div>
        </div>
      </div>

      {/* Secondary Operational Strip (Bono, Stock Value, Expenses) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E8ECF2] bg-white px-4 py-3.5">
          <div className="text-[11px] font-medium text-slate-500">Bonos Issued / Redeemed</div>
          <div className="mt-1 flex items-baseline gap-2 font-mono text-base font-semibold text-slate-900 tabular-nums">
            <span>{bonosIssued} Issued</span>
            <span className="text-slate-300">/</span>
            <span className="text-[#FF5A1F]">{bonosRedeemed} Redeemed</span>
          </div>
        </div>
        <div className="rounded-xl border border-[#E8ECF2] bg-white px-4 py-3.5">
          <div className="text-[11px] font-medium text-slate-500">Outstanding Active Bonos</div>
          <div className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
            {bonosActive} vouchers
          </div>
        </div>
        <div className="rounded-xl border border-[#E8ECF2] bg-white px-4 py-3.5">
          <div className="text-[11px] font-medium text-slate-500">Total Inventory Valuation</div>
          <div className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
            {formatMoney(totalStockValue, state.config)}
          </div>
        </div>
        <div className="rounded-xl border border-[#E8ECF2] bg-white px-4 py-3.5">
          <div className="text-[11px] font-medium text-slate-500">Period Operating Expenses</div>
          <div className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
            {formatMoney(totalExpenses, state.config)}
          </div>
        </div>
      </div>

      {/* Middle Split: Sales Performance Chart + Table Management Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left: BI Analytics Chart Panel */}
        <div className="xl:col-span-7 rounded-xl border border-[#E8ECF2] bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Sales &amp; Operational Performance
              </h2>
              <p className="text-xs text-slate-500">
                Interactive revenue, department mix, and bono reconciliation
              </p>
            </div>
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              {(
                [
                  { id: 'sales', label: 'Sales Trend' },
                  { id: 'departments', label: 'Departments' },
                  { id: 'bonos', label: 'Bonos' },
                  { id: 'payments', label: 'Payments' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setChartTab(tab.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    chartTab === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full">
            {chartTab === 'sales' && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrendData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF5A1F" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#FF5A1F" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF2" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${Math.round(v / 1000)}K`}
                  />
                  <Tooltip
                    formatter={(value) => [formatMoney(Number(value ?? 0), state.config), 'Amount']}
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #E8ECF2',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    name="Sales"
                    stroke="#FF5A1F"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#salesAreaGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {chartTab === 'departments' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF2" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value) => [formatMoney(Number(value ?? 0), state.config), 'Revenue']}
                    contentStyle={{ borderRadius: '10px', border: '1px solid #E8ECF2', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" fill="#FF5A1F" radius={[6, 6, 0, 0]} barSize={42} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {chartTab === 'bonos' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bonoComparisonData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF2" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #E8ECF2', fontSize: '12px' }} />
                  <Bar dataKey="Issued" fill="#181C24" radius={[4, 4, 0, 0]} barSize={22} />
                  <Bar dataKey="Redeemed" fill="#FF5A1F" radius={[4, 4, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {chartTab === 'payments' && (
              <div className="grid h-full grid-cols-1 items-center gap-4 sm:grid-cols-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {paymentMethodData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatMoney(Number(value ?? 0), state.config)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2.5 pr-4">
                  {paymentMethodData.map((entry, idx) => (
                    <div key={entry.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-slate-700 font-medium">
                        <span
                          className="h-2.5 w-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                        />
                        {entry.name}
                      </span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {formatMoney(entry.value, state.config)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Table Management Status Grid (inspired directly by DineLink UI) */}
        <div className="xl:col-span-5 rounded-xl border border-[#E8ECF2] bg-white p-5 flex flex-col">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Table Management
              </h2>
              <p className="text-xs text-slate-500">
                Live floor occupancy · Click to manage tables
              </p>
            </div>
            <button
              onClick={() => onNavigate('tables')}
              className="text-xs font-semibold text-[#FF5A1F] hover:underline whitespace-nowrap shrink-0"
            >
              Full Floor Plan
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 flex-1">
            {visibleTables.map((tbl) => (
              <button
                key={tbl.id}
                onClick={() => onNavigate('tables')}
                className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-transform hover:-translate-y-0.5 ${tableTileStyle(
                  tbl.status
                )}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display text-sm font-bold">{tbl.name}</span>
                    <span className="font-mono text-[11px] opacity-80 tabular-nums">
                      {tbl.guests}/{tbl.capacity}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium opacity-90 truncate">
                    {tbl.status}
                  </div>
                </div>
                <div className="mt-2 font-mono text-xs font-bold tabular-nums">
                  {tbl.activeAmount
                    ? formatMoney(tbl.activeAmount, state.config)
                    : tbl.reservationTime
                    ? tbl.reservationTime
                    : `${tbl.capacity} seats`}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Split: Top Selling Items + Recent Orders */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Top Selling Items */}
        <div className="xl:col-span-5 rounded-xl border border-[#E8ECF2] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900">Top Selling Items</h2>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Product Costing
            </button>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {topSellingItems.map(({ product, qty, revenue, marginPct }) => {
              const Icon = productIcon(product.category);
              return (
                <div key={product.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E8ECF2] bg-[#F7F8FA] text-slate-700">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {product.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        <span className="font-mono tabular-nums">{qty} sold</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span className="tabular-nums">{marginPct}% margin</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                      {formatMoney(product.promoPrice ?? product.sellingPrice, state.config)}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {formatMoney(revenue, state.config)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="xl:col-span-7 rounded-xl border border-[#E8ECF2] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900">Recent Orders</h2>
            <button
              onClick={() => onNavigate('pos')}
              className="text-xs font-semibold text-[#FF5A1F] hover:underline"
            >
              Open Cashier POS
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E8ECF2] text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 pr-3">Order ID</th>
                  <th className="py-2.5 px-3">Table / Ref</th>
                  <th className="py-2.5 px-3">Primary Item</th>
                  <th className="py-2.5 px-3">Cashier</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 pl-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {state.orders.slice(0, 6).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 pr-3 font-mono font-semibold text-slate-900 tabular-nums">
                      {order.orderNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                      {order.tableLabel || order.roomNumber || order.channel}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800 max-w-[160px] truncate">
                      {order.items[0]?.productName}
                      {order.items.length > 1 ? ` +${order.items.length - 1}` : ''}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {order.cashierName}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                      {formatTimeShort(order.createdAt)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${orderStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 pl-3 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatMoney(order.totalAmount, state.config)}
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
