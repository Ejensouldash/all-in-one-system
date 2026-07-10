# 💧 BubblesO2 All-in-One System

[![Next.js](https://img.shields.io/badge/Next.js-16.2.9-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38bdf8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma_ORM-7.8.0-2d3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169e1?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Vercel Deployment](https://img.shields.io/badge/Deployment-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)

> [!IMPORTANT]
> **UNDER CONSTRUCTION / ACTIVE DEVELOPMENT**
> This repository is currently in active construction. Certain modules are undergoing live testing and optimization. Please read the contribution guidelines below before reviewing the code base.

---

## 🛠️ Enterprise Core Modules

The BubblesO2 All-in-One System is an integrated corporate hub designed to coordinate production logging, warehousing, assets, and IT support services.

### 📋 1. Production Daily Reports (DPR)
- **Step-by-Step Reporting**: Captures shift metadata, active line outputs, raw material usage, rejects, and stock holds in a single form wizard.
- **Dynamic Calculation Engine**: Features real-time bag/multiplier conversion logic and automatic carry-forwards between subsequent shifts.
- **"No Production" Fallback**: Allows shift logging even during line downtime by automatically carrying forward all active stock balances with zero usage.

### 📦 2. Warehouse & Logistics Suite
- **Opening Stock Tracking**: Logs starting raw materials with timestamps down to the minute.
- **Transfer In Logs**: Organizes incoming supplier deliveries linked directly to active Delivery Orders (DOs) filtered by shifts.
- **Warehouse Distributions**: Streamlines product deliveries and logs Proof of Delivery (POD) confirmations.

### 🏷️ 3. Asset Management Framework
- **AI-Powered Fuzzy Importer**: Uses Google Gemini (`gemini-3.1-flash-lite`) to map arbitrary columns from spreadsheet asset uploads into structured database tables with visual preview confirmation.
- **Batch Barcode & QR Generation**: Generates standard dynamic QR stickers for assets, supporting batch print queues stored in browser session storage.
- **Scanner Search**: Search and pull up individual assets instantaneously by scanning their printed QR codes via webcams.

### 🎫 4. IT Support Ticket System
- **Resolution Tracking**: Departmental ticketing console enabling staff to log incidents, classify issues, and link affected assets.
- **IT Assignment Loop**: Enables superadmins to assign tickets directly to specific IT technicians and track their status in real-time.

### 💬 5. Aria Chatbot Integration
- **AI Assistance**: An interactive bilingual assistant responding to IT queries in colloquial Malay and English.
- **Rich Markdown Formatting**: Renders responsive tables, step-by-step guides with indicator badges, and highlights important actions using `react-markdown`.

### ⚙️ 6. System Settings
- **Stripe/Linear-Style Layout**: Features an elegant, minimal vertical navigation panel on desktop and horizontal scrollbar on mobile.
- **Micro-Interactions**: Active tab changes trigger vertical sliding layout animations using `framer-motion`.

---

## 📂 Project Directory Structure

Below is the directory map showing the core directories and the newly isolated folder for standalone diagnostic utility scripts:

```bash
all-in-one-system/
├── .github/
│   ├── scripts/             # Production backend backup pipeline scripts
│   └── workflows/           # Automated scheduled GitHub Actions (cron dumps)
├── prisma/
│   ├── schema.prisma        # PostgreSQL relational database schema
│   └── migrations/          # Schema generation history
├── public/
│   ├── assets/              # App images, logos, and excel templates
│   └── avatars/             # Animated state-based agent assets (Aria)
├── scripts/                 # Isolated standalone developer utility scripts
│   ├── check_*.ts           # Diagnostic inventory and check logs
│   ├── test_*.js            # Testing routes, Excel mapping and buckets
│   └── fix_*.ts             # Active correction and repair routines
└── src/
    ├── app/                 # Next.js App Router (Pages, actions & APIs)
    ├── components/          # Reusable UI widgets and layout views
    └── lib/                 # Core server libraries, configurations & Prisma Client
```

---

## 🚀 Local Development Setup

To spin up a local development environment:

1. **Clone the repository and install dependencies**:
   ```bash
   git clone https://github.com/Ejensouldash/all-in-one-system.git
   cd all-in-one-system
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"
   NEXTAUTH_SECRET="your-next-auth-secret"
   GEMINI_API_KEY="your-google-gemini-api-key"
   ```

3. **Synchronize Database Schema**:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. **Launch Local Server**:
   ```bash
   npm run dev
   ```

---

## 🔒 Shared Access Guidelines (Read-Only)

> [!WARNING]
> **IT TEAM COLLABORATORS**: Please follow these instructions to invite your team without giving them push privileges.

### How to configure Read-Only access on GitHub:

1. **Private Repository Invite**:
   - Go to your repository on GitHub.
   - Click **Settings** (tab at the top) -> **Collaborators** (left menu).
   - Click **Add people** and search for your team member's GitHub username.
   - In the role dropdown, select **Read** (instead of Write or Admin).
   - This allows them to clone, view, and open issues, but prevents them from directly making changes.

2. **Establish Branch Protection Rules**:
   - Under repository **Settings** -> **Branches**.
   - Click **Add branch ruleset**.
   - Target the `main` branch.
   - Select **Require a pull request before merging** and **Require approvals** (minimum 1 review).
   - This ensures that even if anyone gains write access, they cannot commit directly to the production branch without a peer review.
