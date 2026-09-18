# Super Mart Store Panel

This is the panel that a supermarket and its branch staff use. It is built with Vue 3, Vuetify 3, Pinia and CASL, and talks to `Super-Mart-Backend`. The platform admin panel is a separate app, `Super-Mart-Admin`.

## Two looks, chosen by role

| Who | Shell | Look |
| --- | --- | --- |
| Cashier (Sale Counter only) | `layouts/full/PosShell.vue` | Desktop till: navy title bar, window captions, dark-header grids, blue function keys, status bar |
| Manager and Product Entry | `layouts/full/AdminShell.vue` | Same design as `Super-Mart-Admin` in blue: left sidebar, top bar, breadcrumb page header, white cards, light tables |

`layouts/full/FullLayout.vue` picks the shell: a user whose permissions leave only one menu item (the cashier) gets the till shell, everyone else gets the admin shell. It also puts a `pos-ui` class on `<html>` for the cashier and on the Sale Counter page, so the counter keeps the dense desktop styling even when a Manager opens it. Those styles live in `src/scss/layout/_desktop.scss`, which is entirely nested under `html.pos-ui`; everything else in `src/scss` is the admin design system.

## Roles

Roles are built in the admin panel and picked here. The four below ship ready to use.

| Role | What they do | Opens on |
| --- | --- | --- |
| Owner | Everything. The first login of a new client gets this role and can switch between all branches | Summary |
| Manager | Everything: sales, counters, stock, products, users, branches and settings | Summary |
| Cashier | Sale Counter only: scans items, takes Cash, Card or Online payment, prints the receipt | Sale Counter |
| Product Entry | Products, categories, brands, suppliers and incoming stock (Stock In, opening stock, transfers, adjustments) | Products |

These four are the roles that ship ready to use. The platform admin can retune their permissions, or add more store roles, from the admin panel — stores pick a role but never create one. Every tab and page checks one permission key, so a role without `products_view` has no Products tab and cannot open `/products` by typing the URL.

## Setup

```bash
npm ci
cp .env.example .env         # VITE_API_URL=http://localhost:4000/api/
npm run dev -- --port 5175   # the port must be listed in the API's CORS_ORIGINS
npm run build
```

Demo logins (after `npm run seed -- --demo` in the backend):

| Email | Password | Who |
| --- | --- | --- |
| `owner@supermart.local` | `Owner@123` | Business owner (Manager), can switch between all branches |
| `manager@supermart.local` | `Manager@123` | Manager, locked to Gulberg Branch |
| `cashier@supermart.local` | `Cashier@123` | Cashier, locked to Main Branch |
| `entry@supermart.local` | `Entry@123` | Product Entry, locked to Main Branch |

## Branch context

- The branch picker in the title bar (`layouts/full/BranchSwitcher.vue`) calls `authStore.storeLogin()`, which stores `clientstoreId`, `storeName` and `clientstore` in localStorage.
- Staff linked to a store have no picker. They always work in their own branch, and the API enforces this too.
- Routes with `meta.requiresStore` redirect to `/store` until a branch exists. `useListPage(resource, { storeScoped: true })` sends `clientstore_id` and reloads when the branch changes.
- The Sale Counter menu item is hidden when the branch has `is_pos_active` turned off.
- After login, `/` sends each user to the first page their permissions allow: Summary, then Sale Counter, then Products, then Stock (`landingPath()` in `router/index.ts`). A page the user may not open also sends them there.

## Sale Counter: how a cashier bills

The counter window has three tabs, like the desktop program it replaces: **Detail** (billing), **List** (bills) and **Report** (receipt preview).

1. **Open the counter.** Count the cash in the drawer and press *Open Counter*. Billing and refunds need an open counter.
2. **Add items.**
   - **Scanner:** a USB or Bluetooth barcode scanner types into the *Barcode* field and presses Enter, which calls `GET pos/scan/:code`. Press **F2** to jump back to that field. Type `3*` before a code to add 3.
   - **Weight labels:** a 13-digit code that starts with `2` is read as a scale label: digits 2–7 are the PLU and digits 8–12 are the grams. Set the loose product's variant barcode to its PLU (the demo lentils use `100200`, so `2100200012500` adds 1.25 kg). Scanning the PLU on its own asks for the weight.
   - **Find Item (F3):** search by name, SKU or barcode, move with ↑ ↓ and press Enter.
   - **Edit a line:** ↑ ↓ selects a line, + / − changes its quantity and Del removes it. Line and bill discounts need `pos_discount` (Managers only).
3. **Party (F4, optional).** Enter the customer's phone number. An existing customer is picked up, and a new number is saved with the bill.
4. **Pay.** Pick the payment type: **Cash** (Alt+1), **Card** (Alt+2) or **Online** (Alt+3).
   - Cash: type the cash received or use a quick-cash button, and the cash back is shown.
   - Card and Online: the full bill is charged, and a reference or transaction ID can be typed.
   Press **Enter** on an empty barcode field or **F9** to jump to the payment box, then Enter or F9 again to save.
5. **Bill and receipt.** `POST pos/sales` deducts stock in one transaction and returns a bill number such as `MAIN-2609-00001`. The 80 mm receipt PDF (`pos/sales/:id/receipt`) prints straight away through a hidden iframe when *Print receipt after saving* is ticked. **F10** reprints the last bill, and each reprint is counted.
6. **List and Report tabs.**
   - *List* shows this counter's bills, or bills in a date range, with the payment type. Click a bill to select it, and double-click to open its receipt.
   - *Report* previews the receipt of the last or selected bill, and can print or download it.
7. **Hold, return, close.**
   - *Hold (F6)* parks the cart in this browser, and *Un Hold (F7)* brings it back.
   - *Return (F8)* looks up a bill and refunds selected quantities (needs `pos_return`, Managers only). The stock goes back on the shelf.
   - *Close Counter* compares the expected cash with the counted cash and records any shortage or overage.

Managers see every bill, the KPIs and gross profit on **Sales List**, and every counter session on **Counters**.

## Modules

| Area | Pages |
| --- | --- |
| Sale | Summary (Manager dashboard), Sale Counter, Sales List, Counters |
| Stock | Stock (on hand, expiring batches), Stock In (goods receipts), Purchase Orders, Opening Stock, Transfers, Adjustments, Stock Ledger |
| Items | Products (variants with SKU and barcode), Categories (department → aisle → category), Brands, Taxes |
| Party | Customers, Suppliers |
| Setup | Users (staff accounts with one of the three roles), Branches, Business Settings |

Document flow:

- **Purchase Order:** draft → approve → *Receive Goods*.
- **Goods Receipt:** prefilled from the PO. *Save & Post* adds the goods to stock.
- **Stock Transfer:** the sending branch dispatches, then the receiving branch confirms the quantities that arrived.
- **Stock Adjustment:**
  - A count correction books the difference from system stock.
  - Damage and expiry remove stock.
  - *Other* can add or remove stock.

## Conventions

Pages are built from these shared pieces:

| Piece | What it does |
| --- | --- |
| `AppSidebar` / `PageHeader` | Sidebar menu and breadcrumb + page title. Both read the groups in `stores/menu.ts`, filtered by permission |
| `UiParentCard` | White card with a title row (`title`, `icon`, `#action` slot) |
| `ListToolbar` | Search, filters, record count, Excel/PDF and *Add New* buttons |
| `v-data-table` | The table, with `TableBottom` for "Showing x to y of z" paging |
| `RightDrawer` | Add/edit form in a modal (blue header, footer buttons). It exposes `validate()` |
| `DeleteDialog` | Confirm box |
| `DeskDialog` | Desktop-style window used by the counter's own dialogs (find item, held bills, close counter, return) |
| `useAlerts` | Inline success and error alerts |

Other conventions:

- **Permissions:** loaded from `GET auth/me/permissions` as CASL rules `can(permission_key, module_name)`. Routes use `meta.action` / `meta.subject`, and buttons use `$can(...)`. The API checks the same keys.
- **Image uploads:** go to `POST files/<folder>/upload` through `ImageField`.
