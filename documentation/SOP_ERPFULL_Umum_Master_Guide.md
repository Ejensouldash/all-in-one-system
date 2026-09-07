# STANDARD OPERATING PROCEDURE (SOP)
## PANDUAN LENGKAP PENGOPERASIAN SISTEM ENTERPRISE (ERPFULL) — SAGE X3 V12
**BubblesO2 Master Enterprise Operations Guide**  
*Versi Dokumen: 1.0 (Rasmi) | Klasifikasi: Panduan Komprehensif Silang Jabatan | Mod Operasi: Read-Only*

---

## 1.0 PENGENALAN: APA SEBENARNYA ERPFULL? (CERITA MUDAH UNTUK SEMUA STAF)

### 1.1 Menghubungkan Semua Jabatan dalam Satu "Otak"
Ramai staf keliru bila dengar istilah **`ERPFULL`**, **`ERPDIS`**, **`ERPMAN`**, dan **`ERPFIN`**. 

Secara mudahnya:
* **`ERPDIS`** adalah tangan dan kaki syarikat (Beli barang mentah, simpan dalam stor gudang, dan hantar botol air kepada pelanggan).
* **`ERPMAN`** adalah dapur kilang (Tiup botol preform, isi air mineral beroksigen, pasang label, dan bungkus dalam kotak karton).
* **`ERPFIN`** adalah dompet dan akaun syarikat (Keluarkan invois rasmi, kutip bayaran pelanggan, dan bayar invois pembekal).
* **`ERPFULL`** adalah **KESELURUHAN KITARAN PERNIAGAAN** yang mencantumkan ketiga-tiga modul ini menjadi satu aliran kerja lancar tanpa ada jabatan yang bekerja secara terasing (*silo*).

Di kilang **BubblesO2**, apa sahaja yang dilakukan oleh satu jabatan akan memberi kesan langsung kepada jabatan lain:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                        KITARAN HAYAT PENUH PERNIAGAAN BUBBLESO2 (ERPFULL)                       │
├──────────────────┬──────────────────┬──────────────────┬───────────────────┬────────────────────┤
│ 1. PEMBELIAN     │ 2. PENGELUARAN   │ 3. KUALITI (QC)  │ 4. JUALAN & DO    │ 5. INVOIS & AKAUN  │
│ (ERPDIS)         │ (ERPMAN)         │ (ERPMAN ➔ DIS)   │ (ERPDIS)          │ (ERPFIN)           │
├──────────────────┼──────────────────┼──────────────────┼───────────────────┼────────────────────┤
│ Beli preform,    │ Tiup botol, isi  │ Uji makmal 24 jam│ Terima PO customer│ Keluar invois,     │
│ cap, label &     │ air mineral &    │ di bawah zon     │ & muat lori       │ terima bayaran &   │
│ kotak karton     │ bungkus karton   │ Kuarantin (Q)    │ agihan (DO)       │ tutup akaun untung │
│ [GESPOH/GESPTH]  │ [GESMFG/GESMTK]  │ [GESSCS]         │ [GESSOH/GESSDH]   │ [GESSIH/PAYMENT]   │
└──────────────────┴──────────────────┴──────────────────┴───────────────────┴────────────────────┘
```

---

### 1.2 Kesan Rantaian: Mengapa Setiap Staf Kena Faham Aliran Penuh?

> [!IMPORTANT]
> **Peringatan Penting Untuk Semua Ketua Jabatan & Staf:**  
> 1. **Jika Purchasing lambat buat GRN (`GESPTH`):** Kilang akan sangkut ralat *"Material Shortage"* dan mesin tidak boleh berjalan.  
> 2. **Jika Kilang lambat buat Tracking (`GESMTK`):** Gudang tidak akan nampak baki stok fizikal di dalam sistem.  
> 3. **Jika QC lambat tukar status Q ke A (`GESSCS`):** Bahagian Jualan tidak boleh membuat Surat Jalan (DO) dan lori tidak boleh keluar menghantar air.  
> 4. **Jika Warehouse lupa tekan Validation pada DO (`GESSDH`):** Bahagian Akaun tidak boleh menjana Invois dan baki stok fizikal tidak akan ditolak daripada gudang!

---

## 2.0 PETA NAVIGASI LENGKAP: 10 KOD PANTAS UTAMA ENTERPRISE

Jangan buang masa mencari menu bertingkat. Cukup taip kod fungsi 6 huruf ini di ruangan carian atas (*Navigation Bar*):

```
                       ┌──────────────────────────────────────────────┐
                       │           BAR CARIAN ATAS SAGE X3            │
                       │           Taip Kod Pantas Di Sini... 🔍      │
                       └──────────────────────┬───────────────────────┘
                                              │
         ┌──────────────────┬─────────────────┼─────────────────┬──────────────────┐
         ▼                  ▼                 ▼                 ▼                  ▼
    [ PEMBELIAN ]      [ KILANG ]        [ KUALITI ]       [ JUALAN ]         [ KEWANGAN ]
   GESPOH (Buka PO)   GESMFG (Work Order) GESSCS (Tukar QC) GESSOH (Sales Order) GESSIH (Invois)
   GESPTH (Terima GRN)GESMTK (Catat Siap) CONSSST (Semak Baki)GESSDH (Surat DO) PAYMENT (Resit)
```

| Kod Fungsi | Modul Asal | Nama Menu Penuh | Jabatan Terlibat | Tujuan Penggunaan Harian |
| :---: | :---: | :--- | :--- | :--- |
| **`GESPOH`** | ERPDIS | *Purchasing > Orders > Orders* | Purchasing | Buka pesanan pembelian bahan mentah (Preform, Cap, Label, Kotak) kepada pembekal. |
| **`GESPTH`** | ERPDIS | *Purchasing > Receipts > Receipts* | Stor Bahan Mentah | Rekod penerimaan lori pembekal tiba (GRN) untuk tambah stok mentah dalam lejar. |
| **`GESBOD`** | ERPMAN | *Manufacturing > Master data > BOMs* | R&D / Kejuruteraan | Tetapkan resipi ramuan (cth: 24 preform + 24 cap + 24 label + 1 kotak = 1 CTN). |
| **`GESMFG`** | ERPMAN | *Manufacturing > Planning > Work orders* | Perancang Kilang | Buka arahan kerja pengeluaran syif dan semak peruntukan bahan mentah. |
| **`GESMTK`** | ERPMAN | *Manufacturing > Production tracking* | Operator / Penyelia | Rekod jumlah kotak siap dibotolkan, jumlah reject (scrap), dan tolak stok mentah. |
| **`GESSCS`** | ERPMAN | *Stock > Internal movements > Stock change* | Pegawai Makmal (QC) | Tukar status stok siap daripada Kuarantin (**Status Q**) ke Sedia Dijual (**Status A**). |
| **`CONSSST`** | ERPDIS | *Stock > Inquiries > Stock by site* | Semua Jabatan | Semak baki stok langsung: berapa botol ada atas lantai, berapa dalam QC, berapa bebas dijual. |
| **`GESSOH`** | ERPDIS | *Sales > Orders > Orders* | Sales / Khidmat Pelanggan| Masukkan pesanan jualan pelanggan dan tempah stok (*Allocation*). |
| **`GESSDH`** | ERPDIS | *Sales > Deliveries > Deliveries* | Logistik / Warehouse | Buat Surat Jalan (DO), cetak borang muatan lori, dan sahkan tolakan stok (*Validation*). |
| **`GESSIH`** | ERPFIN | *A/Receivable > Invoicing > Customer invoices*| Bahagian Akaun (AR) | Jana invois rasmi berasaskan DO yang telah dihantar untuk kutipan hutang. |

---

## 3.0 TUTORIAL LANGKAH DEMI LANGKAH: ALIRAN PERNIAGAAN LENGKAP (A SAMPAI Z)

Bagi memudahkan pemahaman semua pihak, kita gunakan **Satu Contoh Senario Produk Sebenar**:  
*Produk Siap:* **`FG-425X24`** — Air Mineral Semula Jadi BubblesO2 425ml x 24 Botol (1 Karton).  
*Pelanggan:* **Petromart Sdn Bhd** (Pesanan 500 Karton).

---

### FASA 1: PEMBELIAN & PENERIMAAN BAHAN MENTAH (STOR)

```
[ Purchasing: Buka PO GESPOH ] ──► [ Lori Pembekal Tiba ] ──► [ Stor: Buat GRN GESPTH ] ──► [ Stok Mentah Masuk Lejar ]
```

#### Langkah 1.1: Pembelian Bahan Mentah (`GESPOH`)
1. Buka kod **`GESPOH`**, klik **`[New]`**.
2. **Order Site:** Pilih tapak kilang (cth: `BOMSB`).
3. **Supplier:** Masukkan kod pembekal preform/kotak.
4. **Tab Lines:** Masukkan bahan:
   - `RM-PREF-425` (Preform 425ml): Kuantiti 24,000 PCS.
   - `RM-CAP-BLUE` (Penutup Botol): Kuantiti 24,000 PCS.
   - `RM-BOX-425` (Kotak Karton): Kuantiti 1,000 PCS.
5. Klik **`[Create]`**. Nombor PO dijana (cth: `PO2609001`).

#### Langkah 1.2: Penerimaan Barang di Stor Gudang (`GESPTH`)
1. Bila lori pembekal tiba di pintu stor, buka **`GESPTH`**, klik **`[New]`**.
2. Masukkan **Receiving Site** dan kod **Supplier**.
3. **PENTING (Guna Left Drawer):** Di panel kiri, klik tab **PO Selection**. Klik dua kali pada nombor PO tadi.
4. Periksa kuantiti fizikal yang turun dari lori.
5. Klik **`[Create]`**. Stok bahan mentah kini rasmi bertambah dalam lejar status **A**.

---

### FASA 2: PENGELUARAN & PEMBUATAN BOTOL AIR DI KILANG

```
[ Buka Work Order GESMFG ] ──► [ Semak Stok Bahan Cukup ] ──► [ Mesin Berjalan ] ──► [ Catat Siap GESMTK ] ──► [ Masuk Zon Kuarantin Q ]
```

#### Langkah 2.1: Menjana Arahan Kerja Kilang (`GESMFG`)
1. Buka kod **`GESMFG`**, klik **`[New]`**.
2. **Manufacturing Site:** Pilih tapak kilang (`BOMSB`).
3. **Released Product:** Masukkan kod barang siap: **`FG-425X24`**.
4. **Released Quantity:** Masukkan sasaran: **`1,000`** CTN.
5. **Start & End Date:** Masukkan tarikh syif operasi.
6. Klik butang **`[Allocation]`** di panel kanan:
   - Pastikan lajur status menunjukkan **Allocated**. Jika keluar perkataan *Shortage*, bermakna bahan mentah belum cukup!
7. Klik **`[Create]`**. Nombor Work Order dijana (cth: `MFG26090001`). Cetak tiket kerja untuk operator mesin.

#### Langkah 2.2: Mencatat Hasil Botol Siap & Tolak Bahan Mentah (`GESMTK`)
1. Selepas syif tamat dan botol siap dibungkus atas palet, buka **`GESMTK`**.
2. Di panel kiri, klik pada nombor Work Order `MFG26090001`.
3. **Produced Quantity:** Masukkan jumlah kotak elok atas palet (cth: **`980`** CTN).
4. **Rejected Quantity:** Masukkan botol/kotak rosak semasa proses (cth: **`20`** CTN).
5. **Lot/Batch Number:** Masukkan nombor kelompok (cth: `B260904-01`).
6. **Stock Status:** **Wajib kekalkan status Q (Quarantine)**.
7. Klik **`[Create]`**.
   - *Apa yang berlaku di belakang tabir:* Sistem menolak 23,520 preform, 23,520 cap, dan 980 kotak secara automatik daripada stor, dan memasukkan 980 karton botol siap ke dalam inventori di bawah Zon Kuarantin.

---

### FASA 3: KAWALAN KUALITI (QC) & PELEPASAN STOK

```
[ Botol Siap Berada di Zon Q ] ──► [ Ujian Makmal Mikrobiologi 24-48 Jam ] ──► [ Lulus COA ] ──► [ Tukar Status ke A di GESSCS ]
```

#### Langkah 3.1: Pelepasan Status Kuarantin ke Sedia Dijual (`GESSCS`)
1. Botol air mineral yang baru siap dibotolkan tidak boleh dijual serta-merta demi mematuhi piawaian keselamatan makanan KKM / HACCP.
2. Selepas 24–48 jam, bila laporan makmal (*Certificate of Analysis - COA*) mengesahkan air bersih dan selamat:
3. Pegawai QC buka kod **`GESSCS`** (*Stock change*).
4. Pilih tapak gudang dan kod produk `FG-425X24`.
5. Di panel kiri, pilih nombor kelompok `B260904-01` yang berstatus **Q**.
6. Tukar medan **New Status** daripada **`Q`** kepada **`A`**.
7. Masukkan nombor rujukan makmal di ruangan *Reference* (cth: `QC-PASS-0926`).
8. Klik **`[Save]`**. Stok kini bertukar menjadi hijau (*Available*) dan sedia untuk dijual oleh Sales!

---

### FASA 4: PESANAN JUALAN & PENGHANTARAN LORI (DO)

```
[ Customer Hantar PO ] ──► [ Sales Buat Order GESSOH ] ──► [ Gudang Buka DO GESSDH ] ──► [ Tekan Validation ] ──► [ Lori Bergerak ]
```

#### Langkah 4.1: Memasukkan Pesanan Pelanggan (`GESSOH`)
1. Buka kod **`GESSOH`**, klik **`[New]`**.
2. **Sales Site:** Tapak jualan cawangan.
3. **Customer:** Masukkan kod pelanggan (cth: `PETROMART`).
4. **Customer PO No:** Masukkan nombor PO pelanggan (cth: `PO-PETRO-8891`).
5. **Tab Lines:** Masukkan item `FG-425X24`, kuantiti `500` CTN.
6. Periksa lajur **Allocation**: Pastikan status menunjukkan **Allocated** (menandakan stok status A mencukupi di gudang).
7. Klik **`[Create]`**. Nombor Sales Order dijana (cth: `SOH2609001`).

#### Langkah 4.2: Menjana Surat Jalan / Delivery Order (`GESSDH`)
1. Staf logistik/gudang buka kod **`GESSDH`**, klik **`[New]`**.
2. Pilih **Delivery Site** dan masukkan kod pelanggan `PETROMART`.
3. **PENTING (Guna Left Drawer):** Di panel kiri, klik tab **Order Selection**. Klik dua kali pada nombor SO tadi (`SOH2609001`). Maklumat 500 karton ditarik secara automatik.
4. Klik **`[Create]`** untuk menyimpan draf DO.
5. Cetak Surat Jalan fizikal untuk diserahkan kepada pemandu lori.
6. **LANGKAH WAJIB PALING KRITIKAL:** Di panel kanan, klik butang **`[Validation]`**.
   - *AMARAN:* Selagi butang Validation tidak ditekan, stok fizikal TIDAK AKAN DITOLAK daripada sistem, dan bahagian Akaun TIDAK BOLEH keluarkan Invois!

---

### FASA 5: PENGELUARAN INVOIS & KUTIPAN BAYARAN

```
[ DO Selesai di-Validate ] ──► [ Akaun Jana Invois GESSIH ] ──► [ Terima Cek/Bank Transfer ] ──► [ Padankan Bayaran PAYMENT ]
```

#### Langkah 5.1: Penjanaan Invois Jualan Rasmi (`GESSIH`)
1. Pegawai Akaun Belum Terima (AR) buka kod **`GESSIH`**, klik **`[New]`**.
2. Masukkan **Invoice Site** dan kod pelanggan `PETROMART`.
3. Di panel kiri, klik tab **Delivery Selection**. Klik dua kali pada nombor DO yang telah di-*validate* tadi.
4. Sistem menarik kuantiti, harga jualan, diskaun, dan SST secara automatik.
5. Klik **`[Create]`**, kemudian klik **`[Post]`**. Invois kini rasmi masuk ke dalam Lejar Kewangan syarikat.

#### Langkah 5.2: Perekodan Penerimaan Bayaran (`PAYMENT`)
1. Apabila pelanggan membuat bayaran pindahan bank (Bank Transfer) atau cek:
2. Buka fungsi **`PAYMENT`** (*A/Receivable > Payments*).
3. Pilih akaun bank syarikat dan masukkan kod pelanggan.
4. Masukkan jumlah wang yang diterima dan padankan (*match/reconcile*) dengan nombor invois berkaitan.
5. Klik **`[Save]`** dan **`[Post]`**. Baki hutang pelanggan kini selesai dan lejar bank bertambah.

---

## 4.0 MATRIKS PANTANG LARANG SILANG JABATAN (CROSS-DEPARTMENTAL RULES)

Bagi memastikan operasi syarikat tidak tergendala, patuhi pantang larang berikut:

| Jika Jabatan Ini... | Melakukan Kesilapan Ini... | Kesan Buruk Kepada Jabatan Lain... | Tindakan Pembetulan Segera |
| :--- | :--- | :--- | :--- |
| **Purchasing / Stor** | Lambat buat GRN (`GESPTH`) walaupun lori barang mentah dah sampai. | Kilang tidak boleh mula Work Order sebab sistem paparkan ralat *Component Shortage*. | Pegawai stor mesti segera masukkan dokumen penerimaan GRN sebaik barang diturunkan dari lori. |
| **Kilang (Production)** | Terus tukar botol siap kepada Status A semasa di `GESMTK` tanpa tunggu QC. | Melanggar prosedur keselamatan makanan KKM & GMP. Risiko produk tercemar terkeluar ke pasaran. | **DILARANG SAMA SEKALI.** Status wajib kekal **Q**. Hanya pegawai makmal dibenarkan menukar status. |
| **Kawalan Kualiti (QC)** | Lupa menukar status Q kepada A di `GESSCS` selepas ujian makmal lulus. | Bahagian Jualan tidak boleh buat Surat Jalan (DO) dan lori terpaksa menunggu lama di kilang. | Pegawai QC perlu menyemak senarai kelompok berstatus Q setiap pagi dan lakukan pelepasan segera. |
| **Warehouse / Gudang** | Cetak DO tapi lupa tekan butang **[Validation]** di `GESSDH`. | 1. Stok dalam sistem tidak ditolak keluar.<br>2. Bahagian Akaun tidak boleh jana Invois pelanggan. | Semak senarai DO belum sah (*Unvalidated DOs*) di penghujung setiap syif kerja. |
| **Sales** | Pandai-pandai buat DO manual tanpa menarik nombor Sales Order. | Baki pesanan pelanggan asal tidak tertutup dan pesanan akan berulang kali tertunggak. | **Wajib** gunakan panel kiri (*Order Selection*) untuk menarik rekod pesanan sedia ada. |

---

## 5.0 GLOSARI LENGKAP STATUS DOKUMEN & KOD TRANSAKSI SAGE X3

| Istilah / Kod Dokumen | Nama Penuh Dokumen | Jabatan Pemilik | Maksud & Peranan Dokumen Dalam Perniagaan |
| :---: | :--- | :--- | :--- |
| **PO (`GESPOH`)** | *Purchase Order* | Purchasing | Pesanan rasmi pembelian barang mentah daripada kilang kepada pihak pembekal luar. |
| **GRN (`GESPTH`)** | *Goods Receipt Note* | Stor Gudang Mentah | Bukti penerimaan fizikal bahan mentah yang dihantar oleh pembekal ke premis kilang. |
| **BOM (`GESBOD`)** | *Bill of Materials* | Kejuruteraan / R&D | Resipi formula standard yang menyenaraikan bahan mentah untuk menghasilkan 1 karton air. |
| **WO (`GESMFG`)** | *Work Order* | Perancang Kilang | Arahan pengeluaran rasmi yang menetapkan kuantiti karton dan tarikh syif mesin beroperasi. |
| **Tracking (`GESMTK`)** | *Production Tracking* | Operator Kilang | Rekod sebenar botol yang berjaya disiapkan, botol rosak (*scrap*), dan tolakan stok bahan mentah. |
| **Status Q** | *Quarantine Stock* | Kawalan Kualiti (QC)| Zon kuarantin makmal. Stok dikunci dan tidak boleh disentuh oleh bahagian jualan atau lori. |
| **Status A** | *Accepted Stock* | Kawalan Kualiti (QC)| Zon stok lulus makmal. Stok bebas untuk dijual dan dihantar kepada pelanggan. |
| **SO (`GESSOH`)** | *Sales Order* | Jualan (Sales) | Pesanan jualan rasmi daripada pelanggan (cth: stesen minyak, pasar raya, ejen jualan). |
| **DO (`GESSDH`)** | *Delivery Order* | Warehouse / Logistik | Surat Jalan rasmi yang mengiringi lori penghantaran dan menolak stok fizikal dari gudang. |
| **INV (`GESSIH`)** | *Sales Invoice* | Bahagian Akaun (AR) | Invois rasmi tuntutan bayaran kepada pelanggan berasaskan Surat Jalan yang telah sah. |
| **Allocation** | *Stock Allocation* | Sistem Automatik | Proses menempah stok sedia ada khas untuk sesuatu pesanan agar tidak diambil oleh pesanan lain. |
| **Validation** | *Document Validation* | Warehouse / Logistik | Pengesahan akhir dokumen yang mengunci transaksi ke dalam lejar undang-undang perakaunan. |

---

> [!NOTE]
> **Khidmat Sokongan Teknikal & Meja Bantuan Dalaman**  
> Sekiranya anda mendepani masalah teknikal atau ralat sistem yang tidak dapat diselesaikan melalui panduan di atas, sila hubungi meja bantuan **Pasukan IT Dalaman BubblesO2** dengan menyertakan tangkap layar (*screenshot*) berserta nombor rujukan dokumen berkaitan.  
> *Sistem ERP Sage X3 V12 — Panduan Lengkap Enterprise (ERPFULL) | Dokumen Dalaman Rasmi Syarikat BubblesO2*
