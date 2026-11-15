# BelTech Hospitality — Hotel, Restaurant & Bar Management Platform

A modular Hospitality Management Platform built with React, TypeScript, Vite, Tailwind CSS, and Recharts. Designed for hotels, restaurants, bars, lounges, and cafés with role-based access control, real-time kitchen/bar workflows, bono voucher lifecycle management, multi-store BOM inventory deductions, and shift reconciliation.

## Core Modules

- **Management BI Dashboard**: Period filters (`Today`, `Weekly`, `Monthly`, `Yearly`), multi-department selector, revenue sparklines, interactive sales/department/bono/payment charts, live table status grid, top-selling item margins, and recent orders.
- **Cashier POS**: Fast menu search & category filters, Dine-In / Takeaway / Room Service channels, split & multi-method payments (`Cash`, `POS / Card`, `Mobile Money`, `Bank Transfer`, `Credit / Deferred`, `Bono Voucher`), automatic Kitchen/Bar station routing, ready-order collection alerts, cancellation reason tracking with pre-prep stock reversal, and printable receipts.
- **Floor & Table Management**: Status filtering (`Available`, `Occupied`, `Reserved`, `Waiting for Service`, `Cleaning`), reservations, direct POS launch, table order transfers, and table merging.
- **Kitchen Display System (KDS)**: Station filters (`Main Kitchen`, `Grill Section`, `Juice Section`, `Coffee Section`, `Bakery Section`, `Bar Station`), live prep duration timers, delayed ticket alerts, `Start Preparing` → `Mark Ready & Notify Cashier` workflow, and completed ticket history.
- **Bar & Bono Console**: Issue single or batch bonos (`Drink`, `Food`, `Value`, `Staff`, `Promotional`, `Complimentary`) with accounting mode (`Prepaid`, `Complimentary`, `Promotional`, `Staff Authorized`), validate & redeem bonos with duplicate-redemption blocking, automatic Bar Store BOM stock deduction, and reconciliation tracking.
- **Inventory & Recipes (BOM)**: Multi-store stock tracking (`Main Store`, `Bar Store`, `Kitchen Store`, `Restaurant Store`), low-stock alerts, purchase receipts, internal store transfers, wastage/damage adjustments, product recipe BOM costing, and movement history.
- **Finance & Cashier Shifts**: Revenue, COGS, Gross/Net Profit summary, expense ledger, and cashier shift open/close reconciliation (`Expected Cash` vs `Actual Cash` discrepancy detection and supervisor approval).
- **Staff Performance, Audit Trail & Reports**: Employee performance comparison, immutable audit trail, live operator/role switching (`System Administrator`, `Hotel Manager`, `Cashier`, `Barman`, `Kitchen Staff`, `Storekeeper`, `Accountant`, `Supervisor`), CSV / Excel (`.xls`) / Printable PDF exports, and configurable property/RBAC settings.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Charts & Icons**: Recharts, Lucide React
- **Persistence**: Client-side `localStorage` (`beltech_hospitality_platform_v1`) with one-click demo data reset in Settings

## Getting Started

### Prerequisites

- Node.js 20+ and npm

### Installation & Local Development

```bash
npm install
cp .env.example .env
npm run dev
```

The development server runs at `http://localhost:3000`.

### Type Check & Production Build

```bash
npm run lint
npm run build
```

The static production bundle is generated in `dist/` and can be deployed to Vercel, Netlify, Cloudflare Pages, GitHub Pages, or any static web server (such as Nginx).

## Project Structure

```text
src/
├── assets/images/        # Local generated staff avatars bundled by Vite
├── components/           # Modular views (Dashboard, POS, Tables, KDS, Bar/Bono, Inventory, Finance, Staff/Audit, Reports, Settings)
├── context/              # Centralized HospitalityContext store & atomic business rules
├── data/                 # Initial seed dataset & default RBAC permission matrix
├── types/                # Domain TypeScript interfaces
└── utils/                # Currency, date/time, and report export helpers
```
