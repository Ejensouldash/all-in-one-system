# Warehouse Revamp — Implementation & Local Testing Guide

## Apa yang telah dibuat

- Revamp dashboard Warehouse dengan KPI, compact handover dan inventory responsive.
- Search/filter SKU, status batch dan quick actions.
- Batch Traceability page: origin, creator, production report, handover, inventory movement dan DO history.
- DO Traceability page untuk destinasi, driver, nombor plat, status dan timeline.
- Smart Batch QR V2 yang membuka halaman trace melalui kamera telefon.
- DO Tracking QR pada Stock Transfer Form.
- QR kecil untuk setiap batch dalam DO.
- Location Check-In pilihan A:
  - Mula Perjalanan.
  - Check-In Tiba.
  - Sahkan Dihantar.
  - Fallback manual jika permission location ditolak.
- Tracking disimpan sebagai event append-only.

## Apa yang tidak diubah

Perubahan ini tidak menyentuh:

- Production DPR calculation.
- AM/PM inventory timeline.
- Carry-forward calculation.
- Raw material usage calculation.
- Production handover quantity calculation.
- Inventory deduction ketika DO dibuat.
- Goods return, quarantine dan restock calculation.

Location Check-In hanya menyimpan milestone penghantaran. Ia tidak menambah atau menolak kuantiti inventory.

## Fail utama

- `src/app/forms/warehouse/dashboard/page.tsx` — dashboard baharu.
- `src/components/warehouse/LiveInventoryTable.tsx` — inventory table/cards.
- `src/app/forms/warehouse/inventory/batch/[batchNumber]/page.tsx` — Batch Traceability.
- `src/app/forms/warehouse/trace/do/[id]/page.tsx` — DO Traceability.
- `src/components/warehouse/LocationCheckIn.tsx` — UI location check-in.
- `src/app/actions/warehouseTracking.ts` — server action check-in.
- `src/lib/warehouse/traceability.ts` — read-only trace queries.
- `src/components/warehouse/SmartQrCard.tsx` — QR trace card.
- `prisma/schema.prisma` — model tracking tambahan sahaja.
- `prisma/warehouse_trace_migration.sql` — migration additive untuk Supabase.

## Database change

Satu model baharu ditambah: `DistributionTrackingEvent`.

Ia menyimpan Distribution Order, milestone, latitude/longitude jika tersedia, accuracy, location status, remarks, recorder dan timestamp.

Migration ini additive sahaja. Ia tidak mengubah jadual Production atau inventory sedia ada. SQL migration telah berjaya dijalankan pada Supabase environment semasa.

## Sebelum test local

Jangan gunakan database Production sebenar untuk test create DO, handover atau check-in. Gunakan Supabase project/branch/staging database yang berasingan.

Install dependencies jika perlu:

```powershell
npm.cmd install
```

Jika database local/staging belum mempunyai jadual tracking:

```powershell
npx.cmd prisma db execute --file prisma/warehouse_trace_migration.sql
npx.cmd prisma generate
```

## Validation sebelum start server

```powershell
npx.cmd prisma validate
npx.cmd tsc --noEmit
npx.cmd eslint src/app/actions/warehouseTracking.ts src/lib/warehouse/traceability.ts src/components/warehouse/LocationCheckIn.tsx
```

Expected: schema valid, TypeScript tiada error dan ESLint tiada error.

## Start aplikasi local

```powershell
npm.cmd run dev
```

Buka URL yang dipaparkan oleh terminal, biasanya:

```text
http://192.168.0.39:3000
```

Jika host LAN tidak boleh dicapai, cuba `http://localhost:3000`.

Login menggunakan user test yang mempunyai module `WAREHOUSE`.

## Urutan test

### 1. Dashboard

Buka `/forms/warehouse/dashboard` dan semak:

- KPI cards keluar.
- Pending handover keluar dengan betul.
- Empty state tidak menggunakan ruang terlalu besar.
- Search dan filter SKU berfungsi.
- Desktop table dan mobile cards tidak pecah.
- `Trace` membuka Batch Traceability.
- `QR` membuka halaman printable QR.

### 2. Batch Traceability

Klik `Trace` pada mana-mana batch dan semak:

- Batch number, SKU dan current balance betul.
- Total In dan Total Out sama seperti sebelum revamp.
- Creator hanya dipaparkan jika rekod asal tersedia.
- Production, handover, DO, driver, nombor plat dan destinasi betul.
- Timeline tersusun dengan betul.

### 3. Smart Batch QR

Buka `/forms/warehouse/inventory/qr?batch=YOUR_BATCH&sku=YOUR_SKU`.

Semak:

- QR boleh dicetak.
- Scan menggunakan kamera telefon membuka Batch Trace page.
- Scan menggunakan scanner Transfer In masih mengisi Batch No dan SKU.
- Scan menggunakan raw material form masih mengenal pasti Batch No dan SKU.

QR V2 menggunakan URL yang masih mempunyai query `batch` dan `sku` supaya scanner lama kekal serasi.

### 4. DO Tracking QR

Gunakan database staging dan buka `/forms/warehouse/distribution/new`.

Isi destination, driver, vehicle number, satu batch dan quantity yang sah. Selepas DO dibuat:

1. Buka `Print POD`.
2. Semak QR besar dalam Distribution Order Details.
3. Scan QR besar dan pastikan DO Trace page terbuka.
4. Scan QR kecil pada item batch dan pastikan Batch Trace page terbuka.

### 5. Location Check-In

Dalam DO Trace page, test flow berikut:

```text
Mula Perjalanan → Check-In Tiba → Sahkan Dihantar
```

Semak:

- Browser meminta permission location.
- Latitude, longitude dan accuracy dipaparkan jika permission diberi.
- Link Google Maps menunjukkan lokasi yang betul.
- Timestamp dan recorder betul.
- Selepas `DELIVERED`, check-in tambahan tidak dibenarkan.
- Inventory quantity tidak berubah selepas check-in.

### 6. Fallback manual

Tolak permission location atau gunakan device tanpa geolocation. Tekan `Manual` dan semak:

- Event masih berjaya direkod.
- Timeline menunjukkan `Check-in manual`.
- Latitude dan longitude kosong.
- Delivery flow tidak tersekat.

### 7. Production regression

Sebelum test, catat untuk satu batch/report:

- Total In.
- Total Out.
- Available balance.
- Production report status.
- Handover status.

Selepas test Warehouse, pastikan semua nilai sama. Buka juga Daily Production Report, Production Stock, Transfer In dan Production Handover untuk memastikan tiada error.

## Test build penuh

```powershell
npm.cmd run build
```

Expected output mengandungi `Compiled successfully`, TypeScript selesai dan static pages berjaya dijana.

Jika build gagal mengambil Google Fonts kerana network local, ulangi selepas internet dibenarkan. Ia bukan error daripada Warehouse code.

## Sebelum git push

```powershell
git status --short
git diff --check
npx.cmd prisma validate
npx.cmd tsc --noEmit
npm.cmd run build
```

Kemudian semak:

- Tiada fail Production berubah secara tidak sengaja.
- `src/app/actions/dailyReport.ts` tidak berubah.
- Tiada formula inventory berubah.
- `prisma/warehouse_trace_migration.sql` termasuk dalam review/commit.
- Fail test/temp yang tidak berkaitan tidak dimasukkan.

## Nota deployment

Perubahan belum dipush atau dideploy ke Vercel. Selepas local testing lulus, deploy ke Vercel Preview dan ulangi test QR serta geolocation pada HTTPS preview URL kerana browser biasanya memerlukan HTTPS untuk geolocation.
