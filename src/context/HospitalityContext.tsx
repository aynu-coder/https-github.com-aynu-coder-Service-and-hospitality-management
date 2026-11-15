import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AuditLogEntry,
  BonoRecord,
  BonoType,
  CashierShift,
  DepartmentName,
  DiningTable,
  Employee,
  ExpenseCategory,
  ExpenseRecord,
  HospitalityState,
  MenuProduct,
  Order,
  OrderChannel,
  OrderPayment,
  OrderStatus,
  PaymentMethod,
  PermissionKey,
  PropertyConfig,
  RecipeIngredient,
  StockItem,
  StockLocation,
  StockMovement,
  SystemNotification,
  TableStatus,
  UserRole,
} from '../types/hospitality';
import { INITIAL_HOSPITALITY_STATE } from '../data/seedData';

const STORAGE_KEY = 'beltech_hospitality_platform_v1';

interface CreateOrderInput {
  channel: OrderChannel;
  department: Exclude<DepartmentName, 'All Departments'>;
  tableId?: string;
  customerName?: string;
  roomNumber?: string;
  items: { product: MenuProduct; quantity: number }[];
  payments: OrderPayment[];
  bonoCodeToRedeem?: string;
}

interface IssueBonoInput {
  type: BonoType;
  accountingMode: BonoRecord['accountingMode'];
  valueAmount: number;
  eligibleProductId?: string;
  eligibleCategory?: string;
  customerOrEvent: string;
  quantity: number;
  validDays: number;
}

interface RedeemBonoResult {
  ok: boolean;
  message: string;
  bono?: BonoRecord;
}

interface HospitalityContextValue {
  state: HospitalityState;
  currentEmployee: Employee;
  hasPermission: (perm: PermissionKey) => boolean;
  loginWithPassword: (username: string, password: string) => { ok: boolean; error?: string; employee?: Employee };
  logout: () => void;
  updateEmployeePassword: (employeeId: string, newPassword: string) => void;
  addEmployee: (input: {
    name: string;
    username: string;
    password: string;
    role: UserRole;
    department: Exclude<DepartmentName, 'All Departments'>;
  }) => { ok: boolean; error?: string; employee?: Employee };
  updateEmployee: (
    employeeId: string,
    partial: Partial<Pick<Employee, 'name' | 'username' | 'password' | 'role' | 'department' | 'status'>>
  ) => { ok: boolean; error?: string };
  deleteEmployee: (employeeId: string) => { ok: boolean; error?: string };
  switchEmployee: (employeeId: string) => void;
  setActiveDepartment: (dept: DepartmentName) => void;
  getProductCost: (product: MenuProduct) => number;
  createOrder: (input: CreateOrderInput) => { ok: boolean; order?: Order; error?: string };
  updateOrderStatus: (orderId: string, nextStatus: OrderStatus, reason?: string) => void;
  updateTableStatus: (tableId: string, status: TableStatus, reservationName?: string, reservationTime?: string) => void;
  transferTableOrder: (fromTableId: string, toTableId: string) => { ok: boolean; message: string };
  mergeTables: (sourceTableId: string, targetTableId: string) => { ok: boolean; message: string };
  issueBonos: (input: IssueBonoInput) => BonoRecord[];
  redeemBono: (code: string, selectedProductId?: string, note?: string) => RedeemBonoResult;
  cancelBono: (bonoId: string, reason: string) => void;
  receiveStock: (stockItemId: string, location: StockLocation, quantity: number, reference: string, note?: string) => void;
  transferStock: (stockItemId: string, fromLocation: StockLocation, toLocation: StockLocation, quantity: number, note?: string) => { ok: boolean; message: string };
  adjustStock: (stockItemId: string, location: StockLocation, delta: number, type: 'Wastage / Damage' | 'Adjustment', note: string) => void;
  updateProductRecipe: (productId: string, recipe: RecipeIngredient[]) => void;
  toggleProductAvailability: (productId: string) => void;
  openCashierShift: (openingCash: number, department: Exclude<DepartmentName, 'All Departments'>) => { ok: boolean; message: string };
  closeCashierShift: (shiftId: string, actualCash: number, note?: string) => void;
  approveCashierShift: (shiftId: string) => void;
  addExpense: (input: {
    category: ExpenseCategory;
    department: Exclude<DepartmentName, 'All Departments'>;
    amount: number;
    paymentMethod: Exclude<PaymentMethod, 'Bono Voucher'>;
    description: string;
  }) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  updateConfig: (partial: Partial<PropertyConfig>) => void;
  toggleRolePermission: (role: UserRole, perm: PermissionKey) => void;
  resetDemoData: () => void;
}

const HospitalityContext = createContext<HospitalityContextValue | null>(null);

function loadInitialState(): HospitalityState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_HOSPITALITY_STATE;
    const parsed = JSON.parse(raw) as HospitalityState;
    if (!parsed || !parsed.config || !Array.isArray(parsed.orders)) {
      return INITIAL_HOSPITALITY_STATE;
    }
    const mergedEmployees = parsed.employees.map((emp) => {
      if (emp.password) return emp;
      const seedMatch = INITIAL_HOSPITALITY_STATE.employees.find((s) => s.id === emp.id);
      return { ...emp, password: seedMatch?.password || '123456' };
    });
    const existingProducts = (parsed.menuProducts || INITIAL_HOSPITALITY_STATE.menuProducts).map(
      (prod) => {
        const seedMatch = INITIAL_HOSPITALITY_STATE.menuProducts.find((s) => s.id === prod.id);
        return {
          ...prod,
          imageUrl: prod.imageUrl || seedMatch?.imageUrl,
          description: prod.description || seedMatch?.description,
        };
      }
    );
    const existingIds = new Set(existingProducts.map((p) => p.id));
    const missingSeedProducts = INITIAL_HOSPITALITY_STATE.menuProducts.filter(
      (p) => !existingIds.has(p.id)
    );
    const mergedProducts = [...existingProducts, ...missingSeedProducts];

    const rolePerms = { ...INITIAL_HOSPITALITY_STATE.config.rolePermissions, ...parsed.config.rolePermissions };
    (['System Administrator', 'Hotel Manager'] as UserRole[]).forEach((r) => {
      const list = rolePerms[r] || [];
      if (!list.includes('user_manage')) {
        rolePerms[r] = [...list, 'user_manage'];
      }
    });

    return {
      ...parsed,
      config: {
        ...parsed.config,
        rolePermissions: rolePerms,
      },
      isAuthenticated: Boolean(parsed.isAuthenticated),
      employees: mergedEmployees,
      menuProducts: mergedProducts,
    };
  } catch {
    return INITIAL_HOSPITALITY_STATE;
  }
}

export const HospitalityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<HospitalityState>(loadInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  const currentEmployee = useMemo(
    () => state.employees.find((e) => e.id === state.currentEmployeeId) || state.employees[0],
    [state.employees, state.currentEmployeeId]
  );

  const hasPermission = (perm: PermissionKey): boolean => {
    if (!state.isAuthenticated) {
      return perm === 'pos_create';
    }
    const perms = state.config.rolePermissions[currentEmployee.role] || [];
    return perms.includes(perm);
  };

  const getProductCost = (product: MenuProduct): number => {
    if (product.directStockItemId) {
      const stk = state.stockItems.find((s) => s.id === product.directStockItemId);
      return stk ? stk.purchasePrice : 0;
    }
    if (product.recipe && product.recipe.length > 0) {
      return product.recipe.reduce((sum, ing) => {
        const stk = state.stockItems.find((s) => s.id === ing.stockItemId);
        return sum + (stk ? stk.purchasePrice * ing.quantity : 0);
      }, 0);
    }
    return product.sellingPrice * 0.35;
  };

  const makeAudit = (
    action: string,
    module: AuditLogEntry['module'],
    reference: string,
    details: string,
    emp: Employee = currentEmployee
  ): AuditLogEntry => ({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    userId: emp.id,
    userName: emp.name,
    userRole: emp.role,
    action,
    module,
    reference,
    details,
  });

  const makeNotification = (
    event: SystemNotification['event'],
    title: string,
    message: string,
    targetRoles: UserRole[],
    severity: SystemNotification['severity']
  ): SystemNotification => ({
    id: `not-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    event,
    title,
    message,
    targetRoles,
    read: false,
    severity,
  });

  const applyStockDeductionForProduct = (
    stockItems: StockItem[],
    product: MenuProduct,
    qty: number,
    location: StockLocation,
    movementType: StockMovement['type'],
    reference: string,
    emp: Employee
  ): { updatedStock: StockItem[]; movements: StockMovement[]; lowStockAlerts: SystemNotification[] } => {
    let nextStock = stockItems.map((s) => ({ ...s, quantities: { ...s.quantities } }));
    const movements: StockMovement[] = [];
    const lowStockAlerts: SystemNotification[] = [];

    const deductItem = (stockItemId: string, deductQty: number, note: string) => {
      const idx = nextStock.findIndex((s) => s.id === stockItemId);
      if (idx === -1) return;
      const item = nextStock[idx];
      const availableAtTarget = item.quantities[location] || 0;
      const actualLocation: StockLocation = availableAtTarget >= deductQty ? location : 'Main Store';
      const newQty = Math.max(0, Number(((item.quantities[actualLocation] || 0) - deductQty).toFixed(3)));
      item.quantities[actualLocation] = newQty;

      movements.push({
        id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        type: movementType,
        stockItemId: item.id,
        stockItemName: item.name,
        quantityDelta: -Number(deductQty.toFixed(3)),
        fromLocation: actualLocation,
        reference,
        employeeId: emp.id,
        employeeName: emp.name,
        note,
      });

      const totalQty = Object.values(item.quantities).reduce((a, b) => a + b, 0);
      if (totalQty <= item.minStockLevel) {
        lowStockAlerts.push(
          makeNotification(
            'Low Stock',
            `Low Stock: ${item.name}`,
            `Total remaining ${totalQty.toFixed(1)} ${item.unit} (threshold: ${item.minStockLevel} ${item.unit}).`,
            ['Storekeeper', 'Hotel Manager', 'Barman'],
            'warning'
          )
        );
      }
    };

    if (product.directStockItemId) {
      deductItem(product.directStockItemId, qty, `Direct unit deduction for ${product.name}`);
    } else if (product.recipe && product.recipe.length > 0) {
      for (const ing of product.recipe) {
        deductItem(ing.stockItemId, ing.quantity * qty, `BOM recipe deduction (${product.name} x${qty})`);
      }
    }

    return { updatedStock: nextStock, movements, lowStockAlerts };
  };

  const loginWithPassword = (
    username: string,
    password: string
  ): { ok: boolean; error?: string; employee?: Employee } => {
    const cleanUser = username.trim().toLowerCase();
    const emp = state.employees.find((e) => e.username.toLowerCase() === cleanUser);
    if (!emp || emp.password !== password) {
      return { ok: false, error: 'Invalid username or password. Please verify your credentials.' };
    }
    if (emp.status !== 'Active') {
      return { ok: false, error: 'This employee account is currently off duty or disabled.' };
    }
    setState((prev) => ({
      ...prev,
      isAuthenticated: true,
      currentEmployeeId: emp.id,
      auditLogs: [
        makeAudit(
          'User Logged In',
          'Security',
          emp.username,
          `${emp.name} (${emp.role}) authenticated with password to access staff dashboard.`,
          emp
        ),
        ...prev.auditLogs,
      ],
    }));
    return { ok: true, employee: emp };
  };

  const logout = () => {
    setState((prev) => ({
      ...prev,
      isAuthenticated: false,
      currentEmployeeId: 'emp-csh-1',
      auditLogs: [
        makeAudit(
          'User Logged Out',
          'Security',
          currentEmployee.username,
          `${currentEmployee.name} logged out and returned to public Order Terminal.`
        ),
        ...prev.auditLogs,
      ],
    }));
  };

  const updateEmployeePassword = (employeeId: string, newPassword: string) => {
    if (!newPassword.trim()) return;
    setState((prev) => {
      const target = prev.employees.find((e) => e.id === employeeId);
      if (!target) return prev;
      return {
        ...prev,
        employees: prev.employees.map((e) =>
          e.id === employeeId ? { ...e, password: newPassword.trim() } : e
        ),
        auditLogs: [
          makeAudit(
            'Password Updated',
            'Security',
            target.username,
            `Password updated for ${target.name} (${target.role}).`
          ),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const addEmployee = (input: {
    name: string;
    username: string;
    password: string;
    role: UserRole;
    department: Exclude<DepartmentName, 'All Departments'>;
  }): { ok: boolean; error?: string; employee?: Employee } => {
    const cleanName = input.name.trim();
    const cleanUsername = input.username.trim().toLowerCase();
    const cleanPassword = input.password.trim();
    if (!cleanName) return { ok: false, error: 'Employee full name is required.' };
    if (!cleanUsername) return { ok: false, error: 'Login username is required.' };
    if (cleanPassword.length < 4) return { ok: false, error: 'Password must be at least 4 characters.' };
    if (state.employees.some((e) => e.username.toLowerCase() === cleanUsername)) {
      return { ok: false, error: `Username "${cleanUsername}" is already assigned to another employee.` };
    }

    const newEmployee: Employee = {
      id: `emp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      name: cleanName,
      username: cleanUsername,
      password: cleanPassword,
      role: input.role,
      department: input.department,
      status: 'Active',
    };

    setState((prev) => ({
      ...prev,
      employees: [...prev.employees, newEmployee],
      auditLogs: [
        makeAudit(
          'Employee Created',
          'Security',
          newEmployee.username,
          `Added new employee ${newEmployee.name} as ${newEmployee.role} (${newEmployee.department}).`
        ),
        ...prev.auditLogs,
      ],
    }));

    return { ok: true, employee: newEmployee };
  };

  const updateEmployee = (
    employeeId: string,
    partial: Partial<Pick<Employee, 'name' | 'username' | 'password' | 'role' | 'department' | 'status'>>
  ): { ok: boolean; error?: string } => {
    const target = state.employees.find((e) => e.id === employeeId);
    if (!target) return { ok: false, error: 'Employee not found.' };

    if (partial.username) {
      const nextUser = partial.username.trim().toLowerCase();
      if (!nextUser) return { ok: false, error: 'Username cannot be empty.' };
      if (state.employees.some((e) => e.id !== employeeId && e.username.toLowerCase() === nextUser)) {
        return { ok: false, error: `Username "${nextUser}" is already in use.` };
      }
    }

    if (target.role === 'System Administrator') {
      const nextRole = partial.role ?? target.role;
      const nextStatus = partial.status ?? target.status;
      const remainingActiveAdmins = state.employees.filter(
        (e) => e.id !== employeeId && e.role === 'System Administrator' && e.status === 'Active'
      ).length;
      if ((nextRole !== 'System Administrator' || nextStatus !== 'Active') && remainingActiveAdmins === 0) {
        return { ok: false, error: 'At least one active System Administrator account must remain.' };
      }
    }

    setState((prev) => ({
      ...prev,
      employees: prev.employees.map((e) =>
        e.id === employeeId
          ? {
              ...e,
              ...partial,
              name: partial.name !== undefined ? partial.name.trim() || e.name : e.name,
              username: partial.username !== undefined ? partial.username.trim().toLowerCase() : e.username,
              password: partial.password !== undefined ? partial.password.trim() || e.password : e.password,
            }
          : e
      ),
      auditLogs: [
        makeAudit(
          'Employee Updated',
          'Security',
          target.username,
          `Updated employee record for ${target.name} (${Object.keys(partial).join(', ')}).`
        ),
        ...prev.auditLogs,
      ],
    }));

    return { ok: true };
  };

  const deleteEmployee = (employeeId: string): { ok: boolean; error?: string } => {
    const target = state.employees.find((e) => e.id === employeeId);
    if (!target) return { ok: false, error: 'Employee record not found.' };
    if (employeeId === currentEmployee.id) {
      return { ok: false, error: 'You cannot delete the currently signed-in employee account.' };
    }
    if (target.role === 'System Administrator') {
      const otherActiveAdmins = state.employees.filter(
        (e) => e.id !== employeeId && e.role === 'System Administrator' && e.status === 'Active'
      ).length;
      if (otherActiveAdmins === 0) {
        return { ok: false, error: 'Cannot delete the last active System Administrator.' };
      }
    }

    setState((prev) => ({
      ...prev,
      employees: prev.employees.filter((e) => e.id !== employeeId),
      auditLogs: [
        makeAudit(
          'Employee Deleted',
          'Security',
          target.username,
          `Removed employee ${target.name} (${target.role}) from BelTech directory.`
        ),
        ...prev.auditLogs,
      ],
    }));

    return { ok: true };
  };

  const switchEmployee = (employeeId: string) => {
    setState((prev) => {
      const nextEmp = prev.employees.find((e) => e.id === employeeId);
      if (!nextEmp) return prev;
      return {
        ...prev,
        currentEmployeeId: employeeId,
        auditLogs: [
          makeAudit('Session Switched', 'Security', nextEmp.username, `Active operator switched to ${nextEmp.name} (${nextEmp.role}).`, nextEmp),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const setActiveDepartment = (dept: DepartmentName) => {
    setState((prev) => ({ ...prev, activeDepartment: dept }));
  };

  const createOrder = (input: CreateOrderInput): { ok: boolean; order?: Order; error?: string } => {
    if (input.items.length === 0) {
      return { ok: false, error: 'Add at least one item before submitting the order.' };
    }

    const nowIso = new Date().toISOString();
    const numericIds = state.orders
      .map((o) => parseInt(o.orderNumber.replace('#', ''), 10))
      .filter((n) => !Number.isNaN(n));
    const nextNum = (numericIds.length ? Math.max(...numericIds) : 8102) + 1;
    const orderNumber = `#${nextNum}`;
    const orderId = `ord-${nextNum}`;

    const subtotal = input.items.reduce((sum, line) => {
      const price = line.product.promoPrice ?? line.product.sellingPrice;
      return sum + price * line.quantity;
    }, 0);
    const taxAmount = Number(((subtotal * state.config.taxRatePercent) / 100).toFixed(2));
    const serviceChargeAmount = Number(((subtotal * state.config.serviceChargePercent) / 100).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount + serviceChargeAmount).toFixed(2));

    const orderItems = input.items.map((line, i) => ({
      id: `oi-${nextNum}-${i + 1}`,
      productId: line.product.id,
      productName: line.product.name,
      category: line.product.category,
      station: line.product.station,
      quantity: line.quantity,
      unitPrice: line.product.promoPrice ?? line.product.sellingPrice,
      unitCost: Number(getProductCost(line.product).toFixed(2)),
      stationStatus: 'Pending' as const,
    }));

    const totalCost = Number(
      orderItems.reduce((sum, item) => sum + item.unitCost * item.quantity, 0).toFixed(2)
    );

    const hasKitchenItems = orderItems.some((item) => item.station !== 'Bar Station');
    const hasBarItems = orderItems.some((item) => item.station === 'Bar Station');
    const tableObj = input.tableId ? state.tables.find((t) => t.id === input.tableId) : undefined;

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      createdAt: nowIso,
      updatedAt: nowIso,
      channel: input.channel,
      department: input.department,
      tableId: tableObj?.id,
      tableLabel: tableObj?.number,
      customerName: input.customerName?.trim() || undefined,
      roomNumber: input.roomNumber?.trim() || undefined,
      cashierId: currentEmployee.id,
      cashierName: currentEmployee.name,
      status: hasKitchenItems ? 'Confirmed' : 'Ready',
      items: orderItems,
      subtotal,
      taxAmount,
      serviceChargeAmount,
      totalAmount,
      totalCost,
      payments: input.payments,
      stockDeducted: true,
    };

    // Deduct stock immediately per movement policy without double deduction later
    let workingStock = state.stockItems;
    let newMovements: StockMovement[] = [];
    let newAlerts: SystemNotification[] = [];

    for (const line of input.items) {
      const targetStore: StockLocation =
        line.product.station === 'Bar Station' || line.product.station === 'Juice Section'
          ? 'Bar Store'
          : 'Kitchen Store';
      const res = applyStockDeductionForProduct(
        workingStock,
        line.product,
        line.quantity,
        targetStore,
        'POS Sale Deduction',
        orderNumber,
        currentEmployee
      );
      workingStock = res.updatedStock;
      newMovements = [...res.movements, ...newMovements];
      newAlerts = [...res.lowStockAlerts, ...newAlerts];
    }

    if (hasKitchenItems) {
      newAlerts.unshift(
        makeNotification(
          'New Kitchen Order',
          `New Kitchen Ticket ${orderNumber}`,
          `${orderItems.filter((i) => i.station !== 'Bar Station').map((i) => `${i.quantity}x ${i.productName}`).join(', ')} (${tableObj ? tableObj.name : input.channel}).`,
          ['Kitchen Staff', 'Supervisor'],
          'info'
        )
      );
    }

    if (hasBarItems) {
      newAlerts.unshift(
        makeNotification(
          'New Bar Order',
          `New Bar Ticket ${orderNumber}`,
          `${orderItems.filter((i) => i.station === 'Bar Station').map((i) => `${i.quantity}x ${i.productName}`).join(', ')}.`,
          ['Barman'],
          'info'
        )
      );
    }

    // Update active cashier shift if open
    const cashPaid = input.payments.filter((p) => p.method === 'Cash').reduce((s, p) => s + p.amount, 0);
    const digitalPaid = input.payments
      .filter((p) => p.method === 'Bank Transfer' || p.method === 'Mobile Money' || p.method === 'POS / Card')
      .reduce((s, p) => s + p.amount, 0);

    setState((prev) => {
      const nextTables = prev.tables.map((t) =>
        t.id === tableObj?.id
          ? {
              ...t,
              status: 'Occupied' as TableStatus,
              guests: t.guests || Math.min(t.capacity, 2),
              activeOrderId: newOrder.id,
              activeAmount: newOrder.totalAmount,
            }
          : t
      );

      let shiftUpdated = false;
      const nextShifts = prev.shifts.map((s) => {
        if (!shiftUpdated && s.status === 'Open' && (s.cashierId === currentEmployee.id || s.department === input.department)) {
          shiftUpdated = true;
          const nextCashSales = s.cashSales + cashPaid;
          return {
            ...s,
            cashSales: nextCashSales,
            digitalSales: s.digitalSales + digitalPaid,
            expectedCash: s.openingCash + nextCashSales - s.refunds,
          };
        }
        return s;
      });

      return {
        ...prev,
        orders: [newOrder, ...prev.orders],
        tables: nextTables,
        stockItems: workingStock,
        stockMovements: [...newMovements, ...prev.stockMovements],
        shifts: nextShifts,
        notifications: [...newAlerts, ...prev.notifications],
        auditLogs: [
          makeAudit(
            'Order Created',
            'POS',
            orderNumber,
            `${input.channel} order created for ${totalAmount.toFixed(2)} ${prev.config.currencyCode} (${input.payments.map((p) => p.method).join(' + ')}).`
          ),
          ...prev.auditLogs,
        ],
      };
    });

    return { ok: true, order: newOrder };
  };

  const updateOrderStatus = (orderId: string, nextStatus: OrderStatus, reason?: string) => {
    setState((prev) => {
      const target = prev.orders.find((o) => o.id === orderId);
      if (!target) return prev;
      const nowIso = new Date().toISOString();

      const nextOrders = prev.orders.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status: nextStatus,
          updatedAt: nowIso,
          prepStartedAt: nextStatus === 'In Preparation' && !o.prepStartedAt ? nowIso : o.prepStartedAt,
          readyAt: nextStatus === 'Ready' && !o.readyAt ? nowIso : o.readyAt,
          completedAt: nextStatus === 'Completed' && !o.completedAt ? nowIso : o.completedAt,
          cancellationReason: nextStatus === 'Cancelled' ? reason || 'Cancelled by operator' : o.cancellationReason,
          items: o.items.map((it) => ({
            ...it,
            stationStatus:
              nextStatus === 'In Preparation'
                ? 'Preparing'
                : nextStatus === 'Ready' || nextStatus === 'Delivered' || nextStatus === 'Completed'
                ? 'Ready'
                : it.stationStatus,
          })),
        };
      });

      let nextTables = prev.tables;
      if ((nextStatus === 'Completed' || nextStatus === 'Cancelled') && target.tableId) {
        nextTables = prev.tables.map((t) =>
          t.id === target.tableId
            ? {
                ...t,
                status: nextStatus === 'Completed' ? 'Cleaning' : 'Available',
                guests: 0,
                activeOrderId: undefined,
                activeAmount: undefined,
              }
            : t
        );
      }

      const extraNotifications: SystemNotification[] = [];
      if (nextStatus === 'Ready') {
        extraNotifications.push(
          makeNotification(
            'Order Ready',
            `Order ${target.orderNumber} Ready`,
            `Prepared by ${currentEmployee.name}. Ready for collection${target.tableLabel ? ` (Table ${target.tableLabel})` : ''}.`,
            ['Cashier', 'Supervisor', 'Hotel Manager'],
            'success'
          )
        );
      }

      // If cancelled BEFORE preparation started and stock was deducted, reverse stock
      let nextStock = prev.stockItems;
      const reversalMovements: StockMovement[] = [];
      if (nextStatus === 'Cancelled' && target.stockDeducted && !target.prepStartedAt) {
        nextStock = prev.stockItems.map((s) => ({ ...s, quantities: { ...s.quantities } }));
        for (const item of target.items) {
          const prod = prev.menuProducts.find((p) => p.id === item.productId);
          if (!prod) continue;
          const loc: StockLocation = prod.station === 'Bar Station' ? 'Bar Store' : 'Kitchen Store';
          if (prod.directStockItemId) {
            const idx = nextStock.findIndex((s) => s.id === prod.directStockItemId);
            if (idx !== -1) {
              nextStock[idx].quantities[loc] += item.quantity;
              reversalMovements.push({
                id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                timestamp: nowIso,
                type: 'Cancellation Reversal',
                stockItemId: nextStock[idx].id,
                stockItemName: nextStock[idx].name,
                quantityDelta: item.quantity,
                toLocation: loc,
                reference: target.orderNumber,
                employeeId: currentEmployee.id,
                employeeName: currentEmployee.name,
                note: `Pre-prep order cancellation reversal (${reason || 'Cancelled'})`,
              });
            }
          } else if (prod.recipe) {
            for (const ing of prod.recipe) {
              const idx = nextStock.findIndex((s) => s.id === ing.stockItemId);
              if (idx !== -1) {
                const qtyRestore = Number((ing.quantity * item.quantity).toFixed(3));
                nextStock[idx].quantities[loc] += qtyRestore;
                reversalMovements.push({
                  id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  timestamp: nowIso,
                  type: 'Cancellation Reversal',
                  stockItemId: nextStock[idx].id,
                  stockItemName: nextStock[idx].name,
                  quantityDelta: qtyRestore,
                  toLocation: loc,
                  reference: target.orderNumber,
                  employeeId: currentEmployee.id,
                  employeeName: currentEmployee.name,
                  note: `Pre-prep recipe reversal (${reason || 'Cancelled'})`,
                });
              }
            }
          }
        }
      }

      return {
        ...prev,
        orders: nextOrders,
        tables: nextTables,
        stockItems: nextStock,
        stockMovements: [...reversalMovements, ...prev.stockMovements],
        notifications: [...extraNotifications, ...prev.notifications],
        auditLogs: [
          makeAudit(
            `Order ${nextStatus}`,
            nextStatus === 'In Preparation' || nextStatus === 'Ready' ? 'Kitchen' : 'POS',
            target.orderNumber,
            nextStatus === 'Cancelled'
              ? `Order cancelled. Reason: ${reason || 'Not specified'}. ${target.prepStartedAt ? 'Prepared items flagged for manager waste review.' : 'Stock reversed.'}`
              : `Order status transitioned from ${target.status} to ${nextStatus}.`
          ),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const updateTableStatus = (
    tableId: string,
    status: TableStatus,
    reservationName?: string,
    reservationTime?: string
  ) => {
    setState((prev) => {
      const tbl = prev.tables.find((t) => t.id === tableId);
      if (!tbl) return prev;
      return {
        ...prev,
        tables: prev.tables.map((t) =>
          t.id === tableId
            ? {
                ...t,
                status,
                guests: status === 'Available' || status === 'Cleaning' ? 0 : t.guests || 2,
                activeOrderId: status === 'Available' ? undefined : t.activeOrderId,
                activeAmount: status === 'Available' ? undefined : t.activeAmount,
                reservationName: status === 'Reserved' ? reservationName || t.reservationName || 'Guest Reservation' : undefined,
                reservationTime: status === 'Reserved' ? reservationTime || t.reservationTime || '19:00' : undefined,
              }
            : t
        ),
        auditLogs: [
          makeAudit('Table Updated', 'Tables', tbl.number, `${tbl.name} status set to ${status}.`),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const transferTableOrder = (fromTableId: string, toTableId: string): { ok: boolean; message: string } => {
    const fromTbl = state.tables.find((t) => t.id === fromTableId);
    const toTbl = state.tables.find((t) => t.id === toTableId);
    if (!fromTbl || !toTbl) return { ok: false, message: 'Invalid table selection.' };
    if (toTbl.status === 'Occupied') return { ok: false, message: `${toTbl.name} is already occupied. Use Merge Tables instead.` };

    setState((prev) => ({
      ...prev,
      tables: prev.tables.map((t) => {
        if (t.id === fromTableId) {
          return { ...t, status: 'Available', guests: 0, activeOrderId: undefined, activeAmount: undefined };
        }
        if (t.id === toTableId) {
          return {
            ...t,
            status: 'Occupied',
            guests: fromTbl.guests || 2,
            activeOrderId: fromTbl.activeOrderId,
            activeAmount: fromTbl.activeAmount,
          };
        }
        return t;
      }),
      orders: prev.orders.map((o) =>
        o.id === fromTbl.activeOrderId ? { ...o, tableId: toTbl.id, tableLabel: toTbl.number } : o
      ),
      auditLogs: [
        makeAudit(
          'Table Transferred',
          'Tables',
          `${fromTbl.number}->${toTbl.number}`,
          `Transferred active order from ${fromTbl.name} to ${toTbl.name}.`
        ),
        ...prev.auditLogs,
      ],
    }));

    return { ok: true, message: `Order transferred from ${fromTbl.name} to ${toTbl.name}.` };
  };

  const mergeTables = (sourceTableId: string, targetTableId: string): { ok: boolean; message: string } => {
    const src = state.tables.find((t) => t.id === sourceTableId);
    const tgt = state.tables.find((t) => t.id === targetTableId);
    if (!src || !tgt || src.id === tgt.id) return { ok: false, message: 'Select two distinct tables to merge.' };

    setState((prev) => ({
      ...prev,
      tables: prev.tables.map((t) => {
        if (t.id === sourceTableId) {
          return { ...t, status: 'Available', guests: 0, activeOrderId: undefined, activeAmount: undefined };
        }
        if (t.id === targetTableId) {
          return {
            ...t,
            status: 'Occupied',
            guests: (t.guests || 0) + (src.guests || 0),
            activeAmount: (t.activeAmount || 0) + (src.activeAmount || 0),
          };
        }
        return t;
      }),
      auditLogs: [
        makeAudit(
          'Tables Merged',
          'Tables',
          `${src.number}+${tgt.number}`,
          `Merged ${src.name} guests and balance into ${tgt.name}.`
        ),
        ...prev.auditLogs,
      ],
    }));

    return { ok: true, message: `Merged ${src.name} into ${tgt.name}.` };
  };

  const issueBonos = (input: IssueBonoInput): BonoRecord[] => {
    const count = Math.max(1, Math.min(100, input.quantity));
    const existingMax = state.bonos
      .map((b) => parseInt(b.code.replace('BON-', ''), 10))
      .filter((n) => !Number.isNaN(n));
    let seedNum = existingMax.length ? Math.max(...existingMax) : 1006;

    const prod = input.eligibleProductId
      ? state.menuProducts.find((p) => p.id === input.eligibleProductId)
      : undefined;

    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + input.validDays * 86400_000).toISOString();

    const created: BonoRecord[] = [];
    for (let i = 0; i < count; i++) {
      seedNum += 1;
      created.push({
        id: `bon-${Date.now()}-${i}`,
        code: `BON-${seedNum}`,
        type: input.type,
        accountingMode: input.accountingMode,
        status: 'Active',
        valueAmount: input.valueAmount,
        eligibleProductId: prod?.id,
        eligibleProductName: prod?.name,
        eligibleCategory: prod?.category || input.eligibleCategory || 'All Bar & Lounge',
        issuedAt: nowIso,
        expiresAt,
        issuedById: currentEmployee.id,
        issuedByName: currentEmployee.name,
        customerOrEvent: input.customerOrEvent.trim() || 'Walk-in Guest',
      });
    }

    setState((prev) => ({
      ...prev,
      bonos: [...created, ...prev.bonos],
      auditLogs: [
        makeAudit(
          'Bonos Issued',
          'Bar & Bono',
          created.length === 1 ? created[0].code : `${created[0].code}..${created[created.length - 1].code}`,
          `Issued ${created.length}x ${input.type} (${input.accountingMode}) for ${input.customerOrEvent}.`
        ),
        ...prev.auditLogs,
      ],
    }));

    return created;
  };

  const redeemBono = (code: string, selectedProductId?: string, note?: string): RedeemBonoResult => {
    const normalized = code.trim().toUpperCase();
    const bono = state.bonos.find((b) => b.code.toUpperCase() === normalized);
    if (!bono) {
      return { ok: false, message: `Bono "${normalized}" not found in registry.` };
    }
    if (bono.status === 'Redeemed') {
      return {
        ok: false,
        message: `DUPLICATE REDEMPTION BLOCKED: ${bono.code} was already redeemed by ${bono.redeemedByName} on ${new Date(bono.redeemedAt || '').toLocaleString()}.`,
        bono,
      };
    }
    if (bono.status === 'Cancelled') {
      return { ok: false, message: `Bono ${bono.code} was cancelled and cannot be redeemed.`, bono };
    }
    if (bono.status === 'Expired' || new Date(bono.expiresAt).getTime() < Date.now()) {
      return { ok: false, message: `Bono ${bono.code} is expired.`, bono };
    }

    const targetProductId = selectedProductId || bono.eligibleProductId || 'prd-beer';
    const product = state.menuProducts.find((p) => p.id === targetProductId);
    if (!product) {
      return { ok: false, message: 'Select an eligible product to issue against this bono.' };
    }
    if (bono.eligibleProductId && bono.eligibleProductId !== product.id) {
      return {
        ok: false,
        message: `Product mismatch: ${bono.code} is restricted to ${bono.eligibleProductName}.`,
      };
    }

    const nowIso = new Date().toISOString();
    const updatedBono: BonoRecord = {
      ...bono,
      status: 'Redeemed',
      redeemedAt: nowIso,
      redeemedById: currentEmployee.id,
      redeemedByName: currentEmployee.name,
      redeemedProductId: product.id,
      redeemedProductName: product.name,
      redemptionNote: note,
    };

    const { updatedStock, movements, lowStockAlerts } = applyStockDeductionForProduct(
      state.stockItems,
      product,
      1,
      product.station === 'Bar Station' || product.station === 'Juice Section' ? 'Bar Store' : 'Kitchen Store',
      'Bono Deduction',
      bono.code,
      currentEmployee
    );

    const notif = makeNotification(
      'Bono Redeemed',
      `Bono ${bono.code} Redeemed`,
      `${currentEmployee.name} issued 1x ${product.name} (${bono.type}). Stock automatically deducted.`,
      ['Hotel Manager', 'Supervisor', 'Accountant'],
      'info'
    );

    setState((prev) => ({
      ...prev,
      bonos: prev.bonos.map((b) => (b.id === bono.id ? updatedBono : b)),
      stockItems: updatedStock,
      stockMovements: [...movements, ...prev.stockMovements],
      notifications: [notif, ...lowStockAlerts, ...prev.notifications],
      auditLogs: [
        makeAudit(
          'Bono Redeemed',
          'Bar & Bono',
          bono.code,
          `Redeemed ${bono.type} for 1x ${product.name}; bar inventory automatically deducted.`
        ),
        ...prev.auditLogs,
      ],
    }));

    return {
      ok: true,
      message: `${bono.code} validated & redeemed for 1x ${product.name}. Inventory deducted automatically.`,
      bono: updatedBono,
    };
  };

  const cancelBono = (bonoId: string, reason: string) => {
    setState((prev) => {
      const target = prev.bonos.find((b) => b.id === bonoId);
      if (!target || target.status !== 'Active') return prev;
      return {
        ...prev,
        bonos: prev.bonos.map((b) =>
          b.id === bonoId ? { ...b, status: 'Cancelled', redemptionNote: reason } : b
        ),
        auditLogs: [
          makeAudit('Bono Cancelled', 'Bar & Bono', target.code, `Bono cancelled. Reason: ${reason || 'Administrative cancellation'}.`),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const receiveStock = (
    stockItemId: string,
    location: StockLocation,
    quantity: number,
    reference: string,
    note?: string
  ) => {
    if (quantity <= 0) return;
    setState((prev) => {
      const item = prev.stockItems.find((s) => s.id === stockItemId);
      if (!item) return prev;
      const nextStock = prev.stockItems.map((s) =>
        s.id === stockItemId
          ? {
              ...s,
              quantities: {
                ...s.quantities,
                [location]: Number(((s.quantities[location] || 0) + quantity).toFixed(3)),
              },
            }
          : s
      );
      const movement: StockMovement = {
        id: `mov-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'Purchase Receipt',
        stockItemId: item.id,
        stockItemName: item.name,
        quantityDelta: quantity,
        toLocation: location,
        reference: reference || `PO-${Date.now().toString().slice(-5)}`,
        employeeId: currentEmployee.id,
        employeeName: currentEmployee.name,
        note,
      };
      return {
        ...prev,
        stockItems: nextStock,
        stockMovements: [movement, ...prev.stockMovements],
        auditLogs: [
          makeAudit('Stock Received', 'Inventory', movement.reference, `Received +${quantity} ${item.unit} of ${item.name} into ${location}.`),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const transferStock = (
    stockItemId: string,
    fromLocation: StockLocation,
    toLocation: StockLocation,
    quantity: number,
    note?: string
  ): { ok: boolean; message: string } => {
    if (fromLocation === toLocation) return { ok: false, message: 'Source and destination stores must be different.' };
    if (quantity <= 0) return { ok: false, message: 'Transfer quantity must be positive.' };

    const item = state.stockItems.find((s) => s.id === stockItemId);
    if (!item) return { ok: false, message: 'Stock item not found.' };
    const available = item.quantities[fromLocation] || 0;
    if (available < quantity) {
      return { ok: false, message: `Insufficient stock in ${fromLocation} (available: ${available} ${item.unit}).` };
    }

    const ref = `TRF-${Date.now().toString().slice(-5)}`;
    setState((prev) => {
      const nextStock = prev.stockItems.map((s) =>
        s.id === stockItemId
          ? {
              ...s,
              quantities: {
                ...s.quantities,
                [fromLocation]: Number((s.quantities[fromLocation] - quantity).toFixed(3)),
                [toLocation]: Number(((s.quantities[toLocation] || 0) + quantity).toFixed(3)),
              },
            }
          : s
      );
      const movement: StockMovement = {
        id: `mov-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'Internal Transfer',
        stockItemId: item.id,
        stockItemName: item.name,
        quantityDelta: quantity,
        fromLocation,
        toLocation,
        reference: ref,
        employeeId: currentEmployee.id,
        employeeName: currentEmployee.name,
        note,
      };
      return {
        ...prev,
        stockItems: nextStock,
        stockMovements: [movement, ...prev.stockMovements],
        auditLogs: [
          makeAudit('Stock Transferred', 'Inventory', ref, `Transferred ${quantity} ${item.unit} of ${item.name} from ${fromLocation} to ${toLocation}.`),
          ...prev.auditLogs,
        ],
      };
    });

    return { ok: true, message: `Transferred ${quantity} ${item.unit} of ${item.name} to ${toLocation}.` };
  };

  const adjustStock = (
    stockItemId: string,
    location: StockLocation,
    delta: number,
    type: 'Wastage / Damage' | 'Adjustment',
    note: string
  ) => {
    if (delta === 0) return;
    setState((prev) => {
      const item = prev.stockItems.find((s) => s.id === stockItemId);
      if (!item) return prev;
      const nextLocQty = Math.max(0, Number(((item.quantities[location] || 0) + delta).toFixed(3)));
      const nextStock = prev.stockItems.map((s) =>
        s.id === stockItemId ? { ...s, quantities: { ...s.quantities, [location]: nextLocQty } } : s
      );
      const ref = `ADJ-${Date.now().toString().slice(-5)}`;
      const movement: StockMovement = {
        id: `mov-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type,
        stockItemId: item.id,
        stockItemName: item.name,
        quantityDelta: delta,
        fromLocation: delta < 0 ? location : undefined,
        toLocation: delta > 0 ? location : undefined,
        reference: ref,
        employeeId: currentEmployee.id,
        employeeName: currentEmployee.name,
        note,
      };

      const updatedItem = nextStock.find((s) => s.id === stockItemId)!;
      const totalQty = Object.values(updatedItem.quantities).reduce((a, b) => a + b, 0);
      const alerts: SystemNotification[] =
        totalQty <= updatedItem.minStockLevel
          ? [
              makeNotification(
                'Low Stock',
                `Low Stock: ${updatedItem.name}`,
                `Remaining total stock ${totalQty.toFixed(1)} ${updatedItem.unit} fell below threshold (${updatedItem.minStockLevel}).`,
                ['Storekeeper', 'Hotel Manager'],
                'warning'
              ),
            ]
          : [];

      return {
        ...prev,
        stockItems: nextStock,
        stockMovements: [movement, ...prev.stockMovements],
        notifications: [...alerts, ...prev.notifications],
        auditLogs: [
          makeAudit(type, 'Inventory', ref, `${delta > 0 ? '+' : ''}${delta} ${item.unit} on ${item.name} (${location}). Note: ${note}`),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const updateProductRecipe = (productId: string, recipe: RecipeIngredient[]) => {
    setState((prev) => {
      const prod = prev.menuProducts.find((p) => p.id === productId);
      if (!prod) return prev;
      return {
        ...prev,
        menuProducts: prev.menuProducts.map((p) => (p.id === productId ? { ...p, recipe } : p)),
        auditLogs: [
          makeAudit('Recipe BOM Updated', 'Inventory', prod.sku, `Updated Bill of Materials for ${prod.name} (${recipe.length} ingredients).`),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const toggleProductAvailability = (productId: string) => {
    setState((prev) => ({
      ...prev,
      menuProducts: prev.menuProducts.map((p) =>
        p.id === productId ? { ...p, isAvailable: !p.isAvailable } : p
      ),
    }));
  };

  const openCashierShift = (
    openingCash: number,
    department: Exclude<DepartmentName, 'All Departments'>
  ): { ok: boolean; message: string } => {
    const alreadyOpen = state.shifts.find((s) => s.cashierId === currentEmployee.id && s.status === 'Open');
    if (alreadyOpen) {
      return { ok: false, message: `You already have an open shift (${alreadyOpen.id}) in ${alreadyOpen.department}.` };
    }
    const newShift: CashierShift = {
      id: `shf-${Date.now().toString().slice(-4)}`,
      cashierId: currentEmployee.id,
      cashierName: currentEmployee.name,
      department,
      openedAt: new Date().toISOString(),
      openingCash,
      cashSales: 0,
      digitalSales: 0,
      refunds: 0,
      expectedCash: openingCash,
      status: 'Open',
    };
    setState((prev) => ({
      ...prev,
      shifts: [newShift, ...prev.shifts],
      auditLogs: [
        makeAudit('Shift Opened', 'Finance', newShift.id, `Opened ${department} shift with opening float ${openingCash}.`),
        ...prev.auditLogs,
      ],
    }));
    return { ok: true, message: `Shift ${newShift.id} opened for ${department}.` };
  };

  const closeCashierShift = (shiftId: string, actualCash: number, note?: string) => {
    setState((prev) => {
      const target = prev.shifts.find((s) => s.id === shiftId);
      if (!target) return prev;
      const diff = Number((actualCash - target.expectedCash).toFixed(2));
      const nowIso = new Date().toISOString();

      const alerts: SystemNotification[] = [
        makeNotification(
          diff !== 0 ? 'Cash Discrepancy' : 'Shift Submitted',
          diff !== 0 ? `Cash Discrepancy on Shift ${target.id}` : `Shift ${target.id} Submitted`,
          `${target.cashierName} closed ${target.department} shift. Expected: ${target.expectedCash.toFixed(2)}, Actual: ${actualCash.toFixed(2)}, Diff: ${diff.toFixed(2)}.`,
          ['Supervisor', 'Accountant', 'Hotel Manager'],
          diff !== 0 ? 'critical' : 'info'
        ),
      ];

      return {
        ...prev,
        shifts: prev.shifts.map((s) =>
          s.id === shiftId
            ? {
                ...s,
                closedAt: nowIso,
                actualCash,
                cashDifference: diff,
                status: 'Pending Approval',
                note,
              }
            : s
        ),
        notifications: [...alerts, ...prev.notifications],
        auditLogs: [
          makeAudit('Shift Closed', 'Finance', shiftId, `Submitted closing cash ${actualCash} vs expected ${target.expectedCash} (Diff: ${diff}).`),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const approveCashierShift = (shiftId: string) => {
    setState((prev) => ({
      ...prev,
      shifts: prev.shifts.map((s) =>
        s.id === shiftId ? { ...s, status: 'Approved', approvedByName: currentEmployee.name } : s
      ),
      auditLogs: [
        makeAudit('Shift Approved', 'Finance', shiftId, `Supervisor/Accountant ${currentEmployee.name} approved shift reconciliation.`),
        ...prev.auditLogs,
      ],
    }));
  };

  const addExpense = (input: {
    category: ExpenseCategory;
    department: Exclude<DepartmentName, 'All Departments'>;
    amount: number;
    paymentMethod: Exclude<PaymentMethod, 'Bono Voucher'>;
    description: string;
  }) => {
    const rec: ExpenseRecord = {
      id: `exp-${Date.now().toString().slice(-5)}`,
      date: new Date().toISOString(),
      category: input.category,
      department: input.department,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      description: input.description,
      recordedById: currentEmployee.id,
      recordedByName: currentEmployee.name,
    };
    setState((prev) => ({
      ...prev,
      expenses: [rec, ...prev.expenses],
      auditLogs: [
        makeAudit('Expense Recorded', 'Finance', rec.id, `${input.category}: ${input.amount} via ${input.paymentMethod} (${input.description}).`),
        ...prev.auditLogs,
      ],
    }));
  };

  const markNotificationRead = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  };

  const markAllNotificationsRead = () => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  };

  const updateConfig = (partial: Partial<PropertyConfig>) => {
    setState((prev) => ({
      ...prev,
      config: { ...prev.config, ...partial },
      auditLogs: [
        makeAudit('System Configuration Updated', 'Security', 'CONFIG', `Updated property settings (${Object.keys(partial).join(', ')}).`),
        ...prev.auditLogs,
      ],
    }));
  };

  const toggleRolePermission = (role: UserRole, perm: PermissionKey) => {
    setState((prev) => {
      const current = prev.config.rolePermissions[role] || [];
      const next = current.includes(perm) ? current.filter((p) => p !== perm) : [...current, perm];
      return {
        ...prev,
        config: {
          ...prev.config,
          rolePermissions: { ...prev.config.rolePermissions, [role]: next },
        },
        auditLogs: [
          makeAudit('Permission Matrix Changed', 'Security', role, `Toggled permission "${perm}" for role ${role}.`),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const resetDemoData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_HOSPITALITY_STATE);
  };

  return (
    <HospitalityContext.Provider
      value={{
        state,
        currentEmployee,
        hasPermission,
        loginWithPassword,
        logout,
        updateEmployeePassword,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        switchEmployee,
        setActiveDepartment,
        getProductCost,
        createOrder,
        updateOrderStatus,
        updateTableStatus,
        transferTableOrder,
        mergeTables,
        issueBonos,
        redeemBono,
        cancelBono,
        receiveStock,
        transferStock,
        adjustStock,
        updateProductRecipe,
        toggleProductAvailability,
        openCashierShift,
        closeCashierShift,
        approveCashierShift,
        addExpense,
        markNotificationRead,
        markAllNotificationsRead,
        updateConfig,
        toggleRolePermission,
        resetDemoData,
      }}
    >
      {children}
    </HospitalityContext.Provider>
  );
};

export function useHospitality(): HospitalityContextValue {
  const ctx = useContext(HospitalityContext);
  if (!ctx) throw new Error('useHospitality must be used inside HospitalityProvider');
  return ctx;
}
