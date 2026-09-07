# STANDARD OPERATING PROCEDURE (SOP)
## PANDUAN MANUAL OPERASI MODUL ERPMAN (MANUFACTURING) — SAGE X3 V12
**BubblesO2 Manufacturing Operations System**  
*Versi Dokumen: 1.0 (Rasmi) | Klasifikasi: Dokumen Dalaman Syarikat | Mod Operasi: Read-Only*

---

## 1.0 PENGENALAN & 3 PERATURAN EMAS NAVIGASI ERPMAN

### 1.1 Pengenalan Modul ERPMAN
Dokumen ini disusun khusus sebagai rujukan rasmi bagi melatih penyelia kilang, juruteknik pengeluaran, pegawai kawalan kualiti (QC), staf stor bahan mentah, dan pasukan sokongan IT.

Di kilang **BubblesO2**, modul **ERPMAN (Manufacturing)** bertindak sebagai "jantung pengeluaran". Modul ini menghubungkan bahan mentah yang dibeli oleh bahagian *Purchasing* (modul **ERPDIS**) dengan botol air mineral siap yang akan dijual oleh bahagian *Sales & Warehouse*.

```
       [ PEMBELIAN & GUDANG (ERPDIS) ]
       Bahan Mentah: Preform, Penutup (Cap), Label, Kotak Karton
                         │
                         ▼
        ┌──────────────────────────────────┐
        │     MODUL PENGELUARAN (ERPMAN)   │
        │  1. Sediakan Resipi & Mesin (BOM)│
        │  2. Buka Arahan Kerja (WO)       │
        │  3. Rekod Hasil Siap & Reject    │
        │  4. Tolak Stok Bahan Mentah      │
        └──────────────────────────────────┘
                         │
                         ▼
       [ KAWALAN KUALITI (QC) - STATUS Q ]
       Ujian Makmal Mikrobiologi & Pelepasan Status A
                         │
                         ▼
       [ PENGHANTARAN & JUALAN (ERPDIS) ]
       Kemasukan ke Lejar Barang Siap & Lori Agihan (DO)
```

---

### 1.2 Tiga (3) Peraturan Emas Navigasi Sage X3 untuk Staf Kilang

Sebelum menekan sebarang butang dalam Sage X3, setiap staf wajib mengingati tiga peraturan asas ini:

```
┌─────────────────────────────────┐   ┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│  1. PERIKSA SITE KILANG DULU!   │   │     2. GUNA KOD PINTAS PANTAS   │   │   3. MANFAATKAN LEFT DRAWER     │
│                                 │   │                                 │   │                                 │
│ Sentiasa periksa tapak kilang   │   │ Tak perlu klik menu bertingkat. │   │ Gunakan panel kiri              │
│ (Production Site, cth: BOMSB /  │   │ Taip terus kod fungsi di bar    │   │ (Selection Drawer) untuk tarik  │
│ MY01) di bucu kanan atas.       │   │ carian atas:                    │   │ nombor Work Order yang ada      │
│ Transaksi di Site yang salah    │   │ • GESBOD (Resipi BOM)           │   │ tanpa perlu taip semula nombor  │
│ akan menolak bahan mentah dari  │   │ • GESMFG (Work Order)           │   │ panjang secara manual.          │
│ gudang cawangan lain!           │   │ • GESMTK (Production Tracking)  │   │                                 │
└─────────────────────────────────┘   └─────────────────────────────────┘   └─────────────────────────────────┘
```

---

### 1.3 Struktur Asas Skrin Transaksi Kilang
Skrin operasi dalam Sage X3 dibahagikan kepada 3 zon utama:
1. **Panel Kiri (Left List / Selection Drawer):** Memaparkan senarai dokumen sedia ada (senarai Work Order yang belum siap, senarai resipi aktif, dan status bahan).
2. **Ruang Kerja Tengah (Main Work Area):** Tempat mengisi data pengeluaran (Header, Kuantiti Sasaran, Tarikh, Senarai Komponen, dan Stesen Mesin).
3. **Panel Kanan (Action Bar):** Barisan butang tindakan utama seperti `[New]` (Cipta Baharu), `[Create]` (Simpan), `[Save]` (Kemas kini), `[Tracking]` (Catat Hasil), dan `[Close]` (Tutup Order).

---

## 2.0 SOP 01: PENGURUSAN RESIPI & STRUKTUR PRODUK (BOM & ROUTING)

### 2.1 Konsep Asas BOM (Bill of Materials) Air Mineral
Setiap botol air mineral yang dibungkus ke dalam kotak memerlukan komponen yang tepat. Sistem Sage X3 menggunakan konsep **BOM (Resipi Produk)** untuk mengetahui jumlah bahan mentah yang mesti ditolak secara automatik apabila satu-satu kelompok selesai dibotolkan.

**Contoh Produk Utama (Golden Example):**  
*Kod Produk:* **`FG-425X24`** — Air Mineral Semula Jadi BubblesO2 425ml (1 Karton = 24 Botol)

| Kod Komponen | Keterangan Komponen | Kuantiti bagi 1 Karton (24 Botol) | Unit Ukuran (UOM) | Stesen Penggunaan |
| :--- | :--- | :--- | :--- | :--- |
| **`RM-PREF-425`** | Preform Botol PET 425ml | 24 | PCS | Mesin Tiup (*Blowing*) |
| **`RM-CAP-BLUE`** | Penutup Botol (Blue Cap) | 24 | PCS | Mesin Tutup (*Capping*) |
| **`RM-LBL-425`** | Label Plastik BubblesO2 425ml | 24 | PCS | Mesin Label (*Labelling*) |
| **`RM-BOX-425`** | Kotak Karton Bercetak 425ml x 24 | 1 | PCS | Mesin Bungkus (*Packing*) |
| **`RAW-WATER`** | Air Punca Semula Jadi | 10.2 | LTR (Liter) | Tangki Penapisan (*Filling*) |

---

### 2.2 Langkah Menyemak & Menetapkan Resipi Produk (`GESBOD`)

```
[ Buka GESBOD ] ──► [ Sahkan Production Site ] ──► [ Pilih Kod Produk FG ] ──► [ Semak Senarai Ramuan ] ──► [ Simpan/Aktifkan ]
```

#### Jadual Tindakan Skrin GESBOD:
| Langkah | Nama Medan / Butang | Nilai / Tindakan | Perhatian & Panduan Staf |
| :---: | :--- | :--- | :--- |
| **1** | **Buka Fungsi** | Taip `GESBOD` di bar carian atas. | Menu laluan: *Manufacturing > Master data > Production BOMs*. |
| **2** | **Parent Product** | Masukkan kod produk siap: `FG-425X24`. | Pastikan memilih kod barang siap (FG), bukan bahan mentah. |
| **3** | **BOM Alternative** | Pilih `1` (Standard Production). | Alternatif 1 digunakan untuk operasi harian biasa. |
| **4** | **Tab Components** | Masukkan senarai komponen & kuantiti nisbah. | Pastikan nisbah adalah untuk 1 unit karton (24 botol). |
| **5** | **Validity Date** | Semak tarikh sah (*Start Date* & *End Date*). | Jika tarikh tamat sudah lepas, Work Order tidak boleh dicipta! |
| **6** | **Butang Simpan** | Klik `[Save]` di panel kanan. | Rekod resipi kini sedia digunakan oleh bahagian perancangan. |

---

### 2.3 Laluan Operasi Mesin / Routing (`GESROU`)
Routing mentakrifkan stesen kerja (Work Center) yang dilalui oleh air mineral dari punca mata air hingga menjadi palet siap:
1. **Operasi 10 (BLOW):** Mesin Tiup Preform (*Blowing Machine*).
2. **Operasi 20 (FILL-CAP):** Bilik Bersih (*Cleanroom*) — Pengisian Air Semula Jadi & Penutupan Cap.
3. **Operasi 30 (LABEL):** Mesin Penampalan Label Automatik.
4. **Operasi 40 (PACK):** Mesin Pengotakan (*Case Packer*) — 24 botol dimasukkan ke dalam kotak karton.
5. **Operasi 50 (PALLET):** Penyusunan atas palet kayu/plastik mengikut corak piawai (cth: 72 karton per palet).

---

## 3.0 SOP 02: PENJANAAN PERINTAH KERJA KILANG (WORK ORDER — `GESMFG`)

### 3.1 Aliran Kerja Penjanaan Work Order

```
   ┌────────────────────────────────────────────────────────┐
   │ 1. Cipta Work Order Baharu                             │
   │    Kod: GESMFG                                         │
   │    (Penyelia Pengeluaran / Perancang Kilang)           │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ 2. Semak Status Peruntukan Bahan (Component Allocation)│
   │    Sistem menyemak baki Preform, Cap, Label & Kotak    │
   └───────────────────────────┬────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
       [ BAHAN MENCUKUPI ]           [ BAHAN TIDAK CUKUP ]
     Status: ALLOCATED             Status: SHORTAGE / SHORT
                │                             │
                │                             ▼
                │                  Hubungi Stor / Purchasing
                │                  (Tunggu GRN ERPDIS Masuk)
                ▼
   ┌────────────────────────────────────────────────────────┐
   │ 3. Lepaskan Arahan Kerja (Release Work Order)          │
   │    Cetak Borang Kerja (*Work Order Traveler Ticket*)   │
   │    Operator Mesin Mula Bekerja Atas Lantai             │
   └────────────────────────────────────────────────────────┘
```

---

### 3.2 Langkah Terperinci Skrin & Perincian Medan Wajib (`GESMFG`)

| Langkah | Nama Medan / Butang | Nilai / Format Diisi | Perhatian & Tip Operasi |
| :---: | :--- | :--- | :--- |
| **1** | **Butang [New]** | Klik butang `[New]` di panel kanan atas. | Sistem akan membuka borang arahan kerja kosong. |
| **2** | **Manufacturing Site** | Pilih tapak kilang (cth: `BOMSB` / `MY01`). | **Wajib semak!** Jangan biarkan kosong. |
| **3** | **Production Type** | Standard. | Tetapan piawai untuk pembuatan berasaskan stok. |
| **4** | **Released Product** | Masukkan kod produk: `FG-425X24`. | Sistem akan automatik menarik nama produk dan resipi BOM berkaitan. |
| **5** | **Released Quantity** | Masukkan sasaran kotak siap (cth: `1,000`). | Kuantiti dalam unit karton (CTN). |
| **6** | **Start & End Date** | Masukkan tarikh dan masa syif bermula/tamat. | Contoh: Syif Pagi (08:00 - 16:00). |
| **7** | **Semak Tab Components** | Klik tab *Components* di bahagian tengah. | Sistem menyenaraikan: 24,000 Preform, 24,000 Cap, 24,000 Label, 1,000 Kotak. |
| **8** | **Butang [Create]** | Klik butang `[Create]` di panel kanan. | Sistem akan menjana nombor rasmi Work Order (cth: `MFG26090001`). |
| **9** | **Butang [Allocation]** | Klik butang `[Allocation]` di panel kanan. | Memastikan stok bahan mentah di gudang terus dikunci (*reserved*) untuk order ini. |

> [!TIP]
> **Peringatan Penting Untuk Penyelia Kilang:**  
> Jangan sesekali menekan butang memulakan kerja jika lajur peruntukan menunjukkan perkataan **"Shortage"**. Ini bermakna baki fizikal preform, label, cap, atau kotak di gudang tidak mencukupi untuk menampung sasaran kuantiti yang hendak dihasilkan!

---

## 4.0 SOP 03: CATATAN PENGELUARAN SEBENAR & PENGGUNAAN BAHAN (PRODUCTION TRACKING — `GESMTK`)

### 4.1 Aliran Kerja Perekodan Pengeluaran & Tolak Stok Sebenar

```
   ┌────────────────────────────────────────────────────────┐
   │ 1. Buka Production Tracking                            │
   │    Kod: GESMTK                                         │
   │    (Penyelia Syif / Operator Data Pengeluaran)         │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ 2. Tarik Nombor Work Order dari Left List Drawer       │
   │    Pilih nombor WO yang sedang/telah dijalankan        │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ 3. Isi Kuantiti Botol/Karton Siap & Reject (Scrap)     │
   │    • Kuantiti Sempurna: Masuk ke Stor Status Q         │
   │    • Kuantiti Rosak: Masuk ke Rekod Reject (Scrap)     │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ 4. Sahkan Tolakan Bahan Mentah (Material Consumption)  │
   │    Sistem automatik menolak Preform, Cap, Label, Kotak │
   │    mengikut formula sebenar yang digunakan             │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ 5. Klik [Create] untuk Pengesahan Rasmi                │
   │    Stok Siap wujud dalam sistem (Status Q - Kuarantin) │
   └────────────────────────────────────────────────────────┘
```

---

### 4.2 Langkah Terperinci Skrin & Perincian Medan Wajib (`GESMTK`)

| Langkah | Bahagian Skrin | Nama Medan / Butang | Tindakan & Nilai Diisi | Tip Pantas & Pantang Larang |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Navigasi** | Taip `GESMTK` | Buka skrin *Manufacturing Tracking*. | Boleh juga ditekan terus dari skrin `GESMFG` melalui butang `[Tracking]` di panel kanan. |
| **2** | **Panel Kiri** | *WO Selection* | Klik pada nombor Work Order yang berkenaan. | Maklumat Work Order akan dimuatkan secara automatik ke ruang kerja tengah. |
| **3** | **Tab Header** | *Tracking Type* | Pilih `Complete` atau `Partial`. | Pilih `Partial` jika syif tamat tetapi order belum selesai sepenuhnya. |
| **4** | **Tab Production** | *Produced Quantity* | Masukkan jumlah kotak sempurna siap (cth: `980`). | Kuantiti fizikal yang telah disusun elok atas palet dan siap dibungkus. |
| **5** | **Tab Production** | *Rejected Quantity* | Masukkan jumlah kotak/botol rosak (cth: `20`). | Wajib direkodkan agar kadar *Scrap/Wastage* kilang dapat dijejaki dengan tepat. |
| **6** | **Tab Production** | *Lot Number (Batch)* | Masukkan nombor Batch mengikut format kilang. | Format piawai BubblesO2: `B260904-01` (Tahun-Bulan-Hari-Nombor Syif). |
| **7** | **Tab Production** | *Stock Status* | **Status lalai: Q (Quarantine)**. | **Dilarang tukar ke A di sini!** Semua produk wajib melalui kuarantin QC dahulu. |
| **8** | **Tab Material** | *Component Usage* | Semak senarai bahan mentah yang ditolak. | Jika terdapat preform pecah tambahan, laraskan kuantiti sebenar di ruangan ini. |
| **9** | **Panel Kanan** | Butang `[Create]` | Klik `[Create]`. | Sistem akan menolak bahan mentah serta-merta dan memasukkan barang siap ke dalam lejar. |

---

## 5.0 SOP 04: KAWALAN KUALITI (QC) & PELEPASAN STOK KE GUDANG JUALAN (`GESSCS`)

### 5.1 Memahami 3 Status Kualiti Stok Sage X3

```
┌──────────────────────────────────┐  ┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│       STATUS Q (QUARANTINE)      │  │        STATUS A (ACCEPTED)       │  │        STATUS R (REJECTED)       │
│                                  │  │                                  │  │                                  │
│ Status asal semua botol siap     │  │ Lulus ujian makmal sepenuhnya.   │  │ Gagal ujian kualiti.             │
│ sebaik sahaja keluar dari mesin. │  │ Baki stok bebas untuk dijual,    │  │ Mengalami kebocoran, label koyak,│
│ SISTEM MENGUNCI STOK INI!        │  │ ditempah oleh Sales (GESSOH),    │  │ atau isu mikrobiologi.           │
│ Bahagian jualan & lori TIDAK     │  │ dan dikeluarkan melalui DO       │  │ Tidak boleh dijual sama sekali.  │
│ BOLEH buat penghantaran lagi.    │  │ (GESSDH).                        │  │ Perlu dihantar untuk scrap.      │
└──────────────────────────────────┘  └──────────────────────────────────┘  └──────────────────────────────────┘
```

---

### 5.2 Langkah Pelepasan Stok Pasca-Makmal (`GESSCS` — Stock Change)

Selepas sampel air mineral diuji oleh Pegawai Makmal/QC (ujian mikrobiologi, pH, TDS, dan ketahanan botol) dan disahkan selamat (biasanya mengambil masa 24–48 jam mengikut piawaian kualiti):

```
[ Buka GESSCS ] ──► [ Pilih Site & Produk ] ──► [ Pilih Lot/Batch Status Q ] ──► [ Tukar Status ke A ] ──► [ Simpan [Save] ]
```

#### Jadual Langkah Pertukaran Status:
| Langkah | Nama Medan / Butang | Tindakan | Perhatian & Panduan |
| :---: | :--- | :--- | :--- |
| **1** | **Buka Fungsi** | Taip `GESSCS` di bar carian. | Laluan menu: *Stock > Internal movements > Stock change*. |
| **2** | **Stock Site** | Sahkan Site Kilang / Gudang Siap. | Tempat botol fizikal diletakkan semasa menunggu ujian makmal. |
| **3** | **Product Code** | Masukkan kod produk: `FG-425X24`. | |
| **4** | **Panel Kiri (Stock)** | Pilih kelompok Lot yang berstatus `Q`. | Semak nombor kelompok agar sepadan dengan sijil kelulusan QC (*COA - Certificate of Analysis*). |
| **5** | **New Status** | Tukar nilai huruf daripada `Q` kepada `A`. | Status kini bertukar daripada Kuarantin kepada *Accepted* (Sedia Dijual). |
| **6** | **Reference / Reason** | Taip nombor laporan makmal (cth: `QC-PASS-2609-01`). | Untuk tujuan audit keselamatan makanan (HACCP / GMP). |
| **7** | **Panel Kanan** | Klik butang `[Save]`. | **Selesai!** Modul `ERPDIS` kini boleh melihat stok ini untuk proses *Allocation* dan *Delivery*. |

---

## 6.0 PANDUAN PENYELESAIAN MASALAH & RALAT LAZIM (TROUBLESHOOTING & FAQ)

| Mesej Ralat / Masalah | Punca Sebenar Terjadi | Tindakan Pembetulan Pantas |
| :--- | :--- | :--- |
| **Ralat: "Component shortage / Material not allocated" semasa buat Work Order.** | Baki stok fizikal bagi salah satu komponen (preform/cap/label/kotak) tidak mencukupi di tapak kilang yang dipilih. | 1. Buka `CONSSST` (Stock by site) dan semak baki komponen yang kurang.<br>2. Sahkan dengan stor sama ada penerimaan barang pembekal (*GRN GESPTH*) sudah selesai dibuat oleh bahagian pembelian. |
| **Ralat: "Lot number already exists" semasa menyimpan Production Tracking.** | Nombor Lot / Batch yang ditaip telah digunakan sebelumnya pada hari atau syif yang sama. | Pastikan format nombor Lot unik. Tambah nombor siri syif di belakang (cth: tukar `-01` kepada `-02`). |
| **Ralat: "Work Order status is Closed / Suspended".** | Work Order berkenaan telah ditandakan sebagai selesai sepenuhnya (*Completed/Closed*) atau telah dibekukan oleh penyelia. | Buka semula Work Order di `GESMFG`. Jika kerja sebenar belum selesai, tukar status order kembali kepada *Firm / In Progress*. |
| **Tersilap isi kuantiti siap atau salah tolak kuantiti bahan mentah di `GESMTK`.** | Operator tersilap taip angka kuantiti sebelum menekan butang simpan. | 1. Jangan panik. Buka menu `GESMTK` semula.<br>2. Buat transaksi pelarasan tracking baharu (*Correction Tracking*) atau hubungi Penyelia Kilang untuk melaraskan baki di menu *Stock change/adjustment*. |
| **Bahagian Jualan (Sales) mengadu stok tidak muncul dalam senarai tempahan pelanggan.** | Botol siap yang telah dikeluarkan masih tersangkut dalam **Status Q (Kuarantin)** dan belum dilepaskan oleh pegawai QC. | Semak status stok di `CONSSST`. Jika status masih `Q`, minta pegawai QC menjalankan prosedur pertukaran status ke `A` menggunakan fungsi `GESSCS`. |

---

## 7.0 LAMPIRAN: GLOSARI ISTILAH KILANG & SISTEM SAGE X3

Bagi mengelakkan kekeliruan antara istilah vendor, sistem ERP, dan operasi harian di kilang:

| Istilah / Singkatan | Maksud Penuh | Huraian Mudah Untuk Staf Kilang |
| :--- | :--- | :--- |
| **BOM** | *Bill of Materials* | **Resipi Produk:** Senarai lengkap semua bahan mentah dan kuantiti yang diperlukan untuk menghasilkan satu unit barang siap. |
| **Routing** | *Manufacturing Routing* | **Laluan Mesin:** Susunan stesen kerja atau mesin yang dilalui oleh bahan mentah dari awal sehingga menjadi produk akhir. |
| **WO / MFG** | *Work Order / Manufacturing Order* | **Arahan Kerja Rasmi:** Dokumen arahan rasmi kilang yang menetapkan berapa banyak botol perlu dihasilkan pada tarikh dan syif tertentu. |
| **Tracking** | *Production Tracking (`GESMTK`)* | **Catatan Pengeluaran Sebenar:** Proses mengisi jumlah botol sebenar yang berjaya disiapkan, jumlah rosak (*reject*), dan masa mesin digunakan. |
| **Allocation** | *Component Allocation* | **Kunci Baki Bahan:** Tindakan sistem mengunci bahan mentah di gudang khas untuk sesuatu Work Order supaya tidak digunakan oleh orang lain. |
| **Status Q** | *Quarantine Status* | **Zon Kuarantin:** Baki barang siap yang dikunci sementara menunggu keputusan ujian keselamatan makmal / mikrobiologi. |
| **Status A** | *Accepted Status* | **Zon Lulus Jual:** Baki barang yang telah lulus pemeriksaan dan bebas untuk dihantar kepada pelanggan. |
| **Status R** | *Rejected Status* | **Zon Rosak / Reject:** Bahan atau botol yang rosak dan tidak boleh dijual sama sekali (perlu dibuat pelupusan/scrap). |
| **Preform** | *PET Preform* | Bahan plastik asas berbentuk tabung uji yang dipanaskan dan ditiup menjadi botol air mineral. |
| **Scrap / Reject** | *Wastage / Scrap* | Jumlah bahan yang rosak semasa proses peniupan, pengisian air, penutupan penutup, atau pembungkusan kotak. |
| **FG** | *Finished Goods* | **Barang Siap:** Produk akhir yang telah lengkap dibungkus dan bersedia untuk dijual (cth: Kotak Karton 425ml x 24). |
| **RM** | *Raw Materials* | **Bahan Mentah:** Komponen asas yang dibeli daripada pembekal luar sebelum diproses di kilang. |

---

> [!NOTE]
> **Khidmat Sokongan Teknikal & Meja Bantuan IT Dalaman**  
> Sekiranya anda mendepani sebarang isu teknikal pelayan atau ralat sistem yang tidak dapat diselesaikan melalui panduan di atas, sila hubungi meja bantuan **Pasukan IT BubblesO2** dengan menyertakan tangkap layar (*screenshot*) berserta nombor rujukan dokumen berkaitan.  
> *Sistem ERP Sage X3 V12 — Standard Operating Procedure (ERPMAN) | Dokumen Dalaman Rasmi Syarikat BubblesO2*
