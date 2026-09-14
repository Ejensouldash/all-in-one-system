# SAGE X3 V12 ENTERPRISE FINANCIALS (ERPFIN)
## TECHNICAL OPERATIONS MANUAL & STANDARD OPERATING PROCEDURE (SOP)
**Standard Operating Procedure (SOP) & Technical Reference Guide for Financial Management, Accounting Controls & Database Schema Architecture**

---

### DOCUMENT METADATA & CORPORATE VERIFICATION
* **Document Title:** Sage X3 v12 Enterprise Financials (ERPFIN) Technical Operations Manual & Standard Operating Procedure
* **Module Owner / System Architect:** Muhammad Iskandar Zulkarnain Bin Zulkifli
* **Responsible Stakeholders:** Information Technology (IT), Finance & Accounts Department, Internal Audit, Commercial Sales & Supply Chain
* **Publication Date:** September 2026
* **Document Version:** 1.0 (Official Enterprise Release — Rantau Mineral Water Plant, Sendayan Logistics Hub & HQ)
* **Classification:** Strictly Confidential / Internal Organizational Use Only

| Prepared By: | Approved By: |
| :--- | :--- |
| **Muhammad Iskandar Zulkarnain Bin Zulkifli** | **Abdul Aziz Arifin** |
| System Developer, | Manager, |
| Information Technology Department, | Information Technology Department, |
| BubblesO2 Sdn Bhd | BubblesO2 Sdn Bhd |

---

## 1.0 INTRODUCTION, ENTERPRISE ARCHITECTURE & ERPFIN SCOPE

The **Sage X3 v12 Financials (`ERPFIN`)** module forms the financial nerve center and compliance backbone of the **BubblesO2 Enterprise Resource Planning (ERPFULL)** ecosystem. It provides real-time financial tracking, multi-dimensional analytical cost accounting, automated transaction auditing, accounts payable/receivable subledger controls, cash flow management, and statutory tax reporting.

In an integrated manufacturing enterprise like BubblesO2, operational transactions in Procurement (`ERPDIS`), Manufacturing (`ERPMAN`), and Logistics directly trigger real-time financial accounting entries:
1. **Purchase Receipt (GRN):** Updates physical raw material inventory and automatically posts goods received not invoiced (GRNI accrual).
2. **Production Tracking:** Consumes raw materials (preforms, caps, labels, cartons), applies labor/machine overhead, and debits finished goods inventory.
3. **Delivery Order (DO) Validation:** Issues stock out of warehouse ledegrs and creates accrued cost of goods sold (COGS).
4. **Sales & Purchase Invoicing:** Generates commercial accounts receivable and payable entries, applies SST taxation, and records customer/vendor open items for payment reconciliation.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                      BUBBLESO2 ENTERPRISE LIFECYCLE & FINANCIAL FLOWS (ERPFULL)                 │
├──────────────────┬──────────────────┬──────────────────┬───────────────────┬────────────────────┤
│ 1. PURCHASING    │ 2. PRODUCTION    │ 3. WAREHOUSING   │ 4. DISTRIBUTION   │ 5. FINANCIALS      │
│ (ERPDIS)         │ (ERPMAN)         │ (ERPDIS)         │ (ERPDIS)          │ (ERPFIN)           │
├──────────────────┼──────────────────┼──────────────────┼───────────────────┼────────────────────┤
│ Purchase Order   │ Work Order &     │ Lab QC release   │ Delivery Order    │ AP/AR Invoicing,   │
│ & Goods Receipt  │ Material Tracking│ (Status Q to A)  │ & Gatepass issue  │ Bank Reconciliation│
│ [GESPOH/GESPTH]  │ [GESMFG/GESMTK]  │ [GESSCS]         │ [GESSDH]          │ [GESGAS/GESPIH/SIH]│
└──────────────────┴──────────────────┴──────────────────┴───────────────────┴────────────────────┘
```

### 1.1 Navigation Architecture: Top 12 Financial Fast Codes

Sage X3 users do not need to navigate multi-tiered menus. Typing these 6-character function codes directly into the top Global Navigation Search Bar provides immediate access to core financial functions:

| Fast Code | Module Domain | Full Menu Navigation Path | Primary Business Purpose |
| :---: | :--- | :--- | :--- |
| **`GESGAS`** | General Ledger | *Financials > Journals > Journal entry* | Manual journal entries, recurring provisions, batch adjustments, and general vouchers. |
| **`CONSBAL`**| General Ledger | *Financials > Inquiries > Account balances* | Real-time general ledger trial balances, net movements, and financial statements. |
| **`CONSCPT`**| General Ledger | *Financials > Inquiries > Account inquiry* | Detailed ledger drill-down per account, transaction audit trails, and journal traces. |
| **`GESPIH`** | Accounts Payable| *Purchasing > Invoices > Invoices* | Supplier purchase invoices with 3-way matching against Purchase Orders and GRNs. |
| **`GESBIS`** | Accounts Payable| *A/Payable > Invoicing > Supplier BP invoices* | Direct overhead/expense invoices not associated with inventory purchase orders. |
| **`GESSIH`** | Accounts Receivable| *Sales > Invoices > Invoices* | Customer commercial invoices generated directly from validated Delivery Orders. |
| **`PAYMENT`**| Cash / Banking | *A/Receivable / A/Payable > Payments* | Payment entry, supplier bank disbursements, customer payment receipts, and allocations. |
| **`PAYPROPAL`**| Cash / Banking| *A/Payable > Payments > Payment proposal* | Automated batch payment run generating disbursements based on invoice due dates. |
| **`RECBAN`** | Banking | *Financials > Banking > Bank reconciliation* | Electronic and manual bank reconciliation against bank statement records. |
| **`CPTCLI`** | Credit Control | *A/Receivable > Inquiries > Customer statement*| Customer Statement of Account (SOA), open items balance, and aging analysis. |
| **`GESDIE`** | Cost Accounting| *Common data > Analytical > Dimension types* | Configuration of analytical dimension axes (Cost Centers, Departments, Brands). |
| **`CLOPER`** | Period Closing | *Financials > Closing > Period closing* | Month-end period status locks preventing unauthorized backward transaction postings. |

---

## 2.0 GENERAL LEDGER (GL) & JOURNAL ENTRIES ARCHITECTURE

The General Ledger is governed by the transaction entry function **`GESGAS`**. Every operational and financial event in Sage X3 culminates in a balanced double-entry accounting document.

### 2.1 Journal Entry Anatomy & Types
Each journal entry consists of a Document Header (`GACCENTRY`) and Line Items (`GACCENTRYD`):
* **Entry Status (`STA_0`):**
  - **Simulation / Temporary (`STA = 1`):** Journal lines can be modified or deleted. Used for provisional monthly accruals.
  - **Final / Posted (`STA = 2`):** Permanent accounting record locked into the financial ledger. Irreversible without posting a contra-reversal journal.
* **Document Types (`TYP_0`):**
  - **`GENJ` (General Journal):** Standard manual adjustment journals, depreciation, and payroll allocations.
  - **`NEWJ` (Opening Journal):** Balance sheet carryforward records at the beginning of a fiscal year.
  - **`CLO` (Closing Journal):** System-generated profit & loss transfer journals during fiscal year closure.

### 2.2 BubblesO2 Chart of Accounts (`GACCOUNT`) Topology
The Chart of Accounts follows a structured numeric hierarchy aligned with Malaysian Financial Reporting Standards (MFRS / IFRS):

| Account Range | Account Classification | Normal Balance | Business Application at BubblesO2 |
| :---: | :--- | :---: | :--- |
| **1000 - 1999** | Non-Current Assets | Debit | Plant machinery, bottling lines, borehole water extraction assets, land, vehicles. |
| **2000 - 2999** | Current Inventory Assets | Debit | Raw materials (preforms, caps, cartons), work-in-progress, finished goods mineral water. |
| **3000 - 3999** | Trade Debtors (AR) | Debit | Commercial customer receivable accounts (Petromart, Lotus's, TF Value-Mart, Walk-ins). |
| **4000 - 4999** | Current Liabilities & AP | Credit | Trade creditors, supplier payables, accrued operating expenses, SST payable. |
| **5000 - 5999** | Cash & Bank Balances | Debit | Operating bank accounts (Maybank, CIMB), cash at bank, factory petty cash. |
| **6000 - 6999** | Commercial Sales Revenue | Credit | Sales revenue of 350ml, 425ml, 500ml, and 1500ml natural mineral water and carbonated drinks. |
| **7000 - 7999** | Cost of Goods Sold (COGS)| Debit | Direct material consumption, factory direct labor, energy, electricity, and water extraction fees. |
| **8000 - 8999** | Operating & Admin Expenses| Debit | Administrative salaries, vehicle maintenance, marketing, IT licenses, distribution costs. |
| **9000 - 9999** | Taxation & Equity | Credit | Corporate income tax provisions, share capital, and accumulated retained earnings. |

---

## 3.0 JOURNAL ENTRY SCREEN CUSTOMIZATION & BATCH ENTRY SOP

Addressing specific pain points raised by the BubblesO2 Finance Team in `SAGE_simplify task request.xlsx`, this section details the screen customization, column sequence, and out-of-balance alert handling.

### 3.1 Customizing the 11-Column Layout Sequence in `GESGAS`
To eliminate cluttered screens and match the exact sequence requested by the finance team, the entry transaction screen is customized via **Setup > Financials > Entry Transactions > Journal entries (`GESTBE`)**:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                    CUSTOMIZED JOURNAL ENTRY SCREEN SEQUENCE (GESGAS / GESTBE)                     │
├────┬──────────┬──────────┬──────────┬─────────────┬──────────────┬──────────────┬──────┬──────────┤
│Seq │ Col 1-2  │ Col 3-4  │ Col 5    │ Col 6       │ Col 7        │ Col 8        │Col 9 │Col 10-11 │
├────┼──────────┼──────────┼──────────┼─────────────┼──────────────┼──────────────┼──────┼──────────┤
│Fld │ Date     │ Acc No.  │ Currency │ Ref No.     │ Debit/Credit │ Descr 1 & 2  │Chq No│Dim 1 & 2 │
│DB  │ ACCDAT_0 │ ACC_0    │ CUR_0    │ REFINTLIN_0 │ SNS / AMTCUR │ DES / FREREF │CHK_0 │DIE / CCE │
└────┴──────────┴──────────┴──────────┴─────────────┴──────────────┴──────────────┴──────┴──────────┘
```

1. **Step-by-Step Customization Procedure:**
   - Open function **`GESTBE`**. Select transaction code **`STD`** (or create dedicated transaction **`BO2`**).
   - In the **Columns Tab**, activate and arrange the fields in the exact order:
     1. `Date` (`ACCDAT_0`)
     2. `GL / Acc No` (`ACC_0`)
     3. `Currency` (`CUR_0`)
     4. `Reference No` (`REFINTLIN_0`)
     5. `Debit / Credit Amount` (`AMTCUR_0` & `SNS_0`)
     6. `Description 1` (`DES_0`)
     7. `Description 2` (`FREREF_0`)
     8. `Description 3` (`STT1_0`)
     9. `Cheque No` (`CHK_0`)
     10. `Dimension 1 / Cost Center` (`DIE_0`, `CCE_0`)
     11. `Dimension 2 / Project-Brand` (`DIE_1`, `CCE_1`)
   - Click **Validation**. The grid layout is compiled into screen definition `WGAGASBO2`.

### 3.2 Out-of-Balance Prompting & Posting Controls
Finance users require immediate notification if a batch entry is out of balance.
* **Strict Double-Entry Enforcement:** Sage X3 mandates that total debits must equal total credits:
  $$\sum \text{Debit Amount} = \sum \text{Credit Amount}$$
* **Tolerance Setting (`GESTYP`):** In Document Types (**Setup > Financials > Document types**), the field **Balance Tolerance** is set to `0.00`. If debits do not equal credits, clicking **Save** triggers a blocking error: *"Transaction out of balance by RM X.XX. Cannot save or post."*
* **Modal Dialogue Pop-up Configuration:** To replace silent log listings with an immediate modal dialogue box, parameter **`AUTOBAT`** in **Setup > General Parameters > Parameter values > TC (Core / Accounting)** is configured to `Interactive Modal`.

```
+-------------------------------------------------------------------------------------------------------+
| FLOWCHART 1: GENERAL LEDGER JOURNAL POSTING & BALANCE VALIDATION WORKFLOW                             |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [ 1. Input Batch ] ---> [ 2. Grid Entry ]     ---> [ 3. Balance Check ] ---> [ 4. Is Balanced? ]     |
|   Enter Site, Date,      Input Acc, Currency,       System evaluates          Total Debit = Credit?   |
|   Document Type GENJ     Amounts & Dimensions       Sum(Debit) - Sum(Credit)          |               |
|                                                                                       |               |
|             ┌─────────────────────────────────────────────────────────────────────────┴─────┐         |
|             ▼ NO                                                                            ▼ YES     |
|  [ Modal Pop-up Error ]                                                        [ 5. Status Allocation]|
|   Prompt: Out of Balance!                                                       Save as Simulation    |
|   Posting blocked until reconciled                                              or Final Posted (GL)  |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

---

## 4.0 ACCOUNTS PAYABLE (AP) & SUPPLIER INVOICE VERIFICATION

The Accounts Payable subledger manages supplier liability, 3-way matching against purchasing receipts, and payment settlements.

### 4.1 3-Way Matching Workflow: PO to GRN to Invoice
BubblesO2 enforces strict 3-way matching before any inventory invoice can be approved for payment:
1. **Purchase Order (`GESPOH`):** Defines contracted item quantities and prices.
2. **Goods Receipt Note (`GESPTH`):** Confirms actual physical quantities delivered to the warehouse.
3. **Supplier Purchase Invoice (`GESPIH`):** Verified against the GRN.
   - When entering `GESPIH`, the user selects the supplier, then clicks **Receipt Selection** on the left drawer.
   - The system populates invoiced quantities, units, and rates directly from the GRN.

### 4.2 Purchase Price Variance (PPV) Accounting
When supplier invoice rates differ from purchase order rates, Sage X3 automatically segregates the variance using the automatic accounting code **`PPV`**:
* **Invoice Price > PO Price:**
  - Debit: Inventory / Expense Account (PO Rate)
  - Debit: Purchase Price Variance Account (`PPV` Variance Expense)
  - Credit: Supplier Control Account (`BPSUPPLIER` Total Invoiced)

---

## 5.0 ACCOUNTS RECEIVABLE (AR), CUSTOMER BILLING & CREDIT CONTROL

The Accounts Receivable module oversees commercial customer billing, credit risk control, open items tracking, and Statement of Account (SOA) aging.

### 5.1 Delivery Order to Invoice Generation (`GESSDH` to `GESSIH`)
Commercial invoices are generated directly from validated Delivery Orders to prevent billing unfulfilled orders:
1. Open **`GESSIH`** (*Sales > Invoices > Invoices*), click **New**.
2. Enter the **Sales Site** and **Customer ID** (e.g., `3000/001 - CAFE MESRA`).
3. Click **Delivery Selection** on the left drawer. Double-click the validated DO number (`GESSDH`).
4. Line items, quantities, agreed contract prices, and SST tax calculations are populated automatically.
5. Click **Create**, then click **Post**. The transaction writes to table `SINVOICE` and registers open items in `GACCDUDATE`.

### 5.2 Customer Credit Limits & Risk Management (`GESBPC`)
Customer accounts are governed by credit controls maintained in **`GESBPC`** (*Common Data > BPs > Customers*):
* **Credit Limit:** Maximum allowed financial exposure.
* **Credit Evaluation Formula:**
  $$\text{Total Exposure} = \text{Open Invoices (GACCDUDATE)} + \text{Uninvoiced DOs} + \text{New Sales Orders}$$
* **Credit Status Control:**
  - If Total Exposure exceeds Credit Limit or open invoices exceed grace terms, the customer status automatically switches to **`CREDIT HOLD`**, blocking further Sales Orders or Delivery Orders until payment is reconciled.

```
+-------------------------------------------------------------------------------------------------------+
| FLOWCHART 2: ORDER-TO-CASH (O2C) FINANCIAL INVOICING & CREDIT CONTROL                                 |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [ 1. Validated DO ] ---> [ 2. Open GESSIH ]   ---> [ 3. Left Drawer ]   ---> [ 4. Auto-Calculate ]   |
|   Warehouse executes       Accounts officer opens    Click 'Delivery Selection' Pull quantities,      |
|   GESSDH Validation        Customer Invoice screen   Select DO number          prices, SST tax        |
|           |                                                                           |               |
|           v                                                                           v               |
|  [ 8. Clear Open Item]<-- [ 7. Bank Receipt ]  <--- [ 6. Open Items Lejar]<--- [ 5. Post to Ledger ]  |
|   Match payment via        Receive bank transfer     GACCDUDATE registers      Final GL entry created;|
|   LETT Letter-matching     via PAYMENT function      due date & aging balance  Customer balance updated|
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

---

## 6.0 CASH MANAGEMENT, BANKING & PAYMENT PROCESSING

The Banking and Cash module governs operating bank accounts, disbursement proposals, customer receipts, and daily cash sweeps.

### 6.1 Bank Master Configuration (`GESBAN`)
Operating accounts (e.g., Maybank Operating, CIMB Collection) are configured with currency, GL control accounts, and payment method bindings in table `BANK`.

### 6.2 Payment Proposals (`PAYPROPAL`) & Batch Disbursements
To execute batch supplier payments efficiently:
1. Open **`PAYPROPAL`** (*A/Payable > Payments > Payment proposal*).
2. Define selection criteria: Due Date cutoff, Supplier Group, and Payment Site.
3. Sage X3 scans table `GACCDUDATE` for open supplier items due for settlement.
4. The system produces a proposed payment schedule. The finance manager reviews and approves the proposal.
5. Executing payment generation automatically updates `PAYMENTH` and `PAYMENTD`, prints payment vouchers, and marks open items as paid.

---

## 7.0 BANK RECONCILIATION & OPEN ITEM LETTER-MATCHING

Bank statement reconciliation and ledger matching verify that physical bank balances match internal general ledger cash accounts.

### 7.1 Bank Reconciliation Workflow (`RECBAN`)
1. Open **`RECBAN`** (*Financials > Banking > Bank reconciliation*).
2. Select Bank Code, Statement Ending Date, and Closing Statement Balance from the physical bank statement.
3. The screen displays two panels: Uncleared GL Bank Transactions and Reconciled Items.
4. Check off transactions appearing on the physical statement.
5. When **Variance = 0.00**, click **Validate**. Reconciled transactions receive a permanent reconciliation mark (`MRK_0`).

### 7.2 Manual and Automatic Letter-Matching (`LETT`)
Letter-matching links invoice debits to payment credits in open item management:
* **Automatic Matching:** Matches transactions with identical references and equal amounts.
* **Manual Matching:** Matches partial payments, split invoices, or contra-settlements.
* Matched entries are stamped with uppercase match codes (`MTC_0 = 'AA'`), removing them from active overdue aging reports.

---

## 8.0 COST ACCOUNTING & MULTI-DIMENSIONAL ANALYTICS

Sage X3 analytical accounting operates across independent dimension axes without cluttering the master Chart of Accounts.

### 8.1 Dimension Types (`GESDIE`) & Dimension Values (`GESCCE`)
BubblesO2 utilizes analytical dimension axes for granular profitability tracking:
1. **Dimension Axis 1 (Cost Centers / Departments):**
   - `CC-PROD` (Bottling & Production Lines)
   - `CC-WHSE` (Warehouse & Storage Logistics)
   - `CC-QUAL` (Quality Control Laboratory)
   - `CC-ADMN` (Executive & Finance Administration)
2. **Dimension Axis 2 (Product Brands / Market Channels):**
   - `BR-NAT` (Natural Mineral Water Series)
   - `BR-CARB` (Carbonated Fruit Flavor Series)
   - `BR-EXPO` (Overseas Export Accounts)

```
+-------------------------------------------------------------------------------------------------------+
| FLOWCHART 3: PURCHASE-TO-PAY (P2P) 3-WAY MATCH & CASH DISBURSEMENT                                    |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [ 1. Issue PO ]   ---> [ 2. Receive GRN ]  ---> [ 3. Supplier Invoice]---> [ 4. 3-Way Match ]        |
|   Purchasing opens         Warehouse posts           Vendor submits invoice;   Verify PO vs GRN vs    |
|   GESPOH to vendor         GESPTH receipt note       Enter in GESPIH           Invoice rates & qty    |
|           |                                                                           |               |
|           v                                                                           v               |
|  [ 8. Bank Recon ] <--- [ 7. Execute Payment]<---[ 6. Approve Proposal]<--- [ 5. Generate Proposal]  |
|   Verify statement         Generate bank voucher/    Finance Manager signs     PAYPROPAL scans due    |
|   balance via RECBAN       cheque via PAYMENT        off payment batch         open items in GACCDUDATE|
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

---

## 9.0 AUTOMATIC ACCOUNTING ENGINE & DATABASE SCHEMA LINKAGE

Operational events automatically trigger balanced journal entries via the Automatic Accounting Engine (`GESGAU`).

### 9.1 Core SQL Database Mapping from `Database.sql`

| Business Transaction | Operational Source | Primary Database Tables | Generated Auto-Journal (`GAU`) | Generated Accounting Postings |
| :--- | :--- | :--- | :--- | :--- |
| **Purchasing Receipt (GRN)** | `GESPTH` | `PRECEIPT`, `PRECEIPTD`, `STODET` | `PRH` (Purchase Receipt) | **Debit:** Stock Raw Material (`2000`)<br>**Credit:** GRNI Accrual (`4100`) |
| **Supplier AP Invoice** | `GESPIH` | `PINVOICE`, `PINVOICED`, `GACCDUDATE` | `PIH` (Purchase Invoice) | **Debit:** GRNI Accrual (`4100`)<br>**Debit:** SST Input Tax (`4300`)<br>**Credit:** Supplier Control (`4000`) |
| **Delivery Order (DO)** | `GESSDH` | `SDELIVERY`, `SDELIVERYD`, `STOJOU` | `SDH` (Delivery Order) | **Debit:** Accrued COGS (`7000`)<br>**Credit:** Stock Finished Goods (`2200`) |
| **Customer AR Invoice** | `GESSIH` | `SINVOICE`, `SINVOICED`, `GACCDUDATE` | `SIH` (Sales Invoice) | **Debit:** Customer Control (`3000`)<br>**Credit:** Sales Revenue (`6000`)<br>**Credit:** SST Output Tax (`4310`) |
| **Bank Payment Receipt** | `PAYMENT` | `PAYMENTH`, `PAYMENTD`, `GACCDUDATE` | `PAY` (Bank Receipt) | **Debit:** Bank Operating (`5000`)<br>**Credit:** Customer Control (`3000`) |

---

## 10.0 PERIOD-END & YEAR-END FINANCIAL CLOSING PROCEDURES

Monthly and annual financial cut-offs guarantee that accounting records are finalized and auditable.

### 10.1 Monthly Period Closing SOP (`CLOPER`)
1. **Subledger Cut-off:** Ensure all warehouse receipts (`GESPTH`) and deliveries (`GESSDH`) are validated and posted.
2. **Bank Reconciliation:** Validate that all operating bank statements are balanced in `RECBAN` with zero variance.
3. **Open Item Clearance:** Execute letter-matching (`LETT`) to clear settled supplier and customer transactions.
4. **Accruals & Depreciation:** Post recurring journals for asset depreciation (`DEPCALC`) and monthly prepayments.
5. **Close Accounting Period (`CLOPER`):** Change period status from **Open** to **Closed**. Once closed, no retroactive transactions can be posted without formal CFO authorization.

### 10.2 Fiscal Year End Closing SOP (`CLOFIY`)
1. Execute final audit trial balance verification.
2. Run **Fiscal Year End Closing (`CLOFIY`)**:
   - Computes net profit/loss across Revenue (`6xxx`), COGS (`7xxx`), and Expenses (`8xxx`).
   - Generates closing journal `CLO` transferring net surplus into Retained Earnings (`9200`).
   - Generates opening journal `NEWJ` carrying forward real balance sheet accounts into Fiscal Year (N+1).

```
+-------------------------------------------------------------------------------------------------------+
| FLOWCHART 4: PERIOD-END CLOSING & FINANCIAL RECONCILIATION WORKFLOW                                   |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [ 1. Subledger Cut-off ]-->[ 2. Bank Recon RECBAN ]-->[ 3. Open Items Match]-->[ 4. Depreciation ]    |
|   Validate all GRNs & DOs    Balance Maybank & CIMB    Execute LETT matching   Run asset depreciation |
|   Post unposted invoices     Zero variance required    Customer & AP ledgers   & monthly accruals     |
|           |                                                                           |               |
|           v                                                                           v               |
|  [ 8. Open Next Year ] <--- [ 7. Close Year CLOFIY]<---[ 6. Close Period CLOPER]<---[ 5. Trial Balance]|
|   NEWJ carries forward      Net income transferred     Lock period status;     Verify trial balance   |
|   balance sheet into N+1    to Retained Earnings       no retro postings       in CONSBAL             |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

---

## 11.0 FINANCIAL INQUIRIES, TROUBLESHOOTING & ACCOUNTING GLOSSARY

### 11.1 Troubleshooting Matrix for Common Financial Exceptions

| Error Message / Symptom | Root Operational Cause | Corrective Action |
| :--- | :--- | :--- |
| **"Transaction out of balance: Debit != Credit"** | Unbalanced batch entry lines in `GESGAS`. | Verify debit and credit columns. Balance tolerance is strictly set to 0.00. Reconcile differences before saving. |
| **"Period is closed for posting"** | Accounting date falls into a locked fiscal period in `PERIOD`. | Verify posting date. If retroactive entry is authorized by Finance Head, reopen period temporarily in `CLOPER`. |
| **"Dimension code mandatory on account"** | Account is flagged with mandatory analytical distribution in `GACCOUNT`. | Ensure Dimension 1 (Cost Center) and Dimension 2 (Brand) are populated on the journal line item. |
| **"Cannot invoice: Delivery not validated"** | Delivery Order `GESSDH` has not been validated by warehouse. | Request warehouse supervisor to execute **Validation** on `GESSDH` to release DO for financial billing. |
| **"Customer status is on Credit Hold"** | Customer has exceeded credit limit or has overdue invoices in `GACCDUDATE`. | Finance officer reviews Statement of Account in `CPTCLI`. Obtain payment receipt or execute authorized override. |

### 11.2 Authoritative Financial Glossary
* **Chart of Accounts (`COA`):** Structured index of financial accounts utilized to record transactions in the General Ledger.
* **3-Way Matching:** Internal accounting control comparing quantities and prices across Purchase Order, Goods Receipt, and Supplier Invoice.
* **Purchase Price Variance (`PPV`):** Accounting variance between contracted purchase order standard cost and actual invoiced cost.
* **Open Items (`GACCDUDATE`):** Unpaid financial obligations or receivables tracking exact due dates and collection stages.
* **Letter-Matching (`LETT`):** Accounting procedure pairing debit invoice records with corresponding credit payment vouchers.
* **Statement of Account (`SOA`):** Commercial ledger document summarizing open invoices, payments, and aging balances.
* **Auto-Journal (`GESGAU`):** Automated rule engine converting operational warehouse and manufacturing events into balanced GL entries.
