# SAGE X3 V12 ENTERPRISE MANUFACTURING & QUALITY CONTROL (ERPMAN)
## TECHNICAL OPERATIONS MANUAL & STANDARD OPERATING PROCEDURE (SOP)
**Standard Operating Procedure (SOP) & Technical Reference Guide for Production Engineering, Work Orders, Shop Floor Tracking, Quality Control (QC/QA), Statistical Sampling, and Database Schema Architecture**

---

### DOCUMENT CONTROL & TECHNICAL GOVERNANCE METADATA
* **Document Title:** Sage X3 v12 Enterprise Manufacturing & Quality Control (ERPMAN) Technical Operations Manual
* **System Architect / Owner:** Muhammad Iskandar Zulkarnain Bin Zulkifli
* **Responsible Stakeholders:** Information Technology (IT), Production & Plant Operations, Quality Assurance (QA/QC), Warehouse Stores, Maintenance Engineering, Internal Audit
* **Publication Date:** September 2026 (Version 1.0 — Official Enterprise Release)
* **Document Classification:** STRICTLY CONFIDENTIAL / INTERNAL ORGANIZATIONAL USE ONLY
* **System Footprint:** Rantau Mineral Water Processing Plant (Line 1 & Line 2), Sendayan Central Logistics Hub & HQ

| Prepared By (System Developer): | Approved By (IT Manager): |
| :--- | :--- |
| **Muhammad Iskandar Zulkarnain Bin Zulkifli** | **Abdul Aziz Arifin** |
| System Developer, Information Technology Department | Manager, Information Technology Department |
| BubblesO2 Sdn Bhd • Date: 11 September 2026 | BubblesO2 Sdn Bhd • Date: 11 September 2026 |

| Version | Effective Date | Summary of Revisions | Authorizing Officer |
| :---: | :---: | :--- | :---: |
| **v1.0 Official** | 11 September 2026 | Complete technical documentation of ERPMAN module, Quality Control (QC/QA) lifecycle, Database.sql schema, and shop floor execution workflows. | Muhammad Iskandar (IT) |

---

## 1.0 INTRODUCTION, ENTERPRISE ARCHITECTURE & ERPMAN SCOPE

The **Sage X3 v12 Manufacturing & Quality Control (`ERPMAN`)** module forms the industrial production core and compliance backbone of the **BubblesO2 Enterprise Resource Planning (ERPFULL)** ecosystem. It transforms raw procurement materials managed in `ERPDIS` into premium natural mineral water finished goods, while enforcing rigorous Quality Control (QC/QA) standards required by the Ministry of Health Malaysia (KKM), HACCP, GMP, and Halal certification bodies.

### 1.1 Manual Shop Floor Practices vs Automated Sage X3 Manufacturing Engine

| Operational Dimension | Legacy Manual Manufacturing Limitations | Sage X3 Automated Manufacturing Engine |
| :--- | :--- | :--- |
| **Production Planning** | Manual whiteboards and paper job sheets. No visibility into raw material stock reservations. | **Work Order Scheduling (`GESMFG`):** Automated requirement planning, production scheduling, and component stock allocation. |
| **Material Consumption** | Post-shift physical counting. High rate of unaccounted material wastage and inaccurate costs. | **Real-Time Backflushing (`GESMTK`):** Direct deduction of preforms, caps, labels, and boxes based on actual finished goods output. |
| **Quality Control (QC)** | Disconnected paper test logs. Risk of uninspected or contaminated bottled water released to customers. | **Integrated Quality Inspection (`GESQCR` / `GESSMP`):** Automatic system quarantine (**Status Q**), ISO sampling, and electronic COA release (**Status A**). |
| **WIP & Cost Variance** | Cost variances discovered months later during annual audits. Inability to isolate line loss. | **Automated WIP Settlement (`CSTMFG`):** Continuous tracking of material usage variances, labor run hours, and machine overheads. |

### 1.2 Comprehensive Fast Navigation Map: Top 12 Manufacturing & QC Fast Codes

| Fast Code | Module Domain | Menu Navigation Path | Core Business Purpose |
| :---: | :--- | :--- | :--- |
| **`GESBOD`** | Engineering | *Manufacturing > Master data > Production BOMs* | Bill of Materials recipe management, component ratios, and scrap factors. |
| **`GESROU`** | Engineering | *Manufacturing > Master data > Routings* | Operational routing sequences, machine cycle rates, and quality sheet links. |
| **`GESMWS`** | Engineering | *Manufacturing > Master data > Work centers* | Configuration of plant machines (Blow, Fill, Label, Pack, Palletize) and capacities. |
| **`GESMFG`** | Work Orders | *Manufacturing > Planning > Work orders* | Work order generation, target scheduling, component reservation, and shop traveler print. |
| **`GESMTK`** | Shop Floor | *Manufacturing > Execution > Production tracking* | Recording completed good boxes, scrap rejects, machine hours, and material backflushing. |
| **`GESQCR`** | Quality Control | *Stock > Quality control > Quality control* | Technical inspection sheets, recording chemical/microbiological test readings. |
| **`GESQST`** | Quality Control | *Common data > Quality > Questions* | Definition of inspection questions, numeric thresholds (pH, TDS, torque), and tolerances. |
| **`GESSMP`** | Quality Control | *Stock > Quality control > Sampling* | Statistical sampling plans (ISO 2859 / AQL) for batch inspection. |
| **`GESSCS`** | Quality Control | *Stock > Internal movements > Stock change* | Formal quality status conversion (**Q &rarr; A** for accepted, **Q &rarr; R** for rejected). |
| **`CONSSST`**| Inventory | *Stock > Inquiries > Stock by site* | Multi-status inventory inquiry monitoring stock balances in Status A, Q, and R. |
| **`CSTMFG`** | Costing | *Costing > Production costs > Work order calculation*| Roll-up of actual vs standard production costs and WIP variance calculation. |
| **`FUNMCLO`**| Work Orders | *Manufacturing > Utilities > Close work orders* | Formal administrative and financial closure of completed production orders. |

---

## 2.0 ENGINEERING MASTER DATA: PRODUCTION BOMS & ROUTINGS

Production accuracy in Sage X3 relies on engineering master data: **Bill of Materials (`BOM`)** and **Manufacturing Routings (`ROUTING`)**.

### 2.1 Bill of Materials (BOM) Hierarchy & Component Scrap Allowances

The master Bill of Materials specifies the precise components required to produce a single carton of finished goods:

* **Finished Product:** `FG-425X24` — BubblesO2 Natural Mineral Water 425ml (1 Carton = 24 Bottles)
* **BOM Alternative:** `1` (Standard Commercial Production)

| Component Code | Component Description | Required Qty per Carton | Unit (UOM) | Scrap Factor (`SCA_0`) | Operational Staging Point |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`RM-PREF-425`** | PET Bottle Preform 425ml | 24.00 | PCS | 1.00% | Op 10: Rotary Blow Molding Machine |
| **`RM-CAP-BLUE`** | HDPE Bottle Screw Cap 28mm | 24.00 | PCS | 0.50% | Op 20: Cleanroom Capping Station |
| **`RM-LBL-425`** | BOPP Printed Shrink Label 425ml | 24.00 | PCS | 1.50% | Op 30: Steam Tunnel Labeling Machine |
| **`RM-BOX-425`** | Corrugated Outer Carton Box 425ml x 24 | 1.00 | PCS | 0.50% | Op 40: Automated Case Packer |
| **`RAW-WATER`** | Natural Mineral Borehole Water | 10.20 | LTR | 2.00% | Op 20: Class 100 Cleanroom Filling Monoblock |

### 2.2 Manufacturing Routings & Machine Work Centers (`GESROU` / `GESMWS`)

The manufacturing routing establishes the sequence of operational steps and machine standards:

1. **Operation 10 (`WST-BLOW01` - Blow Molding):** High-pressure rotary blow molding heating preforms to 110°C and forming 425ml bottles at 12,000 BPH.
2. **Operation 20 (`WST-FILL01` - Filling & Capping):** Class 100 Cleanroom monoblock microfiltration (0.2 micron), ozone-controlled filling, and cap torque sealing. **Linked to QC Technical Sheet `QC-BOTT` via `TECCRD_0`**.
3. **Operation 30 (`WST-LABL01` - Optical Labeling):** High-speed roll-fed hot melt BOPP sleeve labeling with optical code verification.
4. **Operation 40 (`WST-PACK01` - Case Packing):** Automated robotic arm grouping 24 bottles into corrugated cartons and hot-melt gluing.
5. **Operation 50 (`WST-PALL01` - Palletizing & Wrapping):** Automated robotic palletizer stacking 72 cartons per pallet with stretch wrap sealing.

---

## 3.0 WORK ORDER GENERATION, SCHEDULING & COMPONENT ALLOCATION (`GESMFG`)

Work Orders govern all shop floor production activities, linking sales demand or stock replenishment targets to machine scheduling.

### 3.1 Work Order Execution Lifecycle Flowchart

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│      STEP 1      │     │      STEP 2      │     │      STEP 3      │     │      STEP 4      │
│ Create Work Order│ ──► │Component Allocat.│ ──► │Availab. Evaluat. │ ──► │Release & Traveler│
│ Open GESMFG and  │     │System verifies RM│     │Check ALLOCATED   │     │Print Shop Floor  │
│ enter target qty.│     │stock in warehouse│     │vs SHORTAGE state │     │Work Order Ticket.│
└──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
```

### 3.2 Step-by-Step Configuration & Mandatory Screen Fields (`GESMFG`)

1. **Manufacturing Site (`MFGFCY_0`):** Select `BOMSB` (BubblesO2 Manufacturing Sdn Bhd).
2. **Production Type:** Select *Standard* for finished goods inventory replenishment.
3. **Released Product (`ITMREF_0`):** Enter finished product code (e.g. `FG-425X24`). The system automatically binds BOM Alternative 1 and Routing Alternative 1.
4. **Released Quantity (`EXTQTY_0`):** Enter target production volume in cartons (e.g. `2,000` CTN = 48,000 bottles).
5. **Scheduling Dates (`STRDAT_0` / `ENDDAT_0`):** Define shift start and completion windows.
6. **Component Stock Allocation:** Click the **Allocation** button. The engine evaluates component inventory in table `MFGMAT`:
   - **Detailed Allocation:** Physical warehouse lots are reserved exclusively for this Work Order.
   - **Shortage (`SHTQTY_0 > 0`):** If preforms, caps, or cartons are insufficient, the system flags a shortage, alerting procurement to expedite GRNs in `ERPDIS`.
7. **Release Order:** Click **Create**, then change order status to *Firm*. Print the official **Work Order Traveler Ticket** for the floor supervisors.

---

## 4.0 SHOP FLOOR EXECUTION & PRODUCTION TRACKING (`GESMTK`)

Actual shop floor output, scrap quantities, machine runtime, and material backflushing are recorded via **`GESMTK`**.

### 4.1 Production Tracking Workflow Flowchart

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│      STEP 1      │     │      STEP 2      │     │      STEP 3      │     │      STEP 4      │
│ Select Work Order│ ──► │Record Good/Scrap │ ──► │ Auto Backflush   │ ──► │Receipt to Stock Q│
│ Select WO from   │     │Enter good output │     │System consumes RM│     │Finished goods enter│
│ Left Drawer list.│     │and reject counts.│     │materials from BOM│     │quarantine status.│
└──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
```

### 4.2 Production Tracking Operational Protocol (`GESMTK`)

* **Work Order Selection:** Open `GESMTK`, select the active Work Order from the Left Selection Drawer.
* **Tracking Type:** Choose *Partial* for interim shift tracking, or *Complete* for final order completion.
* **Produced Output (`CPLQTY_0`):** Enter physical good cartons packed onto pallets (e.g. `1,960` CTN).
* **Scrap / Rejects (`REJCPLQTY_0`):** Enter rejected cartons/bottles (e.g. `40` CTN equivalent) with failure reason code (`RENSCA_0`):
  - `SCR-BLOW`: Preform blow deformation / wall thickness defect.
  - `SCR-SEAL`: Leaking cap / induction seal failure.
  - `SCR-LBL`: Torn or misaligned BOPP label.
  - `SCR-BOX`: Crushed corrugated carton.
* **Batch / Lot Numbering Convention:** The system generates a lot number following the BubblesO2 standard: `B{YYMMDD}-{Shift}` (e.g. `B260911-01`).
* **Automated Material Backflushing (`MFGMATTRK`):** The system calculates exact component usage based on produced quantity plus scrap factor, automatically deducting preforms, caps, labels, and boxes from warehouse stock.
* **Mandatory Initial Status:** All finished goods output is received into warehouse stock **STRICTLY UNDER STATUS Q (QUARANTINE)**.

---

## 5.0 QUALITY CONTROL (QC/QA) ARCHITECTURE & STOCK QUALITY ENGINE

The Quality Control framework protects consumer safety and brand integrity by preventing sub-standard bottled water from reaching retail distribution.

### 5.1 Three-Tier Stock Quality Status Framework

Sage X3 enforces stock quality segregation across three discrete states:

1. **STATUS Q (QUARANTINE) — Initial Default State:**
   - Applied automatically to 100% of finished goods upon production tracking (`GESMTK`).
   - **System Lockdown:** Inventory in Status Q is strictly invisible and blocked from Sales Order allocation (`GESSOH`), Delivery Orders (`GESSDH`), and warehouse transfers.
   - Physical pallets are tagged with yellow Quarantine placards in the staging warehouse.
2. **STATUS A (ACCEPTED) — Commercial Release:**
   - Granted only after physical, chemical, and microbiological laboratory cultures meet Malaysian Food Act 1983 standards.
   - Released inventory becomes immediately available for commercial sales order reservation and customer dispatch.
3. **STATUS R (REJECTED) — Non-Conforming Scrap:**
   - Assigned to lots failing critical food safety limits (e.g. pathogen presence or extreme pH).
   - System permanently locks stock. Pallets are physically moved to the Red Reject Zone for decanting, bottle recycling, and formal destruction.

### 5.2 Regulatory & Quality Certifications Compliance

* **Ministry of Health Malaysia (KKM):** Natural Mineral Water Source & Processing License under Food Regulations 1985, Regulation 360B.
* **HACCP & GMP (MS 1480 / MS 1514):** Hazard Analysis Critical Control Point monitoring at borehole extraction, 0.2-micron filtration, and cleanroom capping.
* **Halal Certification (JAKIM MS 1500:2019):** Ensuring food-grade materials and hygienic bottling procedures.
* **ISO 22000 & SIRIM Eco-Label:** Comprehensive Food Safety Management System.

---

## 6.0 QC TECHNICAL INSPECTION SHEETS & TEST SPECIFICATIONS (`GESQCR` / `GESQST`)

Quality inspection parameters are formally standardized in Technical Control Sheets (`QLYCRD`) and Question Tables (`QLYCRDQST`).

### 6.1 BubblesO2 Technical Test Parameter Specifications

Every production batch of natural mineral water must undergo comprehensive testing recorded in function **`GESQCR`**:

| Parameter Category | Test Parameter Code | Specification / Target Range | Test Methodology | Regulatory Reference |
| :--- | :--- | :---: | :--- | :--- |
| **Physical** | `TEST-PH` | **7.20 – 7.80 pH** | Calibrated Digital pH Probe | Food Act 1985 (Reg 360B) |
| **Physical** | `TEST-TDS` | **120 – 180 ppm (mg/L)** | Conductivity Meter | Mineral Water Standards |
| **Physical** | `TEST-TURB` | **< 0.50 NTU** | Digital Turbidimeter | Crystal Clear Clarity |
| **Physical** | `TEST-VOL` | **425.0 ml &plusmn; 5.0 ml** | Gravimetric / Density Scale | Weights & Measures Act |
| **Mechanical** | `TEST-TORQ` | **1.50 – 2.20 Nm** | Digital Torque Tester | Capping Integrity Standard |
| **Mechanical** | `TEST-DROP` | **1.2 Meter Drop (No Rupture)**| Vertical Impact Drop Rig | Transport Durability |
| **Microbiological** | `TEST-COLI` | **0 CFU / 100 ml (Zero)** | Membrane Filtration (37°C, 24h)| KKM Mandatory Limit |
| **Microbiological** | `TEST-ECOL` | **0 CFU / 100 ml (Zero)** | Membrane Filtration (44.5°C, 24h)| KKM Mandatory Limit |
| **Microbiological** | `TEST-PSEU` | **0 CFU / 250 ml (Zero)** | Selective Agar (37°C, 48h) | Bottled Water Pathogen Rule |
| **Microbiological** | `TEST-TVPC` | **< 100 CFU / ml** | Nutrient Agar Pour Plate (37°C) | Total Viable Bacterial Count |

### 6.2 Recording Test Results in `QLYCRDASW`

When laboratory technicians complete testing in `GESQCR`:
* **Numeric Measurements (`NUMASW_0`):** Exact numerical values are logged (e.g. `pH = 7.42`, `TDS = 145 ppm`, `Torque = 1.85 Nm`).
* **Microbiological Confirmations (`ALPASW_0`):** Recorded as *NOT DETECTED / ZERO COLONY*.
* **Automated Acceptance Evaluation (`FLGASW_0`):** If all parameters fall within configured thresholds, Sage X3 sets `FLGASW_0 = 1` (Pass). Any parameter breach triggers `FLGASW_0 = 2` (Non-conformance).

---

## 7.0 STATISTICAL SAMPLING PLANS & LABORATORY TESTING (`GESSMP` / `STOQLYSMP`)

To maintain statistical confidence without destroying excessive inventory, sampling follows **ISO 2859-1 (Sampling Procedures for Inspection by Attributes)**.

### 7.1 Integrated Quality Inspection, Sampling & Lab Release Flowchart

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│      STEP 1      │     │      STEP 2      │     │      STEP 3      │     │      STEP 4      │
│Production Receipt│ ──► │ Generate Sample  │ ──► │ 48-Hour Incubat. │ ──► │ Quality Decision │
│Goods received in │     │GESSMP calculates │     │Physical sample in│     │Evaluate results &│
│Status Q via MTK. │     │ISO sample size.  │     │microbiology lab. │     │approve release.  │
└──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
```

### 7.2 ISO 2859 Sampling Plan Table (`STOQLYSMP`)

| Production Batch Size (Cartons) | Inspection Level | Sample Size (Bottles Drawn) | Acceptance Limit (Ac) | Rejection Limit (Re) |
| :---: | :---: | :---: | :---: | :---: |
| **501 – 1,200 Cartons** | General Level II | **80 Bottles** | **0 Defect** | **1 Defect** |
| **1,201 – 3,200 Cartons** | General Level II | **125 Bottles** | **0 Defect** | **1 Defect** |
| **3,201 – 10,000 Cartons** | General Level II | **200 Bottles** | **0 Defect** | **1 Defect** |

> [!IMPORTANT]
> **Strict Zero-Defect Rule (Ac = 0, Re = 1):** For microbiological parameters (*E. coli*, Coliforms, *Pseudomonas*), the acceptable quality limit is strictly zero. The detection of a single colony in any drawn sample mandates immediate lot rejection.

### 7.3 Mandatory 48-Hour Incubation Protocol

Because microbiological testing requires culture growth (24 hours for Coliforms, 48 hours for *Pseudomonas aeruginosa*), no natural mineral water lot may be converted to Status A earlier than **48 hours from bottling completion**.

---

## 8.0 QUALITY DISPOSITION, NON-CONFORMANCE & STOCK RELEASE (`GESSCS`)

Once laboratory results are finalized, the Quality Assurance Executive executes the formal stock status change.

### 8.1 Quality Disposition Decision Matrix

| Inspection Outcome | System Flag (`FLGASW`) | Enforced Quality Action | Warehouse System Movement |
| :--- | :---: | :--- | :--- |
| **Full Compliance** | `1` (All Passed) | **Approve for Commercial Release** | Execute `GESSCS`: Change lot from **Status Q to Status A**. Generate Certificate of Analysis. |
| **Minor Non-Conformance** | `2` (Borderline) | **Quarantine Alert & Retest** | Retain in **Status Q**. Trigger secondary sampling. Issue Non-Conformance Report (`QLYCRDNQA`). |
| **Critical Failure** | `2` (Micro Breach) | **Immediate Lot Rejection** | Execute `GESSCS`: Change lot from **Status Q to Status R**. Move to scrap quarantine for destruction. |

### 8.2 Executing Stock Status Conversion (`GESSCS`)

1. Open function **`GESSCS`** (*Stock > Internal movements > Stock change*).
2. Select Warehouse Site (e.g. `BOMSB`) and Product Code (`FG-425X24`).
3. Select the Quarantine Lot number (`B260911-01`) in the Left Selection Drawer.
4. Set **New Status = `A`** (or `R` if rejected).
5. Enter Reference / COA Number (e.g. `COA-2609-0425`) and Authorized QA Officer initials.
6. Click **Save**. The stock balance is instantly transferred to Active Commercial Inventory in `ERPDIS`.

### 8.3 Digital Certificate of Analysis (COA) Issuance

Major retail and petroleum partners (Lotus's, TF Value-Mart, Shell, Petronas) mandate a lot-specific Certificate of Analysis accompanying delivery consignments. Sage X3 compiles the COA document directly from recorded values in `QLYCRDASW`.

---

## 9.0 MANUFACTURING COSTING, WIP VALUATION & WORK ORDER CLOSING

Manufacturing accounting reconciles shop floor consumption against financial inventory valuations, transferring Work-in-Progress (WIP) into finished goods inventory assets.

### 9.1 Production Costing & WIP Settlement Flowchart

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│      STEP 1      │     │      STEP 2      │     │      STEP 3      │     │      STEP 4      │
│ Confirm Outputs  │ ──► │ Calculate Costs  │ ──► │ Variance Analysis│ ──► │ Close Work Order │
│ Verify all MTK   │     │Run CSTMFG cost   │     │Analyze Material, │     │Execute FUNMCLO & │
│ lines recorded.  │     │rollup calculation│     │Labor & Mach var. │     │settle WIP to GL. │
└──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
```

### 9.2 Four-Tier Production Cost Structure (`MFGCOST`)

Production cost per carton comprises four distinct elements:
1. **Raw Material Cost (`MATTOT_0`):** Preforms, caps, labels, cartons, and water extraction costs at moving average cost.
2. **Machine Operating Cost (`MACTOT_0`):** Electricity, pneumatic air, steam, and machine maintenance depreciation absorbed by machine run hours.
3. **Direct Labor Cost (`LABTOT_0`):** Operator wages and technician hourly rates applied to setup and run times.
4. **Plant Overhead (`SCOTOT_0`):** Factory management, cleanroom HVAC filtration, and quality testing lab overhead.

### 9.3 Variance Analysis & Administrative Closure (`FUNMCLO`)

* **Material Usage Variance:** Difference between standard BOM quantities and actual consumed components (reflects line blow loss).
* **Efficiency Variance:** Difference between standard routing machine cycle hours and actual recorded hours.
* **Order Closure (`FUNMCLO`):** Changes Work Order status from *In Progress* to *Closed*. Posts the auto-journal `WOO` clearing Account 2100 (WIP) into Account 2200 (Finished Goods) and booking variances to Account 7110.

---

## 10.0 AUTOMATIC ACCOUNTING ENGINE & DATABASE SCHEMA LINKAGE

Shop floor events automatically trigger financial accounting entries via the Automatic Accounting Engine (`GESGAU`).

### 10.1 Operational Event to Auto-Journal Mapping

| Operational Production Event | Sage X3 Function | Auto-Journal (GAU) | Financial Accounting Debit / Credit Impact |
| :--- | :--- | :---: | :--- |
| **Material Consumption** | `GESMTK` | `WOO` (Work Order) | **Debit:** Work-in-Progress (Account 2100)<br>**Credit:** Raw Materials Inventory (Account 2000) |
| **Finished Goods Receipt** | `GESMTK` | `WOO` (Work Order) | **Debit:** Finished Goods Inventory (Account 2200)<br>**Credit:** Work-in-Progress (Account 2100) |
| **Work Center Machine/Labor**| `GESMTK` | `WOO` (Work Order) | **Debit:** Work-in-Progress (Account 2100)<br>**Credit:** Factory Overhead / Labor Applied (Account 7100) |
| **Quality Rejection (Scrap)**| `GESSCS` | `STK` (Stock Transfer) | **Debit:** Production Scrap Expense (Account 7120)<br>**Credit:** Finished Goods Inventory (Account 2200) |

### 10.2 Deep Database Schema Architecture from `Database.sql`

Extracted directly from `Database.sql` (8,229 tables, schema `[BASE]`), the manufacturing and quality database architecture includes:

| SQL Table Name | Primary Key & Key Fields | Table Role & Business Application in Sage X3 |
| :--- | :--- | :--- |
| **`BOM` / `BOMD`** | `ITMREF_0, BOMALT_0, BOMSEQ_0` | Master Bill of Materials header and component item requirements, scrap factors (`SCA_0`), and operation links. |
| **`ROUTING` / `ROUOPE`** | `ITMREF_0, ROUALT_0, OPENUM_0` | Manufacturing routings, work centers (`WST_0`), machine run times (`OPETIM_0`), and Quality Sheet links (`TECCRD_0`). |
| **`MFGHEAD`** | `MFGNUM_0, MFGFCY_0, MFGSTA_0` | Master Work Order header storing target quantity (`EXTQTY_0`), completed quantity (`CPLQTY_0`), and schedule dates. |
| **`MFGMAT`** | `MFGNUM_0, MFGLIN_0, ITMREF_0` | Work Order allocated components, tracking required, allocated, and shortage quantities (`SHTQTY_0`). |
| **`MFGOPE`** | `MFGNUM_0, OPENUM_0, WST_0` | Work Order operation tracking recording planned vs completed machine hours (`CPLWST_0`) and labor hours. |
| **`QLYCRD` / `QLYCRDQST`** | `QLYCRD_0, QSTNUM_0, NUMLIN_0` | Technical Quality Control Sheets and parameter questions (pH, TDS, turbidity, torque, microbiological limits). |
| **`QLYCRDASW`** | `QLYCTLDEM_0, QLYCRD_0, QSTNUM_0` | Quality test recording storing numeric results (`NUMASW_0`), textual observations, and pass/fail flags (`FLGASW_0`). |
| **`STOQLYSMP`** | `VCRNUM_0, ITMREF_0, LOT_0` | Statistical sampling records tracking drawn sample size (`QTYSMP_0`), accepted units, and sampling status (`STASMP_0`). |
| **`MFGCOST`** | `VCRNUM_0, ITMREF_0, UID_0` | Work Order production cost rollup tracking material (`MATTOT_0`), machine (`MACTOT_0`), and labor totals. |

---

## 11.0 TROUBLESHOOTING MATRIX & AUTHORITATIVE ENTERPRISE GLOSSARY

### 11.1 Troubleshooting Matrix for Common Manufacturing & QC Exceptions

| Exception Message / Symptom | Root System Cause | Standard Corrective Action |
| :--- | :--- | :--- |
| **"Component shortage / Material not allocated"** | Warehouse stock of preforms, caps, labels, or boxes is below required WO volume. | Open `CONSSST` to identify short components. Request Stores to expedite GRN receipt in `ERPDIS` (`GESPTH`). |
| **"Stock lot locked in Status Q - Cannot deliver"** | Finished bottled water lot has not been released from QC quarantine. | Check lab results in `GESQCR`. If all micro/chemical tests pass, execute status change to **A** in `GESSCS`. |
| **"Parameter value outside specification limits"** | Recorded test reading (e.g. pH = 8.10 or cap torque = 1.1 Nm) breaches quality thresholds. | System flags non-conformance (`FLGASW_0 = 2`). Initiate secondary sampling. If persistent, move lot to Status R. |
| **"Work Order cannot be closed - Open operations exist"** | Unrecorded machine operations or unfinished tracking tickets in `GESMTK`. | Review operation progress in `GESMTK`. Complete remaining operation entries or adjust remaining target quantity to zero. |
| **"High material variance detected during costing"** | Excessive line breakage of preforms or damaged cartons during packaging. | Review scrap logs in `GESMTK`. If scrap is chronic, submit engineering request to update BOM scrap factor (`SCA_0`). |

### 11.2 Authoritative Manufacturing & Quality Control Glossary

* **Bill of Materials (BOM):** The authoritative recipe defining the exact quantities of raw materials needed for one unit of finished goods.
* **Manufacturing Routing:** The sequential path of work centers and machine operations through which raw materials are transformed.
* **Work Order (WO):** Formal enterprise authorization detailing product code, target quantity, component reservations, and schedule.
* **Component Backflushing:** Automatic deduction of raw material stock upon recording finished good output based on BOM ratios.
* **Status Q (Quarantine):** Initial mandatory quarantine state locking finished goods from sales allocation pending lab clearance.
* **Status A (Accepted):** Verified commercial release status confirming compliance with food safety and mineral water standards.
* **Status R (Rejected):** Permanently locked non-conforming status for scrap, decanting, bottle recycling, or disposal.
* **AQL / ISO 2859 Sampling:** Statistical attribute sampling defining the exact number of sample units drawn per lot size.
* **Certificate of Analysis (COA):** Formal quality compliance document certifying physical, chemical, and microbiological test results.
* **Work-in-Progress (WIP):** Asset account (Account 2100) aggregating costs of materials, labor, and machine overhead during production.
