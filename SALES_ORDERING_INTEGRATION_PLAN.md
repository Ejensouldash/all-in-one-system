# Sales Ordering Department - Revised Integration Plan

## 1. Purpose and scope

This revised plan integrates Sales Ordering into the BubblesO2 All-in-One System using:

- `BOMSB-SOD-850-001 Process Sales Ordering Procedure, Issue 01`.
- `Sage X3 - Customer Code_To Update 2026-07-31.xlsx` customer master.
- Five sample Sales Order / Proforma Invoice documents.

The module covers the commercial order journey from customer PO to delivery completion. It deliberately does **not** change Production, batch creation, inventory formulas, or existing Warehouse stock-deduction logic.

## 2. Findings from the supplied data

### 2.1 Customer master is usable, but requires controlled import

The workbook contains about **2,568 customer/address records**. The `Master` sheet is the best import source because it combines the fields needed for operational and e-Invoice use:

- Customer ID and Sage ID.
- Legal name and secondary/trading name.
- PIC, phone, email and billing address.
- Separate address lines, city, postcode and country.
- Company registration number, TIN and SST number.
- Sales representatives.
- Customer type, subtype, category, region/zone and credit terms.

Important data observations:

- Customer ID such as `3000/838` is the stable business identifier seen on the sample documents; it must be treated as text, not a number.
- `SageID` is the external-accounting reference and must be preserved for future Sage X3 integration.
- Common customer types include `PETROMART` (1,040), `SOCMED` (538), `WALK IN` (457), `CAFE` (167), `CM` (107), `PH` (57), `CORPORATE` (55), and others.
- Main operational zones are Central, South, North and East Coast. The imported values need normalisation: for example, `SOUTH ` contains trailing space and some zone cells contain visibly corrupted/non-zone values.
- Credit terms occur as `30 DAYS`, `30`, `30 days`, `CASH`, `COD`, `50% DEPOSIT`, `60 DAYS` and blank. These must be mapped into a clean system value while keeping the original source text for audit.
- Contact, TIN, registration, email and SST fields are incomplete for some customers. Import must mark these records as `needs_review`, not silently invent data.

### 2.2 The samples are Proforma Invoice / Sales Order documents

The supplied examples show that the Sales document must support:

- System Sales Order/Proforma number, e.g. `S0019476`.
- PO number from customer.
- Customer account number, terms, contact, bill-to address and separate delivery-to address.
- Multiple SKU lines with barcode/item number, description, carton quantity, unit price, discount, tax and line amount.
- Optional logistics/freight line such as `TRANS LOGISTIC AND COURIER`.
- Order-level remarks, for example `FULL PAYMENT BEFORE DELIVERY`.
- Total quantity, subtotal, discount, net, tax, gross, amount-in-words and authorised/received signatures.

The bill-to customer can differ from the delivery destination. The R&R Corner and THB examples make this especially clear. Therefore, the system must not assume one customer equals one delivery address.

## 3. Core design principle: commercial order first, Warehouse fulfilment second

```text
Customer PO / Sales request
        -> Sales review and SOA/credit check
        -> Sales Order / Proforma Invoice
        -> Sales submits fulfilment request
        -> Warehouse creates Distribution Order and allocates batch
        -> Dispatch, location check-in, delivered
```

### Non-negotiable safeguards

- Creating or approving a Sales Order **does not deduct inventory**.
- Only the existing Warehouse Distribution Order creation/allocation continues to deduct stock and select batch numbers.
- Sales may view availability read-only; Warehouse remains the owner of batch allocation.
- A Sales Order can be cancelled or amended before Warehouse fulfilment without changing stock.
- Every document transition is written to an audit timeline.

## 4. Revised workflow

### A. Customer selection and data review

Sales searches the imported customer directory by Customer ID, Sage ID, legal/trading name, phone, postcode, zone or type/subtype.

For every new order, Sales chooses:

- Bill-to customer account.
- Delivery destination from the customer address book, or a new one-off delivery address.
- Contact person/phone for the specific delivery.

The chosen details are copied as a snapshot into the Sales Order. Subsequent edits to the customer master must not change historical documents.

### B. Receive and analyse PO

Sales registers the customer PO or manually creates an order for cash/walk-in/direct orders.

Required data:

- Customer PO number and date, where applicable.
- Source: BDD, website/B2B, Shift Portal, WhatsApp, walk-in, corporate, agent or other approved channel.
- Requested delivery date.
- Customer item references/remarks and PO attachment.
- SKU, carton quantity, agreed unit price, discount and tax treatment.
- Delivery address and contact.

Status: `NEW_PO -> UNDER_REVIEW`.

### C. SOA / credit and payment check

The check must support payment terms found in the master and samples:

- Cash/COD/full payment before delivery.
- Credit terms such as 7, 14, 30, 45, 60 or 90 days.
- Deposit requirement such as 50% deposit.

Phase 1 uses a controlled manual decision by authorised Accounts/AAA staff. The decision stores status, reviewer, timestamp, remarks and attachment/evidence.

```text
PENDING_SOA -> SOA_APPROVED -> SALES_ORDER_CREATED
PENDING_SOA -> SOA_REJECTED
```

For cash/deposit orders, the user records payment evidence/confirmation before the order can be submitted to Warehouse. This is a workflow control only; it does not replace Finance's accounting process.

### D. Create Sales Order / Proforma Invoice

After approval, Sales converts the order into a sales document. The number should follow the existing business sequence only after Finance/Sales confirms its ownership. Until then, use a separate internal sequence such as `SO-YYYYMMDD-0001` and keep a nullable `sageSalesOrderNo` field.

The printable document should match the supplied Proforma Invoice layout, including:

- Company header and tax registration details.
- Bill-to and delivery-to blocks.
- Sales/Proforma number, PO number, date and payment terms.
- Carton UOM, items, barcode/item code, price, discount, tax and amounts.
- Freight/logistics as a service line, not a stock SKU.
- Order remark, totals and signature blocks.

Any PDF generated by the system is a commercial/proforma document unless Finance explicitly approves tax-invoice issuance from this system.

### E. Submit to Warehouse

Sales submits only an approved Sales Order with completed delivery information and payment/credit clearance.

Warehouse sees a `Ready for Fulfilment` queue containing order number, requested delivery date, delivery zone, customer/destination, contact, item quantities and Sales remarks. Warehouse then creates the existing DO, allocates batch, driver and vehicle.

The Sales Order receives the DO link but never owns batch selection.

### F. Delivery and completion

The existing DO traceability, QR and Location Check-In remain the delivery source of truth.

```text
DO created -> dispatched -> location check-in -> delivered
```

Sales sees the combined fulfilment quantity and delivery result. A Sales Order becomes `PARTIALLY_FULFILLED` or `FULFILLED` based on linked DO quantities; it becomes `CLOSED` only after Sales/Finance confirms its commercial closure.

## 5. Customer master implementation

### 5.1 New data structure

```text
Customer
- id
- customerCode                 // source Customer ID, unique, stored as text
- sageCustomerId               // source SageID, unique when present
- legalName                    // Description(1)
- tradingName                  // Description(2)
- customerType
- customerSubtype
- categoryCode
- zone
- region
- creditTermsRaw
- creditTermDays               // normalised nullable number
- paymentPolicy                // CASH, CREDIT, COD, DEPOSIT, OTHER
- email
- phonePrimary
- phoneSecondary
- salesRep1
- salesRep2
- companyRegistrationNo
- tinNo
- sstNo
- importStatus                 // READY, NEEDS_REVIEW, INACTIVE
- sourceUpdatedAt

CustomerAddress
- id
- customerId
- addressType                  // BILLING, DELIVERY, OTHER
- label
- attentionTo
- phone
- addressLine1
- addressLine2
- addressLine3
- city
- state
- postcode
- country
- isDefaultBilling
- isDefaultDelivery
- sourceRowReference
```

### 5.2 Controlled import process

1. Upload the workbook into an import staging screen; do not write directly into live customer records.
2. Parse `Master` into customer and billing-address data; use `Address` as a complementary source for contact, original address components, type/subtype, credit term and zone.
3. Validate duplicates by `Customer ID`, then Sage ID, then normalised name + address.
4. Normalise low-risk values (trim spaces, phone digits, case, standard zones, standard credit terms).
5. Put ambiguous/missing or invalid values into an exception list for Sales/Accounts review.
6. Present an import summary: new, changed, unchanged, duplicate, incomplete and rejected rows.
7. An authorised user confirms the import. The system records file name, imported time, user and source row reference.

The spreadsheet stays as the onboarding source. It must not become a permanent live database dependency.

### 5.3 Address rule

At minimum, every customer has a billing address. A delivery address can be selected from saved locations or entered for a particular Sales Order. A one-off destination is saved only if Sales chooses `Save as customer delivery address`.

## 6. Sales Order data structure

```text
PurchaseOrder
- id, poNumber, poDate, sourceChannel, attachmentUrl
- customerId, requestedDeliveryDate, reviewStatus
- receivedById, reviewedById, reviewRemarks

SalesOrder
- id, internalSoNo, sageSalesOrderNo
- purchaseOrderId, customerId, status
- proformaNo, orderDate, requestedDeliveryDate
- paymentTermsSnapshot, paymentStatus
- billingAddressSnapshot, deliveryAddressSnapshot
- deliveryContactSnapshot, deliveryPhoneSnapshot
- subtotal, discountTotal, freightTotal, taxTotal, grandTotal
- currency, orderRemarks
- createdById, submittedToWarehouseAt

SalesOrderLineItem
- id, salesOrderId, sku, itemCodeSnapshot, barcodeSnapshot
- descriptionSnapshot, uom, qtyOrdered, qtyAllocated, qtyDelivered
- unitPrice, discountAmount, taxRate, taxAmount, lineTotal

SalesOrderCharge
- id, salesOrderId, chargeType       // FREIGHT, DELIVERY, OTHER
- description, quantity, unitPrice, total

SalesOrderDistributionOrder
- salesOrderId, distributionOrderId

SalesOrderActivity
- id, salesOrderId, activityType, remarks, actorId, createdAt
```

Monetary amounts must use precise decimal values; item description, price, barcode and tax are snapshots for audit even if the product master changes later.

## 7. Status lifecycle

```text
NEW_PO
 -> UNDER_REVIEW
 -> PENDING_SOA
 -> SOA_APPROVED
 -> SALES_ORDER_CREATED
 -> READY_FOR_WAREHOUSE
 -> PARTIALLY_FULFILLED
 -> FULFILLED
 -> CLOSED

Alternative exits:
UNDER_REVIEW / PENDING_SOA -> ON_HOLD
PENDING_SOA -> SOA_REJECTED
NEW_PO / UNDER_REVIEW / SALES_ORDER_CREATED -> CANCELLED
```

Once a DO exists, line reductions/cancellation require a controlled Sales + Warehouse action and activity record. The existing Warehouse reversal/return rules remain unchanged.

## 8. Reports mapped to the SOP

| SOP record | Revised system report |
|---|---|
| QR01 Sales Ordering Report | Daily/monthly order register by Sales Order/Proforma number, customer, source, payment term, zone, status and amount |
| QR02 Normal Order I Sales Report | Sales report using a Sales-approved channel/customer grouping |
| QR03 Normal Order II Sales Report | Second Sales-approved channel/customer grouping |
| QR04 Petronas Sales Report | Filter `customerSubtype = PETRONAS` (not just a name search) |
| QR05 Sales Delivered Report | Linked DO status `DELIVERED`, quantities and amounts by Sales Order/customer/date |
| QR06 Petromart Delivered Report | QR05 filtered by `customerType = PETROMART` |

QR02 and QR03 still need their business definitions from Sales. The supplied master is strong enough to support these filters once confirmed.

## 9. Screens and access

### Screens

```text
/forms/sales-ordering/dashboard
/forms/sales-ordering/customers
/forms/sales-ordering/customers/import
/forms/sales-ordering/po/new
/forms/sales-ordering/orders
/forms/sales-ordering/orders/[id]
/forms/sales-ordering/proforma/[id]
/forms/sales-ordering/reports
```

The order detail should show commercial and delivery information side by side:

```text
Customer/PO -> SOA & payment -> Proforma/SO -> Warehouse DO -> Delivery trace
```

### Access

- `SALES_ORDERING`: create/review PO and Sales Order.
- `SALES_ORDERING_CUSTOMERS`: search, maintain and import customer data.
- `SALES_ORDERING_APPROVE_SOA`: approve/reject SOA or payment readiness.
- `SALES_ORDERING_PRICING`: change price, discount, freight and tax fields.
- `SALES_ORDERING_REPORTS`: view/export reports.
- Warehouse: view `READY_FOR_WAREHOUSE` orders and create/link DO only.

## 10. Delivery phases

### Phase 1 - Customer foundation and Sales Order

- Customer import staging, validation, approval and exception handling.
- Customer search and bill-to/delivery address support.
- PO intake, attachment and review workflow.
- Manual SOA/payment approval with audit trail.
- Sales Order line items, pricing, freight/charge line and printable Proforma Invoice.

### Phase 2 - Warehouse handoff and traceability

- Ready-for-Warehouse queue.
- Create/prefill DO from Sales Order.
- SO-to-DO link and partial fulfilment calculation.
- Reuse existing Warehouse QR, batch trace, driver/vehicle and Location Check-In.

### Phase 3 - Reporting and controls

- QR01 to QR06 reports and daily management view.
- SLA alert for the SOP three-working-day target.
- Credit/payment and delivery-exception notifications.
- Closing controls and export/filing archive.

### Phase 4 - Sage X3 integration (only after ownership is agreed)

- Customer delta import/export using Sage customer/Sales Order references.
- Automated SOA/credit sync only if a trusted Sage API or approved export exists.
- Reconciliation report for customer, order number and status mismatch.

## 11. Decisions required before implementation

1. Is the Sales/Proforma number (for example `S0019476`) generated by Sage X3, or may this system generate the official sequence?
2. Is the system allowed to issue only Proforma Invoice, or also the final tax invoice/e-Invoice?
3. Who approves SOA, cash/deposit payment evidence and price/discount changes?
4. Which customers/types are allowed to create one-off delivery addresses?
5. What are the confirmed definitions for QR02 Normal Order I and QR03 Normal Order II?
6. Should freight be a fixed price, calculated by zone/quantity, or manually entered?
7. For partial delivery, does Sales approval need to happen before Warehouse creates the next DO?
8. Is Sage X3 a future API integration, a periodic Excel import, or a one-time migration source?

## 12. Recommendation

Build Phase 1 and Phase 2 first. They solve the immediate Sales Ordering need while using the existing Warehouse delivery traceability. The design preserves the current Production and stock behaviour: Sales manages customer commitments and commercial documents; Warehouse alone allocates batches and moves inventory.

## 13. AI Invoice Intake Assistant - cadangan tambahan

### 13.1 Masalah yang hendak diselesaikan

Team BD sering menghantar invoice/PO customer terus kepada SOD tanpa maklumat yang tersusun. SOD kemudian perlu membaca PDF, mencari customer, menyalin item, quantity, harga, PO number, payment term dan delivery address secara manual.

Cadangan: BD atau SOD upload dokumen customer ke sistem. Gemini membaca dokumen dan mengembalikan data berstruktur sebagai **draft Sales Order**. SOD masih menyemak dan approve sebelum Sales Order rasmi diwujudkan.

```text
BD/SOD upload PDF
        -> AI extract invoice/PO fields
        -> Match Customer ID/Sage ID dari master
        -> Validate SKU, qty, price, address and terms
        -> SOD review differences
        -> Create official Sales Order
        -> Submit to Warehouse
```

AI tidak boleh terus create DO, allocate batch, atau deduct stock.

### 13.2 Reka bentuk storage yang dicadangkan

Gunakan **Cloudflare R2 sebagai document storage** kerana organisasi sudah menggunakan R2 untuk backup Sage X3. Simpan fail PDF asal di R2, manakala Supabase hanya menyimpan metadata dan hasil extraction.

```text
Cloudflare R2
  - original customer PDF
  - optional reviewed/approved PDF
  - retention and lifecycle policy

Supabase
  - document id and R2 object key
  - file hash and upload metadata
  - AI extraction JSON
  - validation issues and confidence
  - reviewer, approval and timestamps
```

Jangan simpan PDF dalam Supabase Storage jika tujuan utamanya hanya mengurangkan storage/egress Supabase. R2 Standard kini mempunyai 10 GB-month storage, 1 juta Class A operations dan 10 juta Class B operations percuma setiap bulan; egress R2 adalah percuma. Penggunaan melebihi kuota masih dicaj, jadi lifecycle/retention tetap diperlukan.

### 13.3 Gemini processing pattern

Gunakan Gemini 3.6 Flash untuk document understanding dan structured output. PDF boleh dihantar sebagai dokumen visual supaya model membaca table, layout dan teks; Gemini Files API boleh digunakan untuk dokumen yang lebih besar atau perlu diproses semula. File yang dihantar melalui Files API disimpan oleh Gemini selama 48 jam, jadi ia bukan archival storage.

Cadangan processing:

1. Browser upload terus ke R2 menggunakan presigned upload URL.
2. Server simpan `DocumentIntake` metadata di Supabase.
3. Server ambil PDF dari R2 menggunakan private service credential.
4. Server hantar dokumen ke Gemini dan minta output JSON mengikut schema.
5. Server match extracted customer reference dengan Customer Master.
6. Server match item code/barcode dengan Product/SKU Master.
7. Server kira semula subtotal, freight, tax dan grand total untuk detect mismatch.
8. SOD melihat review screen dan membetulkan field yang ditanda.
9. Hanya selepas SOD submit, sistem create Sales Order rasmi.

### 13.4 Extraction schema minimum

```json
{
  "documentType": "PROFORMA_INVOICE",
  "documentNumber": "S0019476",
  "poNumber": "80104000925726",
  "documentDate": "2026-07-14",
  "customerReference": "3000/838",
  "customerName": "AEON CO. (M) BHD",
  "paymentTermsRaw": "60 DAYS",
  "deliveryAddress": "...",
  "deliveryContact": "...",
  "lines": [
    {
      "barcode": "9555978700267",
      "itemCode": "BO2-03",
      "description": "BUBBLESO2 425ML X 24",
      "quantity": 23,
      "uom": "CTN",
      "unitPrice": 46.0,
      "discount": 0,
      "tax": 0,
      "amount": 1058.0
    }
  ],
  "charges": [],
  "totals": {
    "subtotal": 2511.6,
    "discount": 0,
    "tax": 0,
    "grandTotal": 2511.6
  },
  "confidence": 0.96,
  "warnings": []
}
```

The model output is only a proposal. The server must validate types, dates, decimal amounts, allowed SKU, customer match and totals before it can become a draft SO.

### 13.5 Human review rules

The review screen must highlight:

- Customer not matched or multiple possible matches.
- Delivery address differs from the selected customer address.
- Unknown SKU/barcode.
- Quantity, price or total mismatch.
- Missing PO number, payment term or delivery date.
- Low confidence or unreadable page.
- Duplicate document hash, PO number or customer document number.

Recommended statuses:

```text
UPLOADED
-> AI_PROCESSING
-> NEEDS_REVIEW
-> READY_TO_CREATE_SO
-> SO_CREATED

AI_PROCESSING -> AI_FAILED
NEEDS_REVIEW -> REJECTED
```

### 13.6 Security and reliability controls

- R2 bucket must remain private; use short-lived signed URLs and server-side access.
- Do not expose R2 access keys or Gemini API key in browser code.
- Keep original document hash, prompt/schema version, model name, extraction JSON and reviewer changes for audit.
- Treat invoice text as untrusted input; the document must not be allowed to override system instructions or trigger arbitrary actions.
- Apply file limits: PDF only, maximum size, page count, malware scan where available.
- Rate-limit AI processing and provide a manual fallback if Gemini is unavailable.
- Do not send the same PDF repeatedly to Gemini; use a content hash and store extraction result.
- Set R2 lifecycle rules, for example archive approved documents long-term and delete rejected/temporary uploads after a defined period approved by management.
- Consider masking non-essential bank details or internal information before AI processing if Finance requires it.

### 13.7 Cost recommendation

The most cost-efficient architecture for this use case is:

```text
R2: PDF storage
Supabase: metadata, JSON, audit and business records
Gemini: temporary document processing and structured extraction
```

This prevents every PDF upload and repeated PDF download from consuming Supabase Storage quota and Supabase egress. R2 is not unlimited-free, but its current free tier and zero egress make it a good fit, especially since the existing Cloudflare account is already part of the backup workflow. Keep the backup bucket and application documents in separate buckets or at least separate prefixes, credentials and lifecycle policies.

### 13.8 Implementation phases for AI intake

#### AI Phase 1 - Assisted extraction

- R2 private bucket/prefix for `sales-order-intake/`.
- Upload screen for BD/SOD.
- Gemini extraction to draft JSON.
- Customer/SKU matching and review screen.
- Manual create Sales Order button.
- No automatic notification, DO or stock mutation.

#### AI Phase 2 - Quality and operations

- Duplicate detection.
- Confidence and validation dashboard.
- Extraction correction feedback log.
- Retry/manual fallback queue.
- R2 lifecycle and document retention controls.
- Metrics: extraction accuracy, review time, rejection rate and AI cost per document.

#### AI Phase 3 - Controlled automation

- Auto-fill only high-confidence fields.
- Auto-route unclear orders to the right SOD queue.
- Optional BD submission status and notification.
- Automatic creation of a **draft** SO only; official SO still requires SOD approval.

### 13.9 New decisions required

9. Which documents may BD upload: customer PO, proforma invoice, email attachment, image, or all PDF/image types?
10. How long must original customer documents be retained in R2?
11. Is Gemini data processing approved for customer commercial documents by management/Finance?
12. What confidence/validation threshold allows a field to be auto-filled?
13. Which fields must always be manually confirmed before SO creation?
14. Should the original PDF be attached to the official Sales Order after approval, or retained only as an intake record?
