import React, { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle2,
  XCircle,
  Split,
  BellRing,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  UtensilsCrossed,
  Clock,
} from 'lucide-react';
import { useHospitality } from '../context/HospitalityContext';
import {
  DepartmentName,
  MenuProduct,
  Order,
  OrderChannel,
  OrderPayment,
  PaymentMethod,
} from '../types/hospitality';
import { formatMoney, formatTimeShort } from '../utils/formatters';

interface PosViewProps {
  preselectedTableId?: string;
  publicMode?: boolean;
  onClearPreselectedTable?: () => void;
}

const CATEGORIES = [
  'All Items',
  'Grill & Burgers',
  'Main Dishes',
  'Fresh Juices',
  'Soft Drinks',
  'Beer & Spirits',
  'Coffee & Bakery',
] as const;

const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'POS / Card',
  'Mobile Money',
  'Bank Transfer',
  'Credit / Deferred',
  'Bono Voucher',
];

export const PosView: React.FC<PosViewProps> = ({
  preselectedTableId,
  publicMode = false,
  onClearPreselectedTable,
}) => {
  const { state, currentEmployee, createOrder, updateOrderStatus, hasPermission } =
    useHospitality();

  // 2-Step Order Flow: 'menu' (Product Selection) -> 'payment' (Checkout)
  const [step, setStep] = useState<'menu' | 'payment'>('menu');
  const [showOrdersDrawer, setShowOrdersDrawer] = useState(false);

  const [category, setCategory] = useState<string>('All Items');
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState<OrderChannel>('Dine-In');
  const [selectedTableId, setSelectedTableId] = useState<string>(preselectedTableId || '');
  const [customerName, setCustomerName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [cart, setCart] = useState<{ product: MenuProduct; quantity: number }[]>([]);

  // Payment State
  const [primaryMethod, setPrimaryMethod] = useState<PaymentMethod>('Cash');
  const [splitPayment, setSplitPayment] = useState(false);
  const [secondaryMethod, setSecondaryMethod] = useState<PaymentMethod>('Mobile Money');
  const [secondaryAmount, setSecondaryAmount] = useState<string>('0');
  const [paymentRef, setPaymentRef] = useState('');

  // Feedback & Modals
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const departmentFilteredProducts = useMemo(() => {
    return state.menuProducts.filter(
      (p) => state.activeDepartment === 'All Departments' || p.department === state.activeDepartment
    );
  }, [state.menuProducts, state.activeDepartment]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'All Items': departmentFilteredProducts.length };
    for (const p of departmentFilteredProducts) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [departmentFilteredProducts]);

  const filteredProducts = useMemo(() => {
    return departmentFilteredProducts.filter((p) => {
      const matchesCat = category === 'All Items' || p.category === category;
      const matchesSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [departmentFilteredProducts, category, search]);

  const getItemQty = (productId: string) =>
    cart.find((l) => l.product.id === productId)?.quantity || 0;

  const addToCart = (product: MenuProduct) => {
    if (!product.isAvailable) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setFeedback(null);
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) => {
      const next = prev
        .map((l) => (l.product.id === productId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0);
      if (next.length === 0 && step === 'payment') {
        setStep('menu');
      }
      return next;
    });
  };

  const totalItemsCount = cart.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = cart.reduce(
    (s, l) => s + (l.product.promoPrice ?? l.product.sellingPrice) * l.quantity,
    0
  );
  const taxAmount = Number(((subtotal * state.config.taxRatePercent) / 100).toFixed(2));
  const serviceAmount = Number(((subtotal * state.config.serviceChargePercent) / 100).toFixed(2));
  const grandTotal = Number((subtotal + taxAmount + serviceAmount).toFixed(2));

  const readyOrders = state.orders.filter((o) => o.status === 'Ready');
  const myOrders = state.orders
    .filter((o) =>
      hasPermission('view_dashboard') ? true : o.cashierId === currentEmployee.id
    )
    .slice(0, 8);

  const handleCheckout = () => {
    if (cart.length === 0) {
      setFeedback({ ok: false, text: 'Select at least one item before proceeding to payment.' });
      return;
    }
    if (channel === 'Dine-In' && state.config.enableTableManagement && !selectedTableId) {
      setFeedback({ ok: false, text: 'Please select a table for Dine-In orders.' });
      return;
    }
    if (channel === 'Room Service' && !roomNumber.trim()) {
      setFeedback({ ok: false, text: 'Please enter the hotel room number.' });
      return;
    }

    const payments: OrderPayment[] = [];
    if (splitPayment) {
      const secAmt = Math.min(grandTotal, Math.max(0, Number(secondaryAmount) || 0));
      const priAmt = Number((grandTotal - secAmt).toFixed(2));
      if (priAmt > 0)
        payments.push({ method: primaryMethod, amount: priAmt, reference: paymentRef || undefined });
      if (secAmt > 0) payments.push({ method: secondaryMethod, amount: secAmt });
    } else {
      payments.push({
        method: primaryMethod,
        amount: grandTotal,
        reference: paymentRef || undefined,
      });
    }

    const dept: Exclude<DepartmentName, 'All Departments'> =
      state.activeDepartment === 'All Departments' ? 'Main Restaurant' : state.activeDepartment;

    const result = createOrder({
      channel,
      department: dept,
      tableId: channel === 'Dine-In' ? selectedTableId : undefined,
      customerName,
      roomNumber: channel === 'Room Service' ? roomNumber : undefined,
      items: cart,
      payments,
    });

    if (result.ok && result.order) {
      setCart([]);
      setCustomerName('');
      setRoomNumber('');
      setPaymentRef('');
      setSecondaryAmount('0');
      setSplitPayment(false);
      setStep('menu');
      onClearPreselectedTable?.();
      setReceiptOrder(result.order);
      setFeedback({
        ok: true,
        text: `Order ${result.order.orderNumber} confirmed and sent to Kitchen / Bar.`,
      });
    } else {
      setFeedback({ ok: false, text: result.error || 'Could not create order.' });
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#E8E0D5] text-[#2C1B17] px-4 py-6 sm:px-7 pb-28">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Live Ready Orders Banner (for Staff / Cashiers on /admin) */}
        {!publicMode && state.isAuthenticated && readyOrders.length > 0 && (
          <div className="rounded-xl border border-[#A8846F] bg-[#3B2621] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-[#FAF6F0]">
            <div className="flex items-center gap-2.5 text-xs font-medium">
              <BellRing className="h-4 w-4 text-[#E3C6B0] shrink-0" />
              <span>
                <strong className="text-white">{readyOrders.length} Ready for Collection:</strong>{' '}
                {readyOrders
                  .map((o) => `${o.orderNumber} (${o.tableLabel || o.roomNumber || o.channel})`)
                  .join(' · ')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {readyOrders.slice(0, 3).map((o) => (
                <button
                  key={o.id}
                  onClick={() => updateOrderStatus(o.id, 'Completed')}
                  className="rounded-lg bg-[#A8846F] px-3 py-1.5 text-xs font-semibold text-[#2C1B17] hover:bg-[#C49B82] transition-colors whitespace-nowrap"
                >
                  Deliver &amp; Close {o.orderNumber}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Centered Espresso Hero Header & Order Progress (Color Companion) */}
        <div className="rounded-2xl border border-[#523730] bg-gradient-to-b from-[#3B2621] to-[#2C1B17] px-6 py-7 text-center shadow-lg">
          <div className="mx-auto max-w-3xl space-y-4">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-[#FAF6F0] leading-tight">
              {step === 'menu' ? 'Kitchen & Bar Food Menu' : 'Complete Order & Payment'}
            </h2>
            <p className="text-xs sm:text-sm text-[#DFD3C6]">
              {step === 'menu'
                ? 'Step 1 of 2 · Browse freshly crafted dishes, grilled specialties, juices & coffees, then proceed to payment'
                : 'Step 2 of 2 · Confirm your table or service channel and complete payment'}
            </p>

            {/* Centered 2-Step Segmented Indicator + Optional Staff Orders Button */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <div className="inline-flex items-center rounded-xl border border-[#5C3E36] bg-[#221411] p-1">
                <button
                  type="button"
                  onClick={() => setStep('menu')}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
                    step === 'menu'
                      ? 'bg-[#A8846F] text-[#221411]'
                      : 'text-[#DFD3C6] hover:text-white'
                  }`}
                >
                  1. Product Selection
                </button>
                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={() => setStep('payment')}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                    step === 'payment'
                      ? 'bg-[#A8846F] text-[#221411]'
                      : 'text-[#DFD3C6] hover:text-white'
                  }`}
                >
                  2. Payment ({totalItemsCount})
                </button>
              </div>

              {!publicMode && state.isAuthenticated && (
                <button
                  type="button"
                  onClick={() => setShowOrdersDrawer((v) => !v)}
                  className="flex items-center gap-1.5 rounded-xl border border-[#6E4D43] bg-[#4A312B] px-3.5 py-2 text-xs font-semibold text-[#FAF6F0] hover:bg-[#5C3E36] transition-colors whitespace-nowrap"
                >
                  <Clock className="h-3.5 w-3.5 text-[#E3C6B0]" />
                  {showOrdersDrawer ? 'Hide History' : `Orders (${myOrders.length})`}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Success / Error Toast */}
        {feedback && (
          <div
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-medium ${
              feedback.ok
                ? 'border-emerald-700/30 bg-emerald-50 text-emerald-900'
                : 'border-red-700/30 bg-red-50 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-red-700 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs underline opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Authenticated Recent Orders Drawer */}
        {!publicMode && state.isAuthenticated && showOrdersDrawer && (
          <div className="rounded-2xl border border-[#D4C9BC] bg-[#FAF6F0] p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-[#2C1B17]">
                Recent POS Orders &amp; Status
              </h3>
              <span className="text-xs text-[#6B534B]">Operator: {currentEmployee.name}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#D4C9BC] text-[11px] font-semibold text-[#6B534B]">
                    <th className="py-2 pr-3">Order</th>
                    <th className="py-2 px-3">Channel / Table</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Time</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 pl-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E0D5]">
                  {myOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#EFE9E0]">
                      <td className="py-2.5 pr-3 font-mono font-semibold text-[#2C1B17] tabular-nums">
                        {o.orderNumber}
                      </td>
                      <td className="py-2.5 px-3 text-[#4A312B]">
                        {o.tableLabel ? `Table ${o.tableLabel}` : o.roomNumber || o.channel}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="rounded bg-[#EFE9E0] px-2 py-0.5 text-[11px] font-semibold text-[#3B2621]">
                          {o.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#6B534B] tabular-nums">
                        {formatTimeShort(o.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#2C1B17] tabular-nums">
                        {formatMoney(o.totalAmount, state.config)}
                      </td>
                      <td className="py-2.5 pl-3 text-right space-x-3 whitespace-nowrap">
                        <button
                          onClick={() => setReceiptOrder(o)}
                          className="text-xs font-semibold text-[#3B2621] hover:underline"
                        >
                          Receipt
                        </button>
                        {o.status !== 'Completed' && o.status !== 'Cancelled' && (
                          <button
                            onClick={() => updateOrderStatus(o.id, 'Completed')}
                            className="text-xs font-semibold text-emerald-700 hover:underline"
                          >
                            Complete
                          </button>
                        )}
                        {o.status !== 'Cancelled' &&
                          o.status !== 'Completed' &&
                          hasPermission('pos_cancel') && (
                            <button
                              onClick={() => setCancelTarget(o)}
                              className="text-xs font-semibold text-red-700 hover:underline"
                            >
                              Cancel
                            </button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== STEP 1: INTERACTIVE PHOTO MENU ==================== */}
        {step === 'menu' && (
          <div className="space-y-6">
            {/* Search & Category Filter Bar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#D4C9BC] bg-[#F7F3ED] p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      category === cat
                        ? 'bg-[#3B2621] text-[#FAF6F0]'
                        : 'bg-[#EAE3DA] text-[#3B2621] hover:bg-[#DFD4C6]'
                    }`}
                  >
                    {cat} ({categoryCounts[cat] || 0})
                  </button>
                ))}
              </div>

              <div className="relative w-full lg:w-72 shrink-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B534B]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search dishes, drinks, or SKU..."
                  className="w-full rounded-xl border border-[#D4C9BC] bg-white py-2 pl-9 pr-3 text-sm text-[#2C1B17] placeholder:text-[#8A746C] outline-none focus:border-[#3B2621] transition-colors"
                />
              </div>
            </div>

            {/* Food & Beverage Photo Grid (40+ Items) */}
            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-[#D4C9BC] bg-[#FAF6F0] p-12 text-center text-sm text-[#6B534B]">
                No menu items match your search or category filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => {
                  const price = product.promoPrice ?? product.sellingPrice;
                  const qty = getItemQty(product.id);
                  const isSelected = qty > 0;

                  return (
                    <div
                      key={product.id}
                      className={`group flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 ${
                        !product.isAvailable
                          ? 'border-[#D4C9BC] bg-[#EFE9E0] opacity-60'
                          : isSelected
                          ? 'border-[#3B2621] bg-[#FAF6F0] ring-2 ring-[#3B2621]/25 shadow-md'
                          : 'border-[#D4C9BC] bg-[#FAF6F0] hover:border-[#A8846F] hover:-translate-y-0.5 hover:shadow-md'
                      }`}
                    >
                      {/* 4:3 Culinary Photo */}
                      <div
                        onClick={() => product.isAvailable && addToCart(product)}
                        className={`relative aspect-[4/3] w-full overflow-hidden bg-[#DFD4C6] ${
                          product.isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'
                        }`}
                      >
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#EFE9E0] to-[#D4C9BC] text-[#3B2621]">
                            <UtensilsCrossed className="h-8 w-8 text-[#8B6754]" />
                            <span className="text-xs font-medium">{product.category}</span>
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#221411]/80 via-transparent to-transparent" />

                        {/* Bottom-left Price Overlay with Measured Espresso Scrim */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-base font-bold text-[#FAF6F0] tabular-nums drop-shadow">
                              {formatMoney(price, state.config)}
                            </span>
                            {product.promoPrice && (
                              <span className="font-mono text-xs text-[#DFD3C6] line-through tabular-nums">
                                {formatMoney(product.sellingPrice, state.config)}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <span className="rounded-md bg-[#A8846F] px-2 py-0.5 font-mono text-xs font-bold text-[#221411] tabular-nums">
                              {qty} in order
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Content & Interactive Controls */}
                      <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
                        <div>
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#7A625A]">
                            <span>{product.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>{product.station}</span>
                          </div>
                          <h3 className="mt-1 font-display text-base font-bold text-[#2C1B17] leading-snug">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="mt-1 text-xs text-[#59433C] line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-1">
                          {!product.isAvailable ? (
                            <div className="w-full rounded-xl border border-[#D4C9BC] bg-[#EFE9E0] py-2.5 text-center text-xs font-semibold text-[#6B534B]">
                              Currently Unavailable
                            </div>
                          ) : qty === 0 ? (
                            <button
                              type="button"
                              onClick={() => addToCart(product)}
                              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#3B2621] py-2.5 text-xs font-semibold text-[#FAF6F0] hover:bg-[#523730] transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                              Add to Order
                            </button>
                          ) : (
                            <div className="flex items-center justify-between rounded-xl border border-[#3B2621] bg-[#EFE9E0] p-1">
                              <button
                                type="button"
                                onClick={() => updateCartQty(product.id, -1)}
                                className="flex h-8 w-10 items-center justify-center rounded-lg bg-[#FAF6F0] text-[#2C1B17] hover:bg-[#DFD4C6] transition-colors"
                                aria-label={`Decrease ${product.name}`}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="font-mono text-sm font-bold text-[#2C1B17] tabular-nums">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateCartQty(product.id, 1)}
                                className="flex h-8 w-10 items-center justify-center rounded-lg bg-[#3B2621] text-[#FAF6F0] hover:bg-[#523730] transition-colors"
                                aria-label={`Increase ${product.name}`}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== STEP 2: TABLE & PAYMENT CHECKOUT ==================== */}
        {step === 'payment' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left: Selected Items Review */}
            <div className="lg:col-span-7 rounded-2xl border border-[#D4C9BC] bg-[#FAF6F0] p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#D4C9BC] pb-4">
                <div>
                  <h3 className="font-display text-base font-bold text-[#2C1B17]">
                    Review Selected Items ({totalItemsCount})
                  </h3>
                  <p className="text-xs text-[#6B534B]">
                    Adjust quantities or return to the menu to add more dishes
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('menu')}
                  className="flex items-center gap-1.5 rounded-lg border border-[#D4C9BC] bg-[#EFE9E0] px-3 py-2 text-xs font-semibold text-[#2C1B17] hover:bg-[#DFD4C6] transition-colors whitespace-nowrap"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Menu
                </button>
              </div>

              <div className="divide-y divide-[#E8E0D5]">
                {cart.map(({ product, quantity }) => {
                  const unitPrice = product.promoPrice ?? product.sellingPrice;
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-4 py-3.5 first:pt-0"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            referrerPolicy="no-referrer"
                            className="h-14 w-16 shrink-0 rounded-lg object-cover bg-[#EFE9E0]"
                          />
                        ) : (
                          <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-lg bg-[#EFE9E0] text-[#3B2621]">
                            <UtensilsCrossed className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[#2C1B17] truncate">
                            {product.name}
                          </div>
                          <div className="mt-0.5 font-mono text-xs text-[#6B534B] tabular-nums">
                            {formatMoney(unitPrice, state.config)} · {product.station}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center rounded-lg border border-[#D4C9BC] bg-[#EFE9E0]">
                          <button
                            type="button"
                            onClick={() => updateCartQty(product.id, -1)}
                            className="p-2 text-[#4A312B] hover:text-[#2C1B17]"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-7 text-center font-mono text-xs font-bold text-[#2C1B17] tabular-nums">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(product.id, 1)}
                            className="p-2 text-[#4A312B] hover:text-[#2C1B17]"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <span className="w-24 text-right font-mono text-sm font-bold text-[#2C1B17] tabular-nums">
                          {formatMoney(unitPrice * quantity, state.config)}
                        </span>

                        <button
                          type="button"
                          onClick={() => updateCartQty(product.id, -quantity)}
                          className="p-1.5 text-[#7A625A] hover:text-red-700"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals Summary */}
              <div className="rounded-xl border border-[#D4C9BC] bg-[#EFE9E0] p-4 space-y-2 text-xs">
                <div className="flex justify-between text-[#59433C]">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium text-[#2C1B17] tabular-nums">
                    {formatMoney(subtotal, state.config)}
                  </span>
                </div>
                <div className="flex justify-between text-[#59433C]">
                  <span>VAT / Tax ({state.config.taxRatePercent}%)</span>
                  <span className="font-mono font-medium text-[#2C1B17] tabular-nums">
                    {formatMoney(taxAmount, state.config)}
                  </span>
                </div>
                <div className="flex justify-between text-[#59433C]">
                  <span>Service Charge ({state.config.serviceChargePercent}%)</span>
                  <span className="font-mono font-medium text-[#2C1B17] tabular-nums">
                    {formatMoney(serviceAmount, state.config)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#D4C9BC] pt-2.5 text-sm font-bold text-[#2C1B17]">
                  <span>Total Payable</span>
                  <span className="font-mono text-lg text-[#3B2621] tabular-nums">
                    {formatMoney(grandTotal, state.config)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Service Type & Payment Selection */}
            <div className="lg:col-span-5 rounded-2xl border border-[#D4C9BC] bg-[#FAF6F0] p-6 space-y-5 shadow-sm">
              <div className="border-b border-[#D4C9BC] pb-3">
                <h3 className="font-display text-base font-bold text-[#2C1B17]">
                  Service Type &amp; Payment
                </h3>
                <p className="text-xs text-[#6B534B]">
                  Routes food to Kitchen Display &amp; drinks to Bar automatically
                </p>
              </div>

              {/* Channel Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#3B2621]">Order Channel</label>
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#EFE9E0] p-1">
                  {(['Dine-In', 'Takeaway', 'Room Service'] as OrderChannel[]).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setChannel(ch)}
                      className={`rounded-lg py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                        channel === ch
                          ? 'bg-[#3B2621] text-[#FAF6F0]'
                          : 'text-[#59433C] hover:text-[#2C1B17]'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table / Room / Guest Inputs */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {channel === 'Dine-In' && state.config.enableTableManagement && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#3B2621]">
                      Select Table
                    </label>
                    <select
                      value={selectedTableId}
                      onChange={(e) => setSelectedTableId(e.target.value)}
                      className="w-full rounded-xl border border-[#D4C9BC] bg-white px-3 py-2.5 text-xs font-medium text-[#2C1B17] outline-none focus:border-[#3B2621]"
                    >
                      <option value="">Choose Table...</option>
                      {state.tables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.status} · {t.area})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {channel === 'Room Service' && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#3B2621]">
                      Room Number
                    </label>
                    <input
                      type="text"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      placeholder="e.g. Room 304"
                      className="w-full rounded-xl border border-[#D4C9BC] bg-white px-3 py-2.5 text-xs text-[#2C1B17] placeholder:text-[#8A746C] outline-none focus:border-[#3B2621]"
                    />
                  </div>
                )}

                <div className={channel === 'Takeaway' ? 'sm:col-span-2' : ''}>
                  <label className="mb-1 block text-xs font-semibold text-[#3B2621]">
                    Guest Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in or guest name"
                    className="w-full rounded-xl border border-[#D4C9BC] bg-white px-3 py-2.5 text-xs text-[#2C1B17] placeholder:text-[#8A746C] outline-none focus:border-[#3B2621]"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#3B2621]">Payment Method</label>
                  <button
                    type="button"
                    onClick={() => setSplitPayment((v) => !v)}
                    className="flex items-center gap-1 text-xs font-semibold text-[#8B6754] hover:text-[#3B2621] hover:underline"
                  >
                    <Split className="h-3.5 w-3.5" />
                    {splitPayment ? 'Single Payment' : 'Split Payment'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPrimaryMethod(pm)}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors text-left truncate ${
                        primaryMethod === pm
                          ? 'border-[#3B2621] bg-[#3B2621] text-[#FAF6F0]'
                          : 'border-[#D4C9BC] bg-white text-[#3B2621] hover:border-[#A8846F]'
                      }`}
                    >
                      {pm}
                    </button>
                  ))}
                </div>

                {splitPayment && (
                  <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-[#D4C9BC] bg-[#EFE9E0] p-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[#59433C]">
                        Second Method
                      </label>
                      <select
                        value={secondaryMethod}
                        onChange={(e) => setSecondaryMethod(e.target.value as PaymentMethod)}
                        className="w-full rounded-lg border border-[#D4C9BC] bg-white px-2.5 py-2 text-xs text-[#2C1B17]"
                      >
                        {PAYMENT_METHODS.map((pm) => (
                          <option key={pm} value={pm}>
                            {pm}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[#59433C]">
                        Second Amount
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={grandTotal}
                        value={secondaryAmount}
                        onChange={(e) => setSecondaryAmount(e.target.value)}
                        className="w-full rounded-lg border border-[#D4C9BC] bg-white px-2.5 py-2 font-mono text-xs text-[#2C1B17] tabular-nums"
                      />
                    </div>
                  </div>
                )}

                {(primaryMethod === 'Bank Transfer' ||
                  primaryMethod === 'Mobile Money' ||
                  primaryMethod === 'Credit / Deferred') && (
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="Transaction / Folio Reference (optional)"
                    className="w-full rounded-xl border border-[#D4C9BC] bg-white px-3 py-2.5 font-mono text-xs text-[#2C1B17] placeholder:text-[#8A746C] outline-none focus:border-[#3B2621]"
                  />
                )}
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3B2621] py-3.5 text-sm font-bold text-[#FAF6F0] hover:bg-[#523730] transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm Order &amp; Pay ({formatMoney(grandTotal, state.config)})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Espresso Order Tray Bar during Step 1 (Product Selection) */}
      {step === 'menu' && (
        <div
          className={`no-print fixed bottom-0 right-0 left-0 z-20 border-t border-[#523730] bg-[#2C1B17]/95 backdrop-blur-md px-4 py-3.5 sm:px-7 ${
            !publicMode && state.isAuthenticated ? 'lg:left-64' : ''
          }`}
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A8846F]/25 text-[#E3C6B0]">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#FAF6F0]">
                  {totalItemsCount === 0
                    ? 'Select items from the menu to start an order'
                    : `${totalItemsCount} ${totalItemsCount === 1 ? 'item' : 'items'} selected`}
                </div>
                <div className="text-xs text-[#D4C4B7] truncate">
                  {totalItemsCount === 0
                    ? 'Tap any food or beverage photo above'
                    : cart.map((c) => `${c.quantity}x ${c.product.name}`).join(' · ')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {totalItemsCount > 0 && (
                <>
                  <div className="text-right pr-2">
                    <div className="text-[11px] text-[#D4C4B7]">Estimated Total</div>
                    <div className="font-mono text-base font-bold text-[#FAF6F0] tabular-nums">
                      {formatMoney(grandTotal, state.config)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="rounded-xl border border-[#6E4D43] px-3.5 py-2.5 text-xs font-semibold text-[#FAF6F0] hover:bg-[#4A312B] transition-colors"
                  >
                    Clear
                  </button>
                </>
              )}
              <button
                type="button"
                disabled={totalItemsCount === 0}
                onClick={() => {
                  setStep('payment');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-2 rounded-xl bg-[#EAE3DA] px-5 py-2.5 text-xs sm:text-sm font-bold text-[#2C1B17] hover:bg-[#FAF6F0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                <span>Proceed to Payment</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal (High-Contrast Paper Thermal Receipt) */}
      {receiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 text-slate-900 shadow-2xl space-y-4">
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <div className="font-display text-base font-bold text-slate-900">
                {state.config.hotelName}
              </div>
              <div className="text-xs text-slate-500">{state.config.address}</div>
              <div className="text-xs text-slate-500 font-mono">{state.config.phone}</div>
            </div>

            <div className="text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Order:</span>
                <span className="font-bold">{receiptOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{receiptOrder.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Target:</span>
                <span>
                  {receiptOrder.tableLabel
                    ? `Table ${receiptOrder.tableLabel}`
                    : receiptOrder.roomNumber || receiptOrder.channel}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{formatTimeShort(receiptOrder.createdAt)}</span>
              </div>
            </div>

            <div className="border-y border-dashed border-slate-300 py-2.5 space-y-1.5 text-xs">
              {receiptOrder.items.map((it) => (
                <div key={it.id} className="flex justify-between gap-2">
                  <span>
                    {it.quantity}x {it.productName}
                  </span>
                  <span className="font-mono tabular-nums">
                    {formatMoney(it.unitPrice * it.quantity, state.config)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatMoney(receiptOrder.subtotal, state.config)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax + Service</span>
                <span>
                  {formatMoney(
                    receiptOrder.taxAmount + receiptOrder.serviceChargeAmount,
                    state.config
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
                <span>TOTAL</span>
                <span>{formatMoney(receiptOrder.totalAmount, state.config)}</span>
              </div>
              <div className="pt-1 text-[11px] text-slate-500">
                Paid:{' '}
                {receiptOrder.payments
                  .map((p) => `${p.method} (${formatMoney(p.amount, state.config)})`)
                  .join(', ')}
              </div>
            </div>

            <p className="text-center text-[11px] text-slate-500 pt-1">
              {state.config.receiptFooter}
            </p>

            <div className="no-print flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#2C1B17] py-2 text-xs font-semibold text-white hover:bg-[#3B2621]"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Receipt
              </button>
              <button
                onClick={() => setReceiptOrder(null)}
                className="flex-1 rounded-lg bg-[#A8846F] py-2 text-xs font-semibold text-[#221411] hover:bg-[#C49B82]"
              >
                New Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Reason Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 text-slate-900 shadow-xl space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900">
              Cancel Order {cancelTarget.orderNumber}
            </h3>
            <p className="text-xs text-slate-600">
              Per audit policy, every order cancellation requires a recorded reason.{' '}
              {cancelTarget.prepStartedAt
                ? 'Preparation already started — cancellation will be flagged for manager waste review.'
                : 'Preparation has not started — reserved inventory will be reversed automatically.'}
            </p>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter cancellation reason (e.g., Guest changed mind)"
              className="w-full rounded-lg border border-[#E8ECF2] px-3 py-2 text-sm outline-none focus:border-[#3B2621]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setCancelTarget(null);
                  setCancelReason('');
                }}
                className="rounded-lg border border-[#E8ECF2] px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Keep Order
              </button>
              <button
                onClick={() => {
                  updateOrderStatus(
                    cancelTarget.id,
                    'Cancelled',
                    cancelReason || 'Customer requested'
                  );
                  setCancelTarget(null);
                  setCancelReason('');
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
