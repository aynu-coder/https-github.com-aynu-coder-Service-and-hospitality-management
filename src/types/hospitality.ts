export type UserRole =
  | 'System Administrator'
  | 'Hotel Manager'
  | 'Cashier'
  | 'Barman'
  | 'Kitchen Staff'
  | 'Storekeeper'
  | 'Accountant'
  | 'Supervisor';

export type PermissionKey =
  | 'view_dashboard'
  | 'pos_create'
  | 'pos_cancel'
  | 'kds_manage'
  | 'bar_redeem_bono'
  | 'bono_issue'
  | 'inventory_manage'
  | 'finance_view'
  | 'finance_expenses'
  | 'shift_approve'
  | 'reports_export'
  | 'staff_audit'
  | 'user_manage'
  | 'settings_admin';

export type DepartmentName =
  | 'All Departments'
  | 'Main Restaurant'
  | 'Main Bar'
  | 'Outdoor Lounge'
  | 'Coffee Shop';

export type KitchenStation =
  | 'Main Kitchen'
  | 'Grill Section'
  | 'Coffee Section'
  | 'Bakery Section'
  | 'Juice Section'
  | 'Bar Station';

export type OrderStatus =
  | 'Draft'
  | 'Confirmed'
  | 'In Preparation'
  | 'Ready'
  | 'Delivered'
  | 'Completed'
  | 'Cancelled';

export type OrderChannel = 'Dine-In' | 'Takeaway' | 'Room Service';

export type PaymentMethod =
  | 'Cash'
  | 'Bank Transfer'
  | 'Mobile Money'
  | 'POS / Card'
  | 'Credit / Deferred'
  | 'Bono Voucher';

export type TableStatus =
  | 'Available'
  | 'Occupied'
  | 'Reserved'
  | 'Waiting for Service'
  | 'Cleaning';

export type BonoType =
  | 'Drink Bono'
  | 'Food Bono'
  | 'Value Bono'
  | 'Staff Bono'
  | 'Promotional Bono'
  | 'Complimentary Bono';

export type BonoStatus = 'Active' | 'Redeemed' | 'Expired' | 'Cancelled';

export type StockLocation =
  | 'Main Store'
  | 'Bar Store'
  | 'Kitchen Store'
  | 'Restaurant Store';

export type InventoryCategory =
  | 'Food Ingredients'
  | 'Soft Drinks'
  | 'Alcoholic Beverages'
  | 'Juices & Mixers'
  | 'Coffee & Tea'
  | 'Kitchen Consumables'
  | 'Cleaning Materials';

export type ExpenseCategory =
  | 'Food Purchases'
  | 'Beverage Purchases'
  | 'Employee Expenses'
  | 'Utilities'
  | 'Maintenance'
  | 'Transportation'
  | 'Rent'
  | 'Operational';

export type NavSection =
  | 'dashboard'
  | 'pos'
  | 'tables'
  | 'kitchen'
  | 'bar-bonos'
  | 'inventory'
  | 'finance'
  | 'staff-audit'
  | 'users'
  | 'reports'
  | 'settings';

export interface Employee {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  department: Exclude<DepartmentName, 'All Departments'>;
  avatarUrl?: string;
  status: 'Active' | 'Off Duty';
}

export interface RecipeIngredient {
  stockItemId: string;
  quantity: number;
}

export interface MenuProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category:
    | 'Main Dishes'
    | 'Grill & Burgers'
    | 'Soft Drinks'
    | 'Beer & Spirits'
    | 'Fresh Juices'
    | 'Coffee & Bakery';
  station: KitchenStation;
  department: Exclude<DepartmentName, 'All Departments'>;
  sellingPrice: number;
  promoPrice?: number;
  isAvailable: boolean;
  directStockItemId?: string;
  recipe?: RecipeIngredient[];
}

export interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  unit: 'unit' | 'kg' | 'L' | 'btl' | 'box';
  purchasePrice: number;
  minStockLevel: number;
  expirationDate?: string;
  quantities: Record<StockLocation, number>;
}

export interface StockMovement {
  id: string;
  timestamp: string;
  type:
    | 'Purchase Receipt'
    | 'Internal Transfer'
    | 'POS Sale Deduction'
    | 'Bono Deduction'
    | 'Recipe Deduction'
    | 'Wastage / Damage'
    | 'Adjustment'
    | 'Cancellation Reversal';
  stockItemId: string;
  stockItemName: string;
  quantityDelta: number;
  fromLocation?: StockLocation;
  toLocation?: StockLocation;
  reference: string;
  employeeId: string;
  employeeName: string;
  note?: string;
}

export interface OrderPayment {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  category: MenuProduct['category'];
  station: KitchenStation;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  stationStatus: 'Pending' | 'Preparing' | 'Ready';
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  prepStartedAt?: string;
  readyAt?: string;
  completedAt?: string;
  channel: OrderChannel;
  department: Exclude<DepartmentName, 'All Departments'>;
  tableId?: string;
  tableLabel?: string;
  customerName?: string;
  roomNumber?: string;
  cashierId: string;
  cashierName: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  totalCost: number;
  payments: OrderPayment[];
  stockDeducted: boolean;
  cancellationReason?: string;
}

export interface DiningTable {
  id: string;
  number: string;
  name: string;
  area: Exclude<DepartmentName, 'All Departments'>;
  capacity: number;
  guests: number;
  status: TableStatus;
  activeOrderId?: string;
  activeAmount?: number;
  reservationTime?: string;
  reservationName?: string;
}

export interface BonoRecord {
  id: string;
  code: string;
  type: BonoType;
  accountingMode: 'Prepaid' | 'Complimentary' | 'Promotional' | 'Staff Authorized';
  status: BonoStatus;
  valueAmount: number;
  eligibleProductId?: string;
  eligibleProductName?: string;
  eligibleCategory?: string;
  issuedAt: string;
  expiresAt: string;
  issuedById: string;
  issuedByName: string;
  customerOrEvent: string;
  redeemedAt?: string;
  redeemedById?: string;
  redeemedByName?: string;
  redeemedProductId?: string;
  redeemedProductName?: string;
  redemptionNote?: string;
}

export interface CashierShift {
  id: string;
  cashierId: string;
  cashierName: string;
  department: Exclude<DepartmentName, 'All Departments'>;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  cashSales: number;
  digitalSales: number;
  refunds: number;
  expectedCash: number;
  actualCash?: number;
  cashDifference?: number;
  status: 'Open' | 'Pending Approval' | 'Approved';
  approvedByName?: string;
  note?: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  category: ExpenseCategory;
  department: Exclude<DepartmentName, 'All Departments'>;
  amount: number;
  paymentMethod: Exclude<PaymentMethod, 'Bono Voucher'>;
  description: string;
  recordedById: string;
  recordedByName: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  module: 'POS' | 'Kitchen' | 'Bar & Bono' | 'Inventory' | 'Finance' | 'Security' | 'Tables';
  reference: string;
  details: string;
}

export interface SystemNotification {
  id: string;
  timestamp: string;
  event:
    | 'Order Ready'
    | 'New Kitchen Order'
    | 'New Bar Order'
    | 'Order Delayed'
    | 'Low Stock'
    | 'Cash Discrepancy'
    | 'Bono Redeemed'
    | 'Shift Submitted';
  title: string;
  message: string;
  targetRoles: UserRole[];
  read: boolean;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

export interface PropertyConfig {
  hotelName: string;
  branchName: string;
  address: string;
  phone: string;
  currencyCode: 'ETB' | 'USD' | 'EUR';
  currencySymbol: string;
  taxRatePercent: number;
  serviceChargePercent: number;
  enableTableManagement: boolean;
  receiptFooter: string;
  rolePermissions: Record<UserRole, PermissionKey[]>;
}

export interface HospitalityState {
  config: PropertyConfig;
  isAuthenticated: boolean;
  currentEmployeeId: string;
  activeDepartment: DepartmentName;
  employees: Employee[];
  menuProducts: MenuProduct[];
  stockItems: StockItem[];
  stockMovements: StockMovement[];
  orders: Order[];
  tables: DiningTable[];
  bonos: BonoRecord[];
  shifts: CashierShift[];
  expenses: ExpenseRecord[];
  auditLogs: AuditLogEntry[];
  notifications: SystemNotification[];
}
