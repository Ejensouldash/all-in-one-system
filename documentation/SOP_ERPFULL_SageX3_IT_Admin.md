# SAGE X3 V12 IT SYSTEM ADMINISTRATION & OPERATIONS GUIDE
## COMPREHENSIVE TECHNICAL MANUAL FOR ERPFULL & IT SUPPORT ENGINEERS
**BubblesO2 Cloud & Enterprise Resource Planning Infrastructure**  
*Document Version: 1.0 (Official) | Classification: Internal IT Confidential | Target Audience: IT Department & System Administrators*

---

## 1.0 INTRODUCTION: THE IT ADMINISTRATOR'S CHARTER & RESPONSIBILITY BOUNDARY

### 1.1 The Reality of Sage X3 for IT Engineers
Vendor training often overwhelms internal IT teams by dumping every single accounting, purchasing, and production menu into technical training sessions. **You do NOT need to become a Chief Financial Officer or a Plant Director to administer Sage X3.**

The role of the IT Department in Sage X3 is **System Reliability, Security Governance, Infrastructure Health, and Integration Pipeline**. You own the roads, bridges, and traffic lights; the business units (Finance, Warehouse, Manufacturing, Sales) own the vehicles driving on them.

---

### 1.2 The "Sanity" Responsibility Matrix: What IT Owns vs. What Business Owns

> [!IMPORTANT]
> **The Golden Rule for IT Sanity:**  
> If an issue involves server availability, user passwords, locked screens, print spoolers, batch crashes, or API connectivity, **it belongs to IT**.  
> If an issue involves debits not matching credits, wrong item selling prices, incorrect BOM formulas, or physical stock variances, **it belongs to the Respective Business Department (HOD)**.

| Operational Area | What IT Is Responsible For (IT Scope) | What Business Units Own (NOT IT's Job!) |
| :--- | :--- | :--- |
| **User & Access Management** | • Creating user accounts & assigning security profiles.<br>• Allocating license badges (`ERPFULL`, `ERPDIS`, `ERPMAN`, `ERPFIN`).<br>• Resetting passwords & unlocking accounts. | • Deciding which employee gets what business approval limit.<br>• Approving employee onboarding/offboarding workflows. |
| **System Availability & Performance** | • Syracuse Web Tier (Node.js port 8124 / 443).<br>• Batch Server (`Serveur de Batch`) uptime.<br>• Terminating deadlocks and orphaned locks (`APLLCK`).<br>• SQL Server database backups & disk storage. | • Explaining why a business process takes multiple operational steps.<br>• Inputting master data or transaction forms. |
| **Printing & Document Outputs** | • Sage Print Server service (`X3PRT`) connectivity.<br>• Network printer mapping and driver stability. | • Modifying accounting wording or legal disclaimers on invoices.<br>• Reconciling printed quantities against physical boxes. |
| **Finance & Accounting** | • Ensuring GL batch jobs execute overnight without server crash.<br>• Securing financial database tables and audit logs. | • **Reconciling balance sheets, P&L, or trial balances.**<br>• Deciding tax codes (SST) or depreciation schedules. |
| **Manufacturing & Warehousing** | • Setting up Production/Storage Sites in system topology.<br>• Ensuring barcode scanners & Web Service API pools run. | • **Setting BOM recipes, cycle times, or wastage tolerance.**<br>• Conducting physical stock counts (Wall-to-wall stocktake). |
| **Cloud Integration (BubblesO2 AIO)** | • Syracuse REST Web Service Pools (`/api1/x3/erp/...`).<br>• Service account credentials (`WS_BUBBLESO2`).<br>• Monitoring API latency, timeouts, and network tunnels. | • Verifying whether customer PO pricing is commercial or promotional. |

---

## 2.0 SAGE X3 ARCHITECTURAL TOPOLOGY FOR IT

Sage X3 V12 is built upon a decoupled 3-tier architecture. Knowing which layer is misbehaving isolates 90% of IT support tickets:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 CLIENT / PRESENTATION TIER              │
                  │  Web Browser (Chrome/Edge) · BubblesO2 AIO Cloud API    │
                  └────────────────────────────┬────────────────────────────┘
                                               │ HTTPS (Port 443 / 8124)
                                               ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │                  SYRACUSE WEB ENGINE TIER               │
                  │  • Node.js Cluster (Port 8124 / Syracuse Services)      │
                  │  • MongoDB (Port 27017) - User Profiles, Layouts, Menus │
                  │  • REST Web Service Pools (/api1/x3/erp/...)            │
                  │  • Elasticsearch (Port 9200) - Global Search Index      │
                  └────────────────────────────┬────────────────────────────┘
                                               │ Internal Socket (Port 50100)
                                               ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │                X3 APPLICATION / 4GL RUNTIME             │
                  │  • AdxAdmin (Port 50100) & Process Agent Runtime        │
                  │  • Batch Server daemon (Serveur de Batch)               │
                  │  • Print Server (X3PRT - Crystal Reports Spooler)       │
                  │  • 4GL Application Business Logic Engine                │
                  └────────────────────────────┬────────────────────────────┘
                                               │ TCP / OLE DB (Port 1433)
                                               ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │                   DATABASE REPOSITORY                   │
                  │  • Microsoft SQL Server (Instance: SAGEX3DATA)          │
                  │  • Databases: 'x3v12' (Main transactional tables)       │
                  └─────────────────────────────────────────────────────────┘
```

---

## 3.0 IT MASTER NAVIGATION CHEAT SHEET: TOP 15 FAST CODES

Do not navigate through endless nested menus. As IT, type these direct function codes into the top search bar:

| Fast Code | Full Technical Name | Navigation Menu Path | Why IT Needs This (Primary Purpose) |
| :--- | :--- | :--- | :--- |
| **`GESAUS`** | User Master | *Administration > Users > Users* | Create, edit, lock, unlock user accounts, and assign function profiles. |
| **`GESAUP`** | User Profiles | *Setup > Users > Function profiles* | Define screen authorizations, read/write permissions by role. |
| **`GESAFT`** | Functional Authorizations | *Setup > Users > Functional authorization* | Restrict access to specific modules (e.g., block Warehouse from Finance). |
| **`ASYRREG`** | Batch Server Controller | *Usage > Batch server > Server management* | Monitor, stop, and restart the Batch background job processor. |
| **`UTILISAT`** | Active User Sessions | *Administration > Utilities > Sessions* | View all currently logged-in users and disconnect hanging sessions. |
| **`APLLCK`** | System Lock Monitor | *Development > Utilities > Locks > Locked symbols* | Identify and delete zombie record locks that prevent users from editing. |
| **`CONSSPR`** | Print / Spool Queue | *Usage > Reports > Print queue* | Check status of stalled print requests and Crystal Reports jobs. |
| **`VALDIR`** | Dictionary Validation | *Development > Utilities > Dictionary > Validations* | Recompile data dictionaries and screens after applying patches or changes. |
| **`CONSSST`** | Stock by Site Inquiry | *Stock > Inquiries > Stock by site* | The ultimate inquiry to verify physical vs. allocated vs. quarantine stock. |
| **`GESBPS`** | Business Partner Supplier | *Common data > BPs > Suppliers* | Vendor master configuration (used when debugging PO issues). |
| **`GESBPC`** | Customer Master | *Common data > BPs > Customers* | Customer master setup (credit limits, payment terms, delivery addresses). |
| **`GESSOC`** | Company Master | *Common data > Company structure > Companies* | Legal entity configuration and tax registration numbers. |
| **`GESFCY`** | Site Master | *Common data > Company structure > Sites* | Facility/Warehouse/Plant site definitions (`BOMSB`, `MY01`). |
| **`GESSMP`** | System Monitor | *Usage > System monitor* | Check real-time engine CPU, memory consumption, and active SQL queries. |
| **`DOSSIER`** | Folder Management | *Development > Data and parameters > Development setup > Folders* | Inspect folders (`BASE`, `TESTX1`, `X3`), versions, and database schemas. |

---

## 4.0 USER MANAGEMENT, SECURITY GOVERNANCE & LICENSE BADGES

### 4.1 The Two-Step User Identity Architecture
In Sage X3 V12, a user consists of two interconnected records:
1. **Syracuse Web User (`Administration > Users > Users`):** Controls Web authentication, password policy, active badges, and linked endpoints.
2. **ERP X3 User (`GESAUS`):** Controls business identity inside the 4GL folder (e.g. Sales rep code, default site, approval limits).

```
┌────────────────────────────────────────┐       ┌────────────────────────────────────────┐
│           SYRACUSE WEB USER            │       │              ERP X3 USER               │
│ • Login ID & Password                  │       │ • Function Profile (GESAUP)            │
│ • License Badges (ERPFULL / ERPDIS...) │ ────► │ • Default Site (e.g. BOMSB)            │
│ • Linked Endpoints (BASE, TESTX1)      │       │ • Department Code                      │
│ • Session Timeout                      │       │ • Business Signature / Approval Matrix │
└────────────────────────────────────────┘       └────────────────────────────────────────┘
```

---

### 4.2 Demystifying License Badges

Every concurrent user in Sage X3 consumes a specific **License Badge**. Assigning the wrong badge wastes costly licenses or denies legitimate access:

| Badge Code | Badge Display Name | Permitted Operations | Typical User Roles |
| :--- | :--- | :--- | :--- |
| **`ERPFULL`** | **Full ERP System** | Unrestricted access across all modules: Finance, Distribution, Manufacturing, Admin, and Developer tools. | IT System Administrators, Internal IT Leads, Senior Operations Directors. |
| **`ERPDIS`** | **Distribution** | Sales Orders (`GESSOH`), Purchasing (`GESPOH`), Receipts (`GESPTH`), Deliveries (`GESSDH`), and Stock (`CONSSST`). | Sales Officers, Warehouse Supervisors, Purchasing Clerks, Storekeepers. |
| **`ERPMAN`** | **Manufacturing** | Work Orders (`GESMFG`), BOMs (`GESBOD`), Routing (`GESROU`), Production Tracking (`GESMTK`), and QC Release (`GESSCS`). | Production Planners, Plant Technicians, Shift Supervisors, QA/QC Officers. |
| **`ERPFIN`** | **Financials** | Invoicing (`GESSIH`), Payments (`PAYMENT`), Accounts Receivable/Payable, General Ledger, and Asset Management. | Finance Managers, Credit Control Officers, Accounts Executives, Auditors. |

---

### 4.3 Step-by-Step: Provisioning a New User Account

1. **Step 1: Create ERP X3 User Record (`GESAUS`):**
   - In the search bar, type **`GESAUS`** and press Enter.
   - Click **`[New]`** in the right Action Bar.
   - **User Code:** Enter employee ID or standardized username (e.g. `AHMAD.IT`).
   - **User Name:** Full legal name.
   - **Function Profile:** Select standardized role profile (e.g. `DIS_CLERK`, `MAN_SUPER`, `FIN_ACCNT`).
   - **Default Site:** Assign the user's primary operating facility (e.g. `BOMSB`).
   - Click **`[Create]`**.

2. **Step 2: Create Syracuse Web User Account:**
   - Navigate to **`Administration > Users > Users`**.
   - Click **`[New User]`**.
   - **Login Name:** Must match the ERP User code created in Step 1.
   - **Email:** Official corporate email.
   - Under **Endpoints**, add the target folders (e.g. `BASE` for Production, `TESTX1` for Staging).
   - Under **Badges**, click **Add** and select the appropriate license badge (`ERPDIS`, `ERPMAN`, `ERPFIN`, or `ERPFULL`).
   - Click **`[Save]`**.

---

### 4.4 Resolving Account Lockouts & Password Resets
When a user types an incorrect password 3 times or leaves a session abandoned:
1. Open **`Administration > Users > Users`**.
2. Locate the locked user account using the search box.
3. Check the **Account Status** field:
   - If marked **Locked**, click **`[Unlock]`**.
4. To reset password:
   - Click **`[Edit]`**, enter a temporary compliant password, and toggle **"Force password change at next login"**.
   - Click **`[Save]`**.

---

## 5.0 RESOLVING SYSTEM LOCKS, HANGS & DEADLOCKS (`APLLCK` & SESSIONS)

One of the most frequent support tickets IT receives is:  
*"Error: Record is currently locked by user X and cannot be modified."*

### 5.1 Why Locks Occur
Sage X3 implements row-level and symbol-level locking. If a user is creating a Sales Order or completing a Work Order and their browser crashes, their network disconnects, or their computer sleeps, the lock symbol remains orphaned in system memory.

---

### 5.2 Step-by-Step Procedure to Clear an Orphaned Lock

```
User Reports Locked Document ──► Identify Lock in APLLCK ──► Verify User Inactive ──► Delete Lock Symbol ──► Record Unlocked
```

1. Type **`APLLCK`** in the top search bar and hit Enter (*Development > Utilities > Locks > Locked symbols*).
2. The grid displays all active locks across the system:
   - **Symbol (`SYM`):** Represents the table and record ID (e.g., `SORDER~SOH2609001` or `MFGHEAD~MFG26090001`).
   - **User (`USER`):** The login ID holding the lock.
   - **Process ID (`PID`):** The internal runtime process number.
   - **Date & Time:** When the lock was placed.
3. **Safety Verification:** Check the timestamp. If the lock was created hours ago or the user is not actively working on it, it is orphaned.
4. **Action:** Highlight the locked row and click **`[Delete]`** (or right-click and select *Delete line*).
5. Confirm deletion. The document is instantly unlocked without requiring a server reboot!

---

### 5.3 Terminating a Zombie / Hanging User Session
If clearing the lock fails because the user's background process is still spinning:
1. Navigate to **`Administration > Utilities > Sessions`** (or fast code **`UTILISAT`**).
2. Locate the target user in the active sessions table.
3. Verify their idle time (e.g., Idle > 45 minutes).
4. Click **`[Terminate Session]`** (trash icon).
5. The Syracuse web tier safely disconnects the socket and cleans up temporary memory.

---

## 6.0 THE BATCH SERVER (SERVEUR DE BATCH): THE ENGINE IT MUST KEEP ALIVE

### 6.1 Why the Batch Server is Critical
The **Batch Server (`Serveur de Batch`)** is an automated background daemon. It handles non-interactive, scheduled jobs including:
- **Material Requirements Planning (MRP)** calculation runs.
- Automatic recurring stock allocations.
- Electronic invoicing (e-Invoice) and PDF batch generation.
- Interface sync routines and scheduled cleanup scripts.

> [!CAUTION]
> If the Batch Server stops, **no scheduled automation will run**, but users will still be able to log in and type orders. IT might only discover the failure days later when invoices fail to process!

---

### 6.2 Monitoring & Safe Restart Procedure (`ASYRREG`)

1. Type **`ASYRREG`** in the search bar (*Usage > Batch server > Server management*).
2. Inspect the **Server Status** banner at the top:
   - **Green / Running:** Normal healthy state.
   - **Red / Stopped / Inactive:** The batch service has halted!
3. **If the Server is STOPPED:**
   - In the right Action Bar, click **`[Deactivation]`** (if stuck in an intermediate state).
   - Wait 10 seconds.
   - Click **`[Activation]`**.
   - The status light should turn Green, and the message *"Batch server running"* will appear.
4. **Checking the Queue:**
   - Click **`[Batch controller]`** or view the queue tab to ensure queued jobs change from status *Pending* to *In Progress* or *Completed*.

---

## 7.0 SYRACUSE WEB SERVICES & INTEGRATION POOLS (BUBBLESO2 AIO PIPELINE)

The BubblesO2 AIO Cloud system communicates directly with Sage X3 through the **Syracuse REST Web Services Tier**. IT is responsible for maintaining this connection.

### 7.1 Architecture of Syracuse REST Endpoints
- **Standard Protocol:** HTTPS (Port 443 via Reverse Proxy / Cloudflare Tunnel, or internal port 8124).
- **Endpoint Structure:**
  ```http
  https://{SAGE_HOST}:{SAGE_PORT}/api1/x3/erp/{FOLDER}/{CLASS}
  ```
  - Staging Folder: `TESTX1`
  - Production Folder: `BASE`
- **Authentication:** Dedicated Service Account (e.g. `WS_BUBBLESO2`) using HTTP Basic Authentication.

---

### 7.2 Dedicated Integration Service Account Checklist
IT must ensure the API user has the following settings in Syracuse:
1. **Login Name:** `WS_BUBBLESO2`
2. **Badge Allocation:** Must be assigned **`ERPDIS`** (Orders/Stock/Customers) and **`ERPFIN`** (Invoices/Payments), or **`ERPFULL`**.
3. **Session Timeout:** Set to **0 (Infinite / Persistent)** so automated Cloud background workers are never abruptly disconnected.
4. **Endpoints Enabled:** Authorize access to `TESTX1` and `BASE` folders.

---

### 7.3 Managing Syracuse Web Service Pools
If Cloud sync requests return `HTTP 503 Pool Exhausted` or `Timeout`:
1. Open **`Administration > Web services > Classic SOAP web services pools`** (or REST pools).
2. Find the pool assigned to the active folder (e.g. `BASE_POOL`).
3. Check the **Status**: Must be **Started**.
4. Check **Pool Size**: Standard size is typically 2 to 5 channels. If Cloud sync throughput increases, increase channels by 1 or 2.
5. If the pool is hung, click **`[Stop]`**, wait 15 seconds, and click **`[Start]`**.

---

## 8.0 PRINT SERVER & CRYSTAL REPORTS INCIDENT RESPONSE

When warehouse operators or sales officers report:  
*"The Print button is greyed out"* or *"Error: Crystal Reports engine communication failed"*:

### 8.1 Restarting the Windows Print Service (`X3PRT`)
The Sage X3 print server is an independent Windows service called `AdxSrvImp` or `Sage X3 Print Server`:
1. On the Sage X3 server host, open Windows **Services** (`services.msc`).
2. Scroll to locate:
   - **Sage X3 Print Server** (`X3PRT` / `AdxSrvImp`)
3. Check its status:
   - If *Stopped*, right-click and select **Start**.
   - If *Running* but reports are failing, right-click and select **Restart**.
4. Verify port listening: Port `1801` or the configured print spooler port should be in `LISTENING` state.

---

## 9.0 THE 5-MINUTE DAILY IT HEALTH CHECK ROUTINE

Perform this checklist every morning before business hours (08:30 AM):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        DAILY 5-MINUTE IT HEALTH CHECK CHECKLIST                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ ] 1. SAGE X3 WEB TIER: Browse to Syracuse login page. Confirm login prompt loads.    │
│ [ ] 2. BATCH SERVER (ASYRREG): Check status is GREEN / RUNNING.                        │
│ [ ] 3. ACTIVE LOCKS (APLLCK): Check for locks older than 24 hours. Clear if orphaned.  │
│ [ ] 4. DISK SPACE: Confirm Server Drive C: and Database Drive have > 20% free space.   │
│ [ ] 5. SYRACUSE LOGS: Check for fatal red errors in Administration > Utilities > Logs. │
│ [ ] 6. PRINT SERVICE: Verify 'Sage X3 Print Server' service is running.                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 10.0 EMERGENCY IT INCIDENT RESPONSE CHEAT SHEET

| Symptom / Error Reported | Root Cause | Immediate IT Action |
| :--- | :--- | :--- |
| **"System is completely down / 502 Bad Gateway"** | Syracuse Node.js process has halted, or MongoDB service crashed. | 1. Remote into server.<br>2. Check `Syracuse` Windows service. Restart service.<br>3. Verify `MongoDB` service is running on port 27017. |
| **"User cannot save: Record locked by [USERNAME]"** | Previous session crashed while keeping a transaction lock open. | 1. Run **`APLLCK`**.<br>2. Find symbol matching document ID.<br>3. Delete lock symbol line. |
| **"Scheduled jobs did not run overnight (MRP / Invoices missing)"** | Batch Server daemon (`Serveur de Batch`) crashed or was paused. | 1. Open **`ASYRREG`**.<br>2. Click `[Deactivation]`, then `[Activation]`.<br>3. Verify batch queue resumes processing. |
| **"User cannot login: Maximum number of connections reached"** | License badge limit exhausted due to abandoned inactive sessions. | 1. Open **`UTILISAT`**.<br>2. Filter by idle time > 60 minutes.<br>3. Terminate inactive ghost sessions to free up badges. |
| **"BubblesO2 Cloud sync fails: 401 Unauthorized"** | Service account password expired or user locked out in Syracuse. | 1. Open Syracuse `Administration > Users > Users`.<br>2. Locate `WS_BUBBLESO2`.<br>3. Unlock account and check password validity. |
| **"Printing DO / Invoices hangs indefinitely"** | Print Server service `X3PRT` is frozen. | 1. Open Windows `services.msc`.<br>2. Restart `Sage X3 Print Server` service. |

---

> [!NOTE]
> **Internal IT Department Charter Notice**  
> This operational manual is maintained by the IT Infrastructure & Integration Team. For escalated technical architecture inquiries or database-level support, consult the internal server repository documentation.  
> *Sistem ERP Sage X3 V12 — IT Administration Manual (ERPFULL) | Official BubblesO2 Technical Document*
