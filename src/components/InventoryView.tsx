import React, { useMemo, useState } from 'react';
import { ArrowRightLeft, PackagePlus, AlertTriangle, ChefHat, History } from 'lucide-react';
import { useHospitality } from '../context/HospitalityContext';
import { StockLocation } from '../types/hospitality';
import { formatDateTimeShort, formatMoney } from '../utils/formatters';

const LOCATIONS: ('All Locations' | StockLocation)[] = [
  'All Locations',
  'Main Store',
  'Bar Store',
  'Kitchen Store',
  'Restaurant Store',
];

export const InventoryView: React.FC = () => {
  const {
    state,
    getProductCost,
    receiveStock,
    transferStock,
    adjustStock,
    toggleProductAvailability,
  } = useHospitality();

  const [activeTab, setActiveTab] = useState<'stock' | 'recipes' | 'movements'>('stock');
  const [locationFilter, setLocationFilter] = useState<'All Locations' | StockLocation>('All Locations');
  const [search, setSearch] = useState('');

  // Stock Action Modals
  const [actionMode, setActionMode] = useState<'receive' | 'transfer' | 'adjust' | null>(null);
  const [selectedStockId, setSelectedStockId] = useState(state.stockItems[0]?.id || '');
  const [fromLoc, setFromLoc] = useState<StockLocation>('Main Store');
  const [toLoc, setToLoc] = useState<StockLocation>('Bar Store');
  const [qtyInput, setQtyInput] = useState('10');
  const [refOrNote, setRefOrNote] = useState('');
  const [adjustType, setAdjustType] = useState<'Wastage / Damage' | 'Adjustment'>('Wastage / Damage');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const lowStockItems = useMemo(
    () =>
      state.stockItems.filter((item) => {
        const total = Object.values(item.quantities).reduce((a, b) => a + b, 0);
        return total <= item.minStockLevel;
      }),
    [state.stockItems]
  );

  const totalValuation = useMemo(
    () =>
      state.stockItems.reduce((sum, item) => {
        const qty =
          locationFilter === 'All Locations'
            ? Object.values(item.quantities).reduce((a, b) => a + b, 0)
            : item.quantities[locationFilter] || 0;
        return sum + qty * item.purchasePrice;
      }, 0),
    [state.stockItems, locationFilter]
  );

  const filteredStock = state.stockItems.filter(
    (s) =>
      !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numQty = Number(qtyInput);
    if (!Number.isFinite(numQty) || numQty === 0) return;

    if (actionMode === 'receive') {
      receiveStock(selectedStockId, toLoc, Math.abs(numQty), refOrNote || 'PO-MANUAL', 'Received at store');
      setFeedback({ ok: true, text: `Stock receipt recorded into ${toLoc}.` });
      setActionMode(null);
    } else if (actionMode === 'transfer') {
      const res = transferStock(selectedStockId, fromLoc, toLoc, Math.abs(numQty), refOrNote);
      setFeedback({ ok: res.ok, text: res.message });
      if (res.ok) setActionMode(null);
    } else if (actionMode === 'adjust') {
      const delta = adjustType === 'Wastage / Damage' ? -Math.abs(numQty) : numQty;
      adjustStock(selectedStockId, fromLoc, delta, adjustType, refOrNote || adjustType);
      setFeedback({ ok: true, text: `${adjustType} logged for ${fromLoc}.` });
      setActionMode(null);
    }
    setRefOrNote('');
  };

  return (
    <div className="space-y-6">
      {/* Inventory Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
          <div className="text-xs font-medium text-slate-500">
            Valuation ({locationFilter})
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatMoney(totalValuation, state.config)}
          </div>
        </div>
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Tracked SKUs &amp; Ingredients</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {state.stockItems.length} items
          </div>
        </div>
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Low-Stock Alerts</div>
          <div className="mt-1 flex items-center gap-2 font-mono text-2xl font-bold text-amber-700 tabular-nums">
            <span>{lowStockItems.length}</span>
            {lowStockItems.length > 0 && <AlertTriangle className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {/* Main Sub-Navigation & Operations Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-[#E8ECF2] bg-white p-1">
          <button
            onClick={() => setActiveTab('stock')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'stock' ? 'bg-[#181C24] text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Multi-Store Stock
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'recipes' ? 'bg-[#181C24] text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ChefHat className="h-3.5 w-3.5" />
            Recipes (BOM) &amp; Costing
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'movements' ? 'bg-[#181C24] text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Stock Movements ({state.stockMovements.length})
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setActionMode('receive');
              setToLoc('Main Store');
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[#FF5A1F] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#E64A12] whitespace-nowrap"
          >
            <PackagePlus className="h-3.5 w-3.5" />
            Receive Purchase
          </button>
          <button
            onClick={() => {
              setActionMode('transfer');
              setFromLoc('Main Store');
              setToLoc('Bar Store');
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[#181C24] px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Transfer Store
          </button>
          <button
            onClick={() => {
              setActionMode('adjust');
              setFromLoc('Bar Store');
            }}
            className="rounded-lg border border-[#E8ECF2] bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            Wastage / Adjust
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-xs font-medium ${
            feedback.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Tab 1: Multi-Store Stock */}
      {activeTab === 'stock' && (
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5 rounded-lg bg-[#F7F8FA] p-1">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setLocationFilter(loc)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    locationFilter === loc ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU or ingredient..."
              className="rounded-lg border border-[#E8ECF2] px-3 py-1.5 text-xs outline-none focus:border-[#FF5A1F]"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E8ECF2] text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 pr-3">SKU</th>
                  <th className="py-2.5 px-3">Product / Ingredient</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Main</th>
                  <th className="py-2.5 px-3 text-right">Bar</th>
                  <th className="py-2.5 px-3 text-right">Kitchen</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-right">Unit Cost</th>
                  <th className="py-2.5 pl-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredStock.map((item) => {
                  const total = Object.values(item.quantities).reduce((a, b) => a + b, 0);
                  const isLow = total <= item.minStockLevel;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="py-3 pr-3 font-mono text-slate-500">{item.sku}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-3 px-3 text-slate-600">{item.category}</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {item.quantities['Main Store'].toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {item.quantities['Bar Store'].toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {item.quantities['Kitchen Store'].toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {total.toFixed(1)} {item.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 tabular-nums">
                        {formatMoney(item.purchasePrice, state.config)}
                      </td>
                      <td className="py-3 pl-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${
                            isLow
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isLow ? `Low (≤${item.minStockLevel})` : 'Healthy'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Recipes (BOM) & Product Costing */}
      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {state.menuProducts.map((product) => {
            const unitCost = getProductCost(product);
            const price = product.promoPrice ?? product.sellingPrice;
            const profit = price - unitCost;
            const margin = price > 0 ? Math.round((profit / price) * 100) : 0;

            return (
              <div
                key={product.id}
                className="rounded-xl border border-[#E8ECF2] bg-white p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{product.sku}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-600">{product.station}</span>
                    </div>
                    <h3 className="mt-0.5 font-display text-sm font-bold text-slate-900">
                      {product.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => toggleProductAvailability(product.id)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                      product.isAvailable
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {product.isAvailable ? 'Active on POS' : 'Disabled'}
                  </button>
                </div>

                {/* BOM Breakdown */}
                <div className="rounded-lg bg-[#F7F8FA] p-3 text-xs space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500">
                    Bill of Materials (Deducted Automatically on Sale / Bono)
                  </div>
                  {product.directStockItemId ? (
                    <div className="flex justify-between">
                      <span>
                        1x{' '}
                        {state.stockItems.find((s) => s.id === product.directStockItemId)?.name}
                      </span>
                      <span className="font-mono text-slate-600">
                        {formatMoney(unitCost, state.config)}
                      </span>
                    </div>
                  ) : (
                    product.recipe?.map((ing) => {
                      const stk = state.stockItems.find((s) => s.id === ing.stockItemId);
                      return (
                        <div key={ing.stockItemId} className="flex justify-between">
                          <span>
                            {stk?.name} ({ing.quantity} {stk?.unit})
                          </span>
                          <span className="font-mono text-slate-600 tabular-nums">
                            {formatMoney((stk?.purchasePrice || 0) * ing.quantity, state.config)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-600">
                    Ingredient Cost:{' '}
                    <strong className="font-mono text-slate-900">
                      {formatMoney(unitCost, state.config)}
                    </strong>
                  </span>
                  <span className="text-slate-600">
                    Selling:{' '}
                    <strong className="font-mono text-slate-900">
                      {formatMoney(price, state.config)}
                    </strong>
                  </span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {margin}% Margin
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Stock Movements Audit */}
      {activeTab === 'movements' && (
        <div className="rounded-xl border border-[#E8ECF2] bg-white p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E8ECF2] text-[11px] font-semibold text-slate-500">
                  <th className="py-2 pr-3">Timestamp</th>
                  <th className="py-2 px-3">Movement Type</th>
                  <th className="py-2 px-3">Item</th>
                  <th className="py-2 px-3">Store Route</th>
                  <th className="py-2 px-3 text-right">Qty</th>
                  <th className="py-2 px-3">Ref</th>
                  <th className="py-2 pl-3">Employee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {state.stockMovements.slice(0, 30).map((m) => (
                  <tr key={m.id}>
                    <td className="py-2.5 pr-3 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTimeShort(m.timestamp)}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{m.type}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{m.stockItemName}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {m.fromLocation && m.toLocation
                        ? `${m.fromLocation} -> ${m.toLocation}`
                        : m.toLocation || m.fromLocation}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold tabular-nums ${
                        m.quantityDelta >= 0 ? 'text-emerald-700' : 'text-[#FF5A1F]'
                      }`}
                    >
                      {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{m.reference}</td>
                    <td className="py-2.5 pl-3 text-slate-600">{m.employeeName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Action Modal */}
      {actionMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleActionSubmit}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4"
          >
            <h3 className="font-display text-base font-bold text-slate-900">
              {actionMode === 'receive'
                ? 'Receive Purchase Stock'
                : actionMode === 'transfer'
                ? 'Internal Store Transfer'
                : 'Record Wastage or Stock Adjustment'}
            </h3>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Stock Item
              </label>
              <select
                value={selectedStockId}
                onChange={(e) => setSelectedStockId(e.target.value)}
                className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs"
              >
                {state.stockItems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.sku} · Total:{' '}
                    {Object.values(s.quantities).reduce((a, b) => a + b, 0).toFixed(1)} {s.unit})
                  </option>
                ))}
              </select>
            </div>

            {actionMode === 'transfer' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">From</label>
                  <select
                    value={fromLoc}
                    onChange={(e) => setFromLoc(e.target.value as StockLocation)}
                    className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs"
                  >
                    {(['Main Store', 'Bar Store', 'Kitchen Store', 'Restaurant Store'] as StockLocation[]).map(
                      (l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">To</label>
                  <select
                    value={toLoc}
                    onChange={(e) => setToLoc(e.target.value as StockLocation)}
                    className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs"
                  >
                    {(['Bar Store', 'Kitchen Store', 'Restaurant Store', 'Main Store'] as StockLocation[]).map(
                      (l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            )}

            {actionMode === 'receive' && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Destination Store
                </label>
                <select
                  value={toLoc}
                  onChange={(e) => setToLoc(e.target.value as StockLocation)}
                  className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs"
                >
                  {(['Main Store', 'Bar Store', 'Kitchen Store', 'Restaurant Store'] as StockLocation[]).map(
                    (l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            {actionMode === 'adjust' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Store</label>
                  <select
                    value={fromLoc}
                    onChange={(e) => setFromLoc(e.target.value as StockLocation)}
                    className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs"
                  >
                    {(['Bar Store', 'Kitchen Store', 'Main Store', 'Restaurant Store'] as StockLocation[]).map(
                      (l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Reason Type</label>
                  <select
                    value={adjustType}
                    onChange={(e) =>
                      setAdjustType(e.target.value as 'Wastage / Damage' | 'Adjustment')
                    }
                    className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs"
                  >
                    <option value="Wastage / Damage">Wastage / Damage (-)</option>
                    <option value="Adjustment">Inventory Count (+)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Quantity</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={qtyInput}
                  onChange={(e) => setQtyInput(e.target.value)}
                  className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 font-mono text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Reference / Note
                </label>
                <input
                  type="text"
                  value={refOrNote}
                  onChange={(e) => setRefOrNote(e.target.value)}
                  placeholder="PO# or reason"
                  className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionMode(null)}
                className="rounded-lg border border-[#E8ECF2] px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#FF5A1F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#E64A12]"
              >
                Confirm Stock Update
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
