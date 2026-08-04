# Sales Ordering AI - Local Testing Guide

## What is ready

- Cloudflare R2 direct PDF upload using a five-minute presigned URL.
- Gemini 3.6 Flash PDF extraction.
- Customer Master Excel import from the `Master` and `Address` tabs.
- Customer and inventory SKU matching.
- Duplicate PDF, missing data, amount mismatch and low-confidence warnings.
- SOD review screen before creating a draft Sales Order.
- Draft Sales Order detail and audit logs.
- No Production, batch allocation, Distribution Order or inventory deduction logic is changed.

## 1. Start locally

```powershell
npm.cmd run dev
```

Open:

```text
http://localhost:3000/forms/sales-ordering
```

Superadmin can access automatically. For SOD/BD users, open `Users -> Access Control` and enable:

- `Sales Ordering` for intake, review and draft SO.
- `Customer Master Import` only for authorised customer-data maintainers.

## 2. Import the Customer Master

1. Open `Sales Ordering -> Customers`.
2. Choose `Sage X3 - Customer Code_To Update 2026-07-31.xlsx`.
3. Click `Import`.
4. Wait for the summary showing new, updated and needs-review records.
5. Search for `3000/838` and confirm AEON appears.

The import uses Customer ID as the upsert key. Running the same file again updates existing records instead of creating duplicates.

## 3. Test AI Intake

1. Open `Sales Ordering -> AI Intake`.
2. Upload `CTH SO AEON CO.pdf`.
3. The browser uploads directly to R2; the file does not enter Supabase Storage.
4. Wait for Gemini processing to complete.
5. Confirm the review page shows at least:
   - Customer reference `3000/838`.
   - Document number `S0019476`.
   - PO number `80104000925726`.
   - Three stock item lines.
   - Grand total RM 2,511.60.
6. Review highlighted warnings and correct any field if needed.
7. Select the matched Customer Master record.
8. Click `Create Draft SO`.

## 4. Safety regression checks

After creating a draft SO:

- Confirm Warehouse inventory balances are unchanged.
- Confirm no Distribution Order is created.
- Confirm no batch number is allocated.
- Confirm Production pages continue to load normally.
- Confirm the draft SO displays the message that it is a commercial draft only.

## 5. Before Vercel deployment

Add these server-side environment variables in Vercel Project Settings:

```text
GEMINI_API_KEY
R2_BUCKET_NAME
R2_ACCOUNT_ID
R2_ENDPOINT
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
```

Do not prefix secrets with `NEXT_PUBLIC_`. Confirm the exact production Vercel origin is included in the R2 CORS policy.

