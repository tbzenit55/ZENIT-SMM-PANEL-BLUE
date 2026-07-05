# ZENIT SMM Panel — Enterprise Platform Documentation
Welcome to the absolute master documentation and operational manual for the **Zenit SMM Panel** platform. This document is compiled to provide deployment teams, system engineers, and SMM panel administrators with complete clarity on the architecture, setup procedures, and security controls of this production-ready application.

---

## 1. Project Overview
**Zenit SMM Panel** is an ultra-fast, modern, full-stack, and high-performance Social Media Marketing (SMM) reseller panel platform. It allows users to register, fund their wallets via multiple unified payment gateways (UPI, Paytm, PhonePe, Cards, Binance Pay), place high-volume marketing orders (likes, followers, subscribers), and monitor automated order execution tracked through external SMM providers APIs.

### Core Architectural Pillars
1. **Client Interface (SPA)**: Built using React 18, Vite, Tailwind CSS, and Framer Motion, delivering a high-fidelity dark cosmic user experience with sub-millisecond route transitions and fully responsive mobile layout.
2. **Backend Engine**: Express Node.js custom server running on Cloud Run, providing robust middleware, token security, rate-limiting, and an automated background synchronization engine.
3. **Dual Database Engine**: Utilizes a polymorphic storage system. When Firebase Admin credentials are initialized, it binds dynamically to **Cloud Firestore** for enterprise cloud persistence. If credentials are not present, it transitions seamlessly to a zero-config, highly-performant **in-memory database** with local persistence, guaranteeing 100% startup success.
4. **API Provider Synchronization Engine**: An asynchronous poll-and-sync worker that communicates with top-tier third-party SMM providers (such as Standard SMM Reseller API structures), synchronizing order statuses and updating client profiles automatically.

---

## 2. Folder Structure
The codebase is structured under a clean separation-of-concerns model, separating full-stack backend processes from front-end SPA screens.

```
├── /server                 # Express Full-Stack Backend Code
│   ├── /config             # Store engines, wallets, sync workers, and adapters
│   │   ├── firebase.ts     # Firebase Auth & Firestore Admin Initialization
│   │   ├── orderSync.ts    # Background active order status polling system
│   │   ├── providerAdapter.ts # Unified interface for communicating with SMM Provider APIs
│   │   ├── store.ts        # Polymorphic Firestore / In-Memory database interface
│   │   ├── syncEngine.ts   # System-wide cron-like sync worker scheduler
│   │   └── walletStore.ts  # Ledger, transaction auditing, and safe balance modifiers
│   └── /routes
│       └── api.ts          # Express API router (Users, Orders, Payments, Tickets, Sync)
├── /src                    # Vite SPA React Frontend Source
│   ├── /components         # Global UI, high-contrast inputs, toast alerts, loaders
│   ├── /context            # Authentication state providers
│   ├── /lib                # API fetch helper configurations (Axios clients with interceptors)
│   ├── /pages              # Screen layouts and modules
│   │   ├── /admin          # SMM Admin Panel Control pages
│   │   │   ├── Logs.tsx         # Multi-tab Audit Trail & Security incident viewer
│   │   │   ├── Notifications.tsx # Broadcast and single recipient dispatcher
│   │   │   ├── Orders.tsx       # System-wide order overriding panel
│   │   │   ├── Overview.tsx     # Performance analytics & revenue visual graphs
│   │   │   ├── Providers.tsx    # SMM API Providers manager & connection health test
│   │   │   ├── Reports.tsx      # System ledger reports & volume tables
│   │   │   ├── Services.tsx     # Mass service custom pricing & toggle panels
│   │   │   ├── Settings.tsx     # Disaster backup/restore & Website control prefs
│   │   │   ├── Tickets.tsx      # Customer support management terminal
│   │   │   ├── Users.tsx        # Mass user profile & financial balance editor
│   │   │   └── Wallets.tsx      # Manual Deposit approval manager
│   │   └── /user           # SMM User Client Panel pages
│   │       ├── Dashboard.tsx    # Overview, welcome notification cards
│   │       ├── Deposit.tsx      # UPI scanners, copy-paste wallet addresses
│   │       ├── NewOrder.tsx     # Dynamic Category-Service price estimation selector
│   │       ├── Orders.tsx       # Historical order records with status badges
│   │       ├── Profile.tsx      # Password updating & secure active session tracker
│   │       └── Tickets.tsx      # Live support ticket creator
│   ├── App.tsx             # Main routing component (Guards, Layouts, Roles)
│   ├── index.css           # Global Tailwind stylesheet, custom dark cosmic values
│   ├── main.tsx            # React application mounting point
│   └── types.ts            # Core TypeScript model definitions & ledger interfaces
├── .env.example            # Environment variables placeholder
├── firebase-blueprint.json # Schema blueprint for Cloud Firestore indexes & constraints
├── firestore.rules         # Enterprise Security Rules for Firestore
├── metadata.json           # Application platform configuration metadata
└── package.json            # Dependency manifest, scripts (dev, build, start)
```

---

## 3. Installation Guide

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Step-by-Step Installation
1. **Clone & Extract**: Extract the platform package into your local working directory.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment**: Create a `.env` file in the root directory based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. **Launch Development Server**:
   ```bash
   npm run dev
   ```
   The application dev server will spin up. Access the frontend dashboard at `http://localhost:3000`.

---

## 4. Environment Variables
To ensure seamless operations, the following environment variables can be defined in your `.env` file:

```env
# Server Ingress Configuration
PORT=3000

# Firebase Service Account (JSON payload stringified on a single line)
# Used to enable Durable Cloud Persistence. If omitted, the app runs on high-speed In-Memory DB.
FIREBASE_SERVICE_ACCOUNT_JSON=

# Optional: Disable Firebase and force In-Memory operations
FORCE_MEMORY_DB=false
```

*Note: The platform is designed with full lazy-initialization logic. If no service account JSON is supplied, the server will start up in high-performance Memory Database mode with a warm logging indicator to make prototyping effortless.*

---

## 5. Firebase Setup

### Provisioning the Database
1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project named `Zenit SMM Panel`.
3. Provision a **Cloud Firestore** database in production mode.
4. Set up **Firebase Authentication** and enable the **Email/Password** sign-in method.

### Deploying Security Rules & Schemas
Secure your Cloud Firestore by applying the rules found in `/firestore.rules`:
1. Copy the contents of the root `firestore.rules` file.
2. Paste them into the **Rules** tab of your Firestore Database console and click **Publish**.
3. Verify your schemas align with `firebase-blueprint.json` to ensure optimal indexing.

---

## 6. Deployment Guide

### Deploying the Backend (Cloud Run / Render)
1. Dockerize your container or deploy directly via Node.js runtime.
2. Build commands executed in production environments:
   ```bash
   npm run build
   ```
   This will bundle the React frontend and compile the backend `server.ts` into a self-contained CommonJS file located at `dist/server.cjs` via high-speed `esbuild` type stripping.
3. Start the production cluster:
   ```bash
   npm start
   ```

### Deploying the Frontend (Vercel / Netlify / Static Hosts)
If deploying in a decoupled architecture, Vite compiles highly-optimized static files into the `dist/` directory on build. Simply hook up your continuous integration pipeline to target the `dist/` folder.

---

## 7. Admin Guide
The Admin Panel is a high-octane central command terminal accessed via `/admin` routes by users assigned the **Admin** or **Super Admin** role.

### Key Capabilities
- **Overview Dashboard**: Track daily deposits, processing orders, revenue graphs, and top-selling services.
- **User Manager**: Edit individual balances, change user status (Active, Suspended, Banned), adjust roles, and force-terminate active sessions.
- **Services Control**: Import services in bulk from SMM providers, modify retail price margins, and toggle categories.
- **Support Terminal**: Reply to user queries and resolve support tickets.
- **Live System Audit Logs**: Track administrator audit logs and platform security logs in real-time.

---

## 8. User Guide
The user dashboard provides marketing clients with an immersive, self-service reseller experience.

### Core Workflows
1. **Wallet Deposits**: Navigate to **Add Funds**, choose a payment method, execute the payment transfer, copy the transaction reference number (UTR ID), and submit the transaction.
2. **Ordering**: Navigate to **New Order**, select the target category and service, enter the destination URL (e.g., social media profile link), enter the quantity, and confirm.
3. **Tracking**: Instantly monitor order progress (Pending, Processing, In Progress, Completed, Partial, Canceled, Refunded) in the **Order History** dashboard.
4. **Support**: Open a ticket to receive immediate administrative assistance.

---

## 9. Provider Integration Guide
SMM Panel reseller volume is driven by provider integrations. The platform integrates with standard SMM Reseller APIs.

### Adding an API Provider
1. Navigate to **Admin -> Providers**.
2. Click **Add API Provider**.
3. Enter the Provider's endpoint API URL and your private API key.
4. Click **Test Health**. The system will make a live handshake and check your provider balance.
5. Click **Import Services** in the Services tab to pull all services directly into your platform catalog.

---

## 10. Payment Setup Guide
The platform supports custom customizable payment gateways.

### Configuration
1. Navigate to **Admin -> Settings -> Billing Gateways**.
2. Click **Add Custom Gateway** or edit an existing one (e.g. PhonePe, Paytm, UPI).
3. Configure the Gateway Display Name, Logo Icon (QrCode, Coins, Smartphone, CreditCard), and transfer processing times.
4. Input your payment address (e.g. your active merchant UPI ID) and upload/link your static Scanner QR code.
5. Clients will instantly see this gateway option in their deposit dashboard with a click-to-copy address and scanner helper.

---

## 11. Backup & Restoration Guide
We have implemented a high-performance disaster recovery snapshotting engine.

### Creating a Snapshot Backup
1. Navigate to **Admin -> Settings -> Backups & Restore**.
2. Click **Create Snapshot Backup**.
3. The platform gathers all Firestore collections (users, services, categories, orders, settings, tickets, notification templates, logs), packages them into a single secure JSON document, and initiates an automatic browser download.
4. Save this file in a secure vault.

### Restoring a Snapshot
1. Navigate to the **Backups & Restore** console.
2. Under **Disaster Recovery Restoration**, drag-and-drop or upload your `.json` snapshot file.
3. Click **Apply System Restoration**.
4. Confirm the warning prompt. The database engine will parse the file and rebuild the Firestore collections dynamically.

---

## 12. Security Guide
Security is designed into the core layer of SMM operations:

- **JWT Auth & Firebase Guards**: Endpoints verify JWT auth tokens and double-check roles server-side.
- **Audit Trails**: All administrative adjustments (balance editing, role changes, provider updates) log rich audit records to the `audit_logs` collection.
- **Security Incident Logs**: Critical events (suspensions, session revocations, database restores) trigger High/Critical security notifications logged in the security incident viewer.
- **Session Revocation**: Admins can revoke all active user sessions instantly, which invalidates their authorization tokens at the next middleware check.
- **Rate-Limiting**: Essential API endpoints are protected from abuse using customizable rate-limit headers.

---

## 13. Troubleshooting Guide & FAQ

### Q: Why does it say "Please wait while your application starts..." indefinitely?
**A**: Ensure your backend container has successfully bound to port `3000` and host `0.0.0.0`. Check server startup logs for potential syntax errors in `.env` variables.

### Q: Why do I see a "Missing or insufficient permissions" error in Cloud Firestore?
**A**: Ensure you have successfully copied and published the rules from `firestore.rules` to your active Firebase project's Firestore database.

### Q: How does the order synchronization background worker run?
**A**: The sync engine is integrated directly into the Express lifecycle. It launches on server start, executing dynamic checks for active orders (statuses like pending, processing, inprogress) every 3 minutes, communicating via `ProviderAdapter` with the upstream APIs.

---
*Zenit SMM Panel is maintained as an enterprise platform, optimized for high throughput and security.*
