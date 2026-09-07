# BUBBLESO2 ALL-IN-ONE (AIO) SYSTEM
## IT OPERATIONS & CORE INFRASTRUCTURE TECHNICAL MANUAL
**Comprehensive Operational Guide for IT Support Engineers, System Administrators & Management**  
*Document Version: 1.0 (Official) | Classification: Internal IT Confidential | Language: English*

```
Project Title: BubblesO2 All-In-One (AIO) System — IT Operations & Core Infrastructure Manual
User: Iskandar
Department: IT Department
Date: September 2026
Target Audience: Internal IT Support, System Administrators & Executive Management

for BUBBLESO2 SDN BHD

Prepared by,
Muhammad Iskandar Zulkarnain Bin Zulkifli
System Developer,
Information Technology,
Information Technology Department
BubblesO2 Sdn Bhd

Approved by,
Abdul Aziz Arifin
Manager,
Information Technology,
BubblesO2 Sdn Bhd
```

---

## 1.0 EXECUTIVE SUMMARY & SYSTEM ARCHITECTURE

### 1.1 Executive Summary
The **BubblesO2 All-In-One (AIO) System** is a mission-critical, cloud-native enterprise application engineered internally to unify facility management, production reporting, digital quality assurance, and **Information Technology Service Management (ITSM)** under a unified, high-performance interface.

While the enterprise accounting and general ledger functions are governed by the tier-1 ERP (Sage X3 V12), the **BubblesO2 AIO System** serves as the agile operational engine for daily ground-level operations. It bridges the gap between shop-floor execution and management oversight, eliminating unorganized paper forms, manual handwriting calculations, and fragmented communication channels.

This manual provides an exhaustive, field-level technical and operational walkthrough for the seven core IT administration and operational pillars:
1. **IT Operations Dashboard & Real-Time Analytics**
2. **IT Smart Ticketing System (ITSM Lifecycle)**
3. **Event Calendar & Preventive Maintenance Scheduler**
4. **Asset Management (Registration, QR Tagging, Auditing, and Maintenance)**
5. **User Management & Granular Role-Based Access Control (RBAC)**
6. **Organizational Hierarchy (Branches, Operational Units, and Cost Catalog)**
7. **Global System Settings, Broadcast Notices, and Security Governance**

---

### 1.2 Architectural Overview of the AIO Platform
The BubblesO2 AIO system is built using modern cloud architecture standards:
* **Frontend Framework:** Next.js 16 (App Router) leveraging React 19 server components for instantaneous rendering.
* **Database & ORM:** PostgreSQL running with Prisma ORM 7, utilizing connection pooling (`@prisma/adapter-pg`) for sub-second query latency.
* **Authentication & Security:** NextAuth.js v5 with strict role-based access control, cryptographic session cookies, and bcryptjs hashing.
* **Integration Ecosystem:** Google Calendar API v3 (bidirectional event sync), Cloudflare R2 / AWS S3 (secure document and signature storage), and Resend / SMTP for real-time ticket alerts.

```
       ┌─────────────────────────────────────────────────────────────┐
       │              BUBBLESO2 AIO PLATFORM ARCHITECTURE            │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                              ▼
 ┌───────────────┐            ┌───────────────┐              ┌───────────────┐
 │  ITSM SUITE   │            │ ASSET & ORG   │              │ GOVERNANCE    │
 │ • IT Dashboard│            │ • Asset Master│              │ • Users & RBAC│
 │ • Smart Ticket│            │ • QR Printing │              │ • Settings    │
 │ • Calendar    │            │ • Branches    │              │ • Notice Board│
 └───────┬───────┘            └───────┬───────┘              └───────┬───────┘
         │                            │                              │
         └────────────────────────────┼──────────────────────────────┘
                                      ▼
                      ┌──────────────────────────────┐
                      │    CENTRAL PRISMA / PG DB    │
                      │  PostgreSQL Relational Core  │
                      └──────────────────────────────┘
```

---

## 2.0 IT OPERATIONS DASHBOARD & ANALYTICS

### 2.1 Overview & Navigation
* **Navigation Path:** Top Navigation Bar ➔ **`Dashboard`** (or direct URL: `/dashboard`)
* **Access Level:** Available to all logged-in staff; Executive analytics and company-wide KPI cards are automatically unlocked for `SUPERADMIN` and `ADMIN` users.

The IT Dashboard provides an instant, real-time command center summarizing the health of the organization's digital and physical IT infrastructure.

---

### 2.2 Key Performance Indicators (KPI Cards)
At the top of the dashboard, five real-time metric cards summarize the current operational workload:

| Metric Card | Description | Operational Significance for IT |
| :--- | :--- | :--- |
| **Total Tickets** | Total historical tickets recorded in the system. | Reflects overall departmental workload and system adoption. |
| **Pending Issues** | Tickets currently in `OPEN` or `IN_PROGRESS` status. | **Action Required:** IT engineers must triage and resolve these issues to maintain SLA compliance. |
| **Resolved Today** | Number of tickets marked `RESOLVED` on the current calendar day. | Evaluates IT team daily productivity and resolution velocity. |
| **Active Assets** | Total physical assets currently marked as `AVAILABLE` or `ASSIGNED`. | Indicates total live hardware currently deployed across all facilities. |
| **Upcoming Events** | Total scheduled events or maintenance tasks booked for the upcoming 7 days. | Prevents scheduling clashes for server maintenance or site visits. |

---

### 2.3 Interactive Analytics Charts
For system administrators, the dashboard dynamically compiles chart telemetry:
1. **Ticket Status Distribution (Donut Chart):** Visualizes the proportion of tickets across statuses (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`).
2. **Departmental Ticket Volume (Bar Chart):** Highlights which department generates the most IT incidents (e.g. Production Line 1 vs. Warehouse vs. Finance), identifying recurring hardware failures.
3. **Recent Activity Feed:** Displays the latest five logged events, including asset checkouts, ticket updates, and user profile changes.

---

## 3.0 IT SMART TICKETING SYSTEM (ITSM LIFECYCLE)

### 3.1 Overview & Purpose
* **Navigation Path:** Top Navigation Bar ➔ **`Tickets`** (or direct URL: `/tickets`)
* **Access Level:** All staff can submit tickets; IT Engineers and Superadmins can update status, assign technicians, link hardware assets, and log maintenance costs.

The IT Smart Ticketing System provides a standardized, auditable process for logging, investigating, and resolving technical issues (network disruptions, printer failures, hardware damage, or ERP software bugs).

---

### 3.2 The Complete Ticket Lifecycle Workflow

```
 ┌──────────────────────┐
 │ 1. TICKET SUBMISSION │ User submits request via portal or QR scan on physical asset
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ 2. TRIAGE & ASSIGN   │ IT Lead reviews severity, sets priority, and assigns Engineer
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ 3. IN-PROGRESS WORK  │ Engineer diagnoses issue, links Asset Tag, and orders parts
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ 4. COST & RESOLUTION │ Engineer logs parts/service costs and marks ticket as RESOLVED
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ 5. USER VERIFICATION │ Requester confirms resolution; Ticket moves to CLOSED (SLA calculated)
 └──────────────────────┘
```

---

### 3.3 Step-by-Step Ticket Submission Guide & Field Breakdown

When creating a new ticket (`/tickets` ➔ Click **`[+ New Ticket]`**):

| Field Name | Type | Mandatory? | Description & Instructions |
| :--- | :---: | :---: | :--- |
| **Requester Name** | Text | **Yes** | Full name of the staff experiencing the issue. |
| **Contact Phone** | Text | **Yes** | Phone / WhatsApp number for immediate IT dispatch. |
| **Branch** | Dropdown | **Yes** | Facility location (e.g. *BubblesO2 Rantau Factory*, *HQ Office*). |
| **Unit / Dept** | Dropdown | **Yes** | Specific operating unit (e.g. *Supervisor Production*, *Warehouse*). |
| **Asset Tag No.** | Selector | Optional | Asset tag of the affected equipment (e.g. `ICT-LPT-0012`). Linking this automatically pulls device serial and brand. |
| **Issue Title** | Text | **Yes** | Concise summary of the incident (e.g. *"Printer cannot connect to network"*). |
| **Detailed Description** | Textarea | **Yes** | Full description of the problem, error messages, and troubleshooting attempted. |
| **Priority Level** | Dropdown | **Yes** | `LOW` (General inquiry), `MEDIUM` (Single workstation affected), `HIGH` (Department halted), `CRITICAL` (Entire plant / production line down). |

---

### 3.4 Ticket Resolution, Spare Part Costing & SLA Tracking
When an IT engineer takes action on an open ticket:
1. **Change Status to `IN_PROGRESS`:** Signals to the user that an engineer is actively diagnosing the issue.
2. **Assign Technician:** Select the IT engineer responsible from the assignee dropdown.
3. **Log Maintenance Costs (`TicketCost`):** If replacement parts (RAM, SSD, printer roller, thermal head) were used, select the item from the **Cost Catalog** and enter the quantity. The system automatically tallies total cost.
4. **Resolution Notes:** Document the exact fix applied (e.g. *"Replaced faulty CAT6 cable and reconfigured IP address"*).
5. **Mark as `RESOLVED`:** Automatically records the completion timestamp and calculates the overall turnaround time (**Mean Time to Repair - MTTR**).

---

## 4.0 ASSET MANAGEMENT & QR CODE INFRASTRUCTURE

### 4.1 Overview & Purpose
* **Navigation Path:** Top Navigation Bar ➔ **`Assets`** (or direct URL: `/dashboard/assets`)
* **Access Level:** `SUPERADMIN` and users with the `ASSETS` module permission.

The Asset Management module maintains a single source of truth for all corporate hardware, tools, office machinery, and production equipment. It tracks equipment from initial procurement through assignment, maintenance, and ultimate retirement.

---

### 4.2 Asset Life-Cycle & QR Code Verification Flowchart

```
 ┌──────────────────────┐
 │ 1. ASSET REGISTER    │ IT registers device: Tag, Serial No, Specs, Supplier, Purchase Price
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ 2. QR STICKER PRINT  │ System generates unique QR code linking to public asset trace URL
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ 3. PHYSICAL TAGGING  │ Waterproof, tear-resistant QR sticker affixed to physical chassis
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ 4. ASSIGNMENT / CUST │ Check out asset to employee or department; records digital signature
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ 5. MOBILE AUDIT SCAN │ Technicians scan QR on-site with phone to view history or log repairs
 └──────────────────────┘
```

---

### 4.3 Asset Registration Form Field Details (`/dashboard/assets/new`)

| Field Name | Data Type | Requirement | Guidelines & Input Format |
| :--- | :---: | :---: | :--- |
| **Asset Tag** | String | **Mandatory & Unique** | Standardized corporate asset identifier (e.g. `ICT-LPT-0045`, `PRN-HP-0012`). Must be unique across all facilities. |
| **Asset Name** | String | **Mandatory** | Formal equipment name (e.g. *"Lenovo ThinkPad E14 Gen 4"*). |
| **Category / Type** | Enum | **Mandatory** | `ICT_EQUIPMENT`, `OFFICE_EQUIPMENT`, `MACHINE`, `ELECTRICAL_EQUIPMENT`, `TOOLS`, `SAFETY_EQUIPMENT`, `VEHICLE`, `OTHER`. |
| **Brand & Model** | String | Optional | Manufacturer and model code (e.g. *HP OfficeJet Pro 9130 Series*). |
| **Serial Number** | String | **Recommended** | Hardware manufacturer serial number (vital for warranty claims). |
| **Device ID / Hostname**| String | Optional | Network computer hostname or MAC address (e.g. `BO2-IT-NB04`). |
| **Purchase Date & Price**| Date / Number | Optional | Purchase date and initial acquisition cost in MYR. |
| **Department & Location**| Dropdown | **Mandatory** | Assigned department and physical room/block location. |
| **Initial Status** | Enum | **Mandatory** | `AVAILABLE` (Ready for deployment), `ASSIGNED` (In use), `MAINTENANCE` (In repair), `RETIRED` (Decommissioned). |

---

### 4.4 QR Code Generator & Mobile Scanning Client
1. **Generating Stickers (`/dashboard/assets/qr`):**
   - IT can filter assets by department or category and click **`[Generate QR Stickers]`**.
   - The system formats a high-density, print-ready sticker grid featuring the BubblesO2 logo, Asset Tag, Serial Number, and a scannable 2D QR matrix.
2. **On-Site Audits via Mobile Scanner (`/dashboard/assets/audit`):**
   - Technicians can open the web scanner on any smartphone or tablet.
   - Scanning the physical asset tag instantly pulls up the asset's real-time status, assigned user, maintenance history, and warranty status.
   - Technicians can instantly click **"Log Maintenance"** or **"Report Defect"** without searching through desktop spreadsheets.

---

## 5.0 EVENT CALENDAR & OPERATIONAL SCHEDULER

### 5.1 Overview & Architecture
* **Navigation Path:** Top Navigation Bar ➔ **`Calendar`** (or direct URL: `/calendar`)
* **Access Level:** Read-only for general staff; Event creation and scheduling reserved for `SUPERADMIN` and IT leads.

The Event Calendar coordinates scheduled maintenance, server upgrade windows, vendor visits, and IT team deployment schedules. It features native, two-way integration with the **Google Calendar API**.

---

### 5.2 Event Scheduling Workflow & Field Tutorial

```
 ┌──────────────────────┐
 │ 1. CLICK TIME SLOT   │ Click any day or hourly time slot on the interactive calendar grid
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ 2. ENTER EVENT INFO  │ Title, Start/End time, Priority tag (Work, Critical, Meeting, Holiday)
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ 3. ASSIGN LEAD & TEAM│ Assign primary IT Engineer and select cross-departmental attendees
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ 4. SYNC & BROADCAST  │ System saves to PostgreSQL, pushes to Google Calendar, & emails ICS
 └──────────────────────┘
```

| Field Name | Type | Description & Practical Rules |
| :--- | :---: | :--- |
| **Event Title** | Text | Concise summary of the task (e.g. *"Quarterly Server Patching Window"*). |
| **Start & End Time** | DateTime | Specific date and hour block. Uses Malaysia Time (`UTC+8`) timezone. |
| **Category / Tag** | Dropdown | `MAINTENANCE`, `PROJECT`, `MEETING`, `TRAINING`, `HOLIDAY`, `CRITICAL`. |
| **Primary Assignee** | Dropdown | The designated IT engineer in charge of executing the task. |
| **Attendee List** | Multi-Select | Select all participating team members. Attendees receive automatic calendar invite files (`.ics`) via email. |
| **Google Calendar Sync**| Toggle | When enabled, automatically pushes event details to the official corporate Google Workspace calendar (`primary` or configured Calendar ID). |

---

## 6.0 USER MANAGEMENT & ROLE-BASED ACCESS CONTROL (RBAC)

### 6.1 Overview & Purpose
* **Navigation Path:** Top Navigation Bar ➔ **`Users`** (or direct URL: `/users`)
* **Access Level:** Strictly restricted to `SUPERADMIN`.

Security and data confidentiality in the BubblesO2 AIO platform are governed by a strict two-tier access architecture: **System Role Hierarchy** and **Granular Module Permissions**.

---

### 6.2 Role Hierarchy Matrix

| Role Code | Description | Permitted Capabilities & System Visibility |
| :--- | :--- | :--- |
| **`SUPERADMIN`** | Full System Administrator | Complete read/write access across all modules, user administration, organization structure, and system configuration. |
| **`ADMIN`** | Departmental Administrator | Full managerial rights over assigned department forms, asset allocations, and ticket triaging. |
| **`DIRECTOR`** | Executive Management | Company-wide read-only visibility over executive analytics, production summaries, and financial reports. |
| **`HOD`** | Head of Department | Approval authority for departmental leave, equipment sign-offs, and shift handovers. |
| **`LEADER`** | Shift / Line Supervisor | Authority to verify daily production reports, conduct shift handovers, and apply digital approval signatures. |
| **`STAFF`** | Operational Staff | Standard operational entry: filling assigned shift forms, submitting IT tickets, and viewing personal history. |
| **`DRIVER`** | Logistics & Distribution | Focused access for dispatch tracking, delivery order check-ins, and returnable pallet handovers. |

---

### 6.3 Granular Module Permissions Array
Beyond the base role, users are assigned specific functional modules in their profile. If a module tag is omitted, the corresponding navigation tab is completely hidden from the user's interface:
* **`TICKETS`**: Ability to view and submit IT service tickets.
* **`ASSETS`**: Access to asset registry, QR sticker generation, and equipment audits.
* **`FORMS`**: Access to factory production shift reports and SGMP maintenance forms.
* **`WAREHOUSE`**: Access to Distribution Orders (DO), Gate Pass management, and Pallet Transfers.
* **`SALES`**: Access to PO intake, commercial sales ordering, and customer directories.

---

### 6.4 Capturing Digital E-Signatures
To guarantee regulatory compliance (GMP, HACCP, ISO) and eliminate paper audit trails:
1. In the User Directory (`/users`), click the **`[Signature]`** icon next to any employee's name.
2. The user signs directly on the canvas using a touchscreen, tablet stylus, or mouse.
3. The signature is rendered to a clean base64 vector, stored securely in cloud storage, and timestamped in the database.
4. Once stored, this digital signature is automatically applied to approved production shift reports, asset checkout forms, and gate passes.

---

## 7.0 ORGANIZATIONAL TOPOLOGY & COST CATALOG

### 7.1 Overview & Architecture
* **Navigation Path:** Top Navigation Bar ➔ **`Organization`** (or direct URL: `/organization`)
* **Access Level:** Strictly restricted to `SUPERADMIN`.

The Organization module establishes the relational backbone of the enterprise. Every user, ticket, asset, and shift report is anchored to a specific physical branch and operational unit.

```
                  ┌──────────────────────────────────────────────┐
                  │                 BRANCH MASTER                │
                  │  e.g., Kilang Air Rantau, Sendayan, HQ Office│
                  └──────────────────────┬───────────────────────┘
                                         │
                  ┌──────────────────────┴───────────────────────┐
                  ▼                                              ▼
    ┌───────────────────────────┐                  ┌───────────────────────────┐
    │     OPERATIONAL UNITS     │                  │     DEPARTMENTS & ROOMS   │
    │  • Production Line 1      │                  │  • IT Department          │
    │  • Production Line 2      │                  │  • Maintenance & QC Lab   │
    │  • Warehouse & Logistics  │                  │  • Finance & Commercial   │
    └───────────────────────────┘                  └───────────────────────────┘
```

---

### 7.2 Setting Up Branches & Operating Units
1. **Branches:** Represents distinct geographical facilities. Each branch requires a **Branch Name** and optional **Location Address** (e.g. *Kompleks Al Ammar, Kg Kanchong, 71200 Rantau, Negeri Sembilan*).
2. **Operating Units:** Represents functional sections within a branch. When creating a Unit, select the parent Branch and enter the **Unit Name** (e.g. *Unit Pengeluaran Line 1 - 800ml*).
3. **Automated Cascading:** Deleting a branch or unit is safeguarded; the system prevents deletion if active tickets, assets, or users remain linked to that unit.

---

### 7.3 Departmental Ticket Cost Catalog
To track IT expenditures accurately across the business:
1. In `/organization`, navigate to the **Cost Catalog** section.
2. Click **`[Add Item]`** to register common IT replacement hardware and service fees:
   * Item Name: e.g. *Solid State Drive (SSD) 512GB NVMe*, *CAT6 Patch Cord 3M*, *Thermal Print Head Replacement*.
   * Default Unit Cost: Standard replacement price in MYR.
3. When IT engineers resolve support tickets, selecting an item from this catalog automatically bills the cost to the requester's department budget, providing management with accurate IT cost attribution.

---

## 8.0 SYSTEM SETTINGS, NOTICES & GLOBAL CONFIGURATION

### 8.1 Overview & Security
* **Navigation Path:** Top Navigation Bar ➔ **`Settings`** (or direct URL: `/settings`)
* **Access Level:** Profile preferences available to all users; System settings and notices restricted to `SUPERADMIN`.

The Settings module controls global system parameters, automated reminder engines, email notification gateways, and corporate broadcast announcements.

---

### 8.2 Corporate Broadcast Notices
1. Superadmins can broadcast company-wide operational announcements (e.g. *"Scheduled Server Maintenance this Saturday 10:00 PM"* or *"New Pallet Gate Pass SOP Effective Tomorrow"*).
2. Announcements appear prominently at the top of every staff member's dashboard upon login, ensuring critical operational updates are never missed.

---

### 8.3 Email Delivery Gateways & Environmental Configuration
The system supports dual email infrastructure:
* **Transactional Ticket & Reminder Alerts:** Dispatched via **Resend API** (`RESEND_API_KEY`) for rapid, high-deliverability notification delivery.
* **Corporate Calendar Invitations (.ics):** Dispatched via **SMTP Mailer** (`SMTP_EMAIL`, `SMTP_PASSWORD`) to ensure calendar attachments seamlessly integrate with Microsoft Outlook and Google Workspace.

---

## 9.0 IT SUPPORT INCIDENT RESPONSE & TROUBLESHOOTING MATRIX

| Symptom / Error Message | Likely Root Cause | Immediate IT Resolution Procedure |
| :--- | :--- | :--- |
| **"Access Denied: You do not have permission to view this module"** | User's role or `modules` array does not include the target module tag. | 1. Open `/users` as Superadmin.<br>2. Edit the user profile and check the required module permission checkbox (e.g. `ASSETS`, `TICKETS`).<br>3. Instruct user to re-login. |
| **"QR Code Scanner fails to open camera on mobile"** | Browser permissions blocked, or website accessed over unsecure HTTP. | 1. Ensure the site is accessed via secure HTTPS (`https://...`).<br>2. In mobile browser settings, enable camera permissions for the site. |
| **"Ticket email notifications not arriving"** | Resend API key missing or recipient email address is invalid. | 1. Verify `RESEND_API_KEY` in environment variables.<br>2. Check user's email spelling in the User Directory.<br>3. Verify corporate spam folder. |
| **"Asset already exists with tag [TAG_NO]"** | Asset Tag duplicate constraint violation. | Asset tags must be globally unique. Verify whether the asset was previously registered or retired. |
| **"Signature canvas does not save on mobile"** | Low network bandwidth or session timeout during submission. | 1. Refresh page and re-authenticate.<br>2. Ensure canvas is not completely blank before clicking Save. |

---

## 10.0 CONCLUSION & FORMAL SIGN-OFF

The **BubblesO2 All-In-One (AIO) System** delivers an enterprise-grade, integrated digital environment specifically tailored to the fast-paced operational realities of our manufacturing and corporate facilities. By mastering the seven core IT modules detailed in this manual, the Information Technology Department ensures high infrastructure uptime, strict data governance, seamless hardware traceability, and exceptional user support across all corporate branches.

```
Document Approved and Issued for Internal Corporate Use:

Prepared by:                                     Approved by:


________________________________________         ________________________________________
Muhammad Iskandar Zulkarnain Bin Zulkifli       Abdul Aziz Arifin
System Developer, IT Department                  Manager, Information Technology
BubblesO2 Sdn Bhd                                BubblesO2 Sdn Bhd
Date: September 2026                             Date: September 2026
```

---

*Copyrights reserved. The documentation is prepared solely for the use of management only. No part of it may be circulated or reproduced for distribution outside of the organization without prior consent of IT Department, BubblesO2.*
