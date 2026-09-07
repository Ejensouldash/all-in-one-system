# BUBBLESO2 ALL-IN-ONE (AIO) SYSTEM
## MANUAL OPERASI SALES ORDERING, AI INTAKE, KAWALAN KREDIT KEWANGAN & TADBIR URUS PANGKALAN DATA
**Standard Operating Procedure (SOP) & Panduan Teknikal Operasi Komersial Jualan**

---

### MAKLUMAT DOKUMEN & PENGESAHAN KORPORAT
* **Tajuk Dokumen:** BubblesO2 All-In-One (AIO) System — Manual Operasi Sales Ordering, AI Intake, Kawalan Kredit Kewangan & Tadbir Urus Pangkalan Data (Sales Ordering, AI Intake, Credit Check & Database Manager Master Manual)
* **Pengguna / Pemilik Modul:** Muhammad Iskandar Zulkarnain Bin Zulkifli
* **Jabatan Bertanggungjawab:** Bahagian Teknologi Maklumat (IT), Jabatan Operasi Jualan (Sales Operations / SOD), Bahagian Pembangunan Perniagaan (Business Development / BD), dan Jabatan Kewangan & Kawalan Kredit (Finance & Credit Control)
* **Tarikh Penerbitan:** September 2026
* **Versi Dokumen:** 1.0 (Keluaran Rasmi Kilang Rantau, Sendayan & Ibu Pejabat)
* **Klasifikasi:** Dokumen Sulit Dalaman Syarikat (Strictly Confidential / Internal Use Only)

| Disediakan Oleh (Prepared By): | Disahkan Oleh (Approved By): |
| :--- | :--- |
| **Muhammad Iskandar Zulkarnain Bin Zulkifli** | **Abdul Aziz Arifin** |
| System Developer, | Pengurus (Manager), |
| Bahagian Teknologi Maklumat, | Bahagian Teknologi Maklumat, |
| BubblesO2 Sdn Bhd | BubblesO2 Sdn Bhd |

---

## 1.0 PENGENALAN & SENI BINA EKOSISTEM SALES ORDERING

Modul **Sales Ordering & Order Fulfillment** dalam sistem **BubblesO2 All-In-One (AIO)** merupakan gerbang komersial utama syarikat yang menghubungkan pesanan belian pelanggan (*Customer Purchase Order*) dengan operasi kewangan (*Finance Credit Control*) dan logistik pemenuhan pesanan kilang (*Sales Order Execution*).

Sebelum pengenalan ekosistem digital bersepadu ini, kitaran pesanan pelanggan berhadapan dengan pelbagai kekangan operasi yang kritikal:
1. **Pemasukan Data Manual yang Perlahan & Terdedah Ralat:** Staf jualan (SOD/BD) terpaksa menaip semula beratus-ratus baris produk daripada imbasan PDF atau faks pesanan pelanggan, menyebabkan kelewatan penjanaan draf pesanan.
2. **Kelepasan Pesanan Tanpa Kawalan Kredit Tepat:** Pesanan sering dilepaskan kepada pelanggan yang mempunyai tunggakan hutang lampau melepasi tempoh matang (*overdue*) atau melebihi had kredit (*credit limit breach*) kerana ketiadaan semakan automatik terhadap Penyata Akaun (*Statement of Account - SOA*).
3. **Penyelarasan Lejar Terputus (*Siloed Accounting Records*):** Ketiadaan rekod audit yang menghubungkan dokumen PO asal dengan lejar invois menyebabkan pertikaian tuntutan bayaran antara pelanggan dan jabatan kewangan.

Platform AIO mengatasi cabaran ini melalui gabungan **Kecerdasan Buatan (Google Gemini Vision)** untuk pembacaan dokumen pintar (*AI Intake*), **Enjin Peraturan Kewangan ACCA (PO-SOA Decision Engine V3)** untuk semakan pendedahan kredit masa nyata, pengurusan direktori pelanggan bersepadu (*Customer Master & Google Form Onboarding*), serta instrumen tadbir urus pangkalan data berprofil tinggi (*Database Manager & Purge Tool*) khas untuk Superadmin.

### 1.1 Peta Navigasi & Matriks Kebenaran Capaian Modul (RBAC)

Akses kepada sub-modul Sales Ordering dikawal ketat melalui modul kebenaran berasaskan peranan (*Role-Based Access Control - RBAC*):

| Modul / Tab Navigasi | Laluan URL Sistem | Peranan & Kumpulan Akses | Fungsi Utama Modul |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `/forms/sales-ordering` | BD, SOD, Finance, Superadmin | Hub pemantauan sepintas lalu metrik intake, semakan amaran PO ditolak, dan carta perkembangan pesanan. |
| **PO Customer** | `/forms/sales-ordering/po-customer` | BD, SOD, Finance, Superadmin | Konsol penjejakan pesanan mengikut status kelulusan SOA, pecahan Multi-PO, dan pratinjau PDF dwi-varian (Internal/External). |
| **AI Intake** | `/forms/sales-ordering/intake` | BD, SOD, IT Admin, Superadmin | Pusat muat naik fail PO pelanggan (PDF/imej), enjin pengekstrakan AI, pembetulan baris pesanan, dan padanan pelanggan. |
| **PO-SOA Credit Check** | `/forms/sales-ordering/credit-check` | SOD, Finance Executive, Superadmin | Enjin verifikasi silang antara PO dan Penyata Akaun (SOA), pengiraan umur hutang (*aging*), dan kuadran keputusan kredit. |
| **Sales Orders** | `/forms/sales-ordering/orders` | SOD, Logistik, Warehouse, Superadmin | Direktori draf komersial pesanan jualan rasmi syarikat (`SO-YYYYMM-XXXX`) dan pengeksportan laporan Excel. |
| **Customer Master** | `/forms/sales-ordering/customers` | BD Manager, SOD, Superadmin | Pengkalan data induk pelanggan sah, pengelasan kategori, zon agihan, terma kredit, dan import fail induk. |
| **Permohonan Pelanggan** | `/forms/sales-ordering/customers` *(Tab)* | BD Team, Legal, Superadmin | Semakan borang pendaftaran pelanggan baharu daripada Google Form, pengesahan dokumen SSM/Penyata Bank, dan kelulusan akaun. |
| **Database Manager** | `/forms/sales-ordering/database` | Superadmin Eksklusif | Instrumen pembersihan data lejar ujian, pemadaman rekod *Pending SOA*, dan *Reset to Zero State*. |

---

## 2.0 DASHBOARD EKSEKUTIF SALES ORDERING & HUB PEMANTAUAN

Laman utama di laluan `/forms/sales-ordering` bertindak sebagai bilik kawalan operasi (*Command Center*) yang merumuskan aktiviti jualan dan status kelulusan kredit syarikat secara langsung dari pangkalan data Prisma ORM.

### 2.1 Komponen & Petunjuk Prestasi Utama (KPI Metric Cards)
Dashboard memaparkan 4 kad metrik utama bagi membolehkan pihak pengurusan membuat penilaian pantas:
* **Customer Master:** Jumlah keseluruhan akaun pelanggan aktif yang berdaftar secara sah dalam pangkalan data.
* **Needs Review:** Bilangan dokumen intake yang baru dimuat naik dan sedang menunggu semakan manual daripada staf jualan (SOD/BD) untuk pengesahan baris item atau padanan pelanggan.
* **Approved SOA (Pass):** Bilangan kes pesanan pelanggan yang telah melepasi semua syarat semakan kewangan dan sedia untuk penjanaan Sales Order rasmi kilang.
* **Rejected POs (Alert):** Bilangan pesanan belian yang telah disekat oleh sistem akibat rekod invois tertunggak (*strictly overdue*) atau pelanggaran had kredit.

### 2.2 Jalur Amaran Penolakan Pesanan (Collapsible Rejection Alert Banner)
Bagi melindungi syarikat daripada risiko penghantaran kepada akaun berisiko tinggi, sistem menyediakan jalur amaran interaktif berwarna merah jambu (*Rose Tone*) di bahagian atas dashboard sekiranya terdapat rekod yang ditolak:
1. **Ringkasan Amaran:** Memaparkan bilangan kes `REJECT` secara ketara beserta arahan tindakan untuk memaklumkan kepada pelanggan.
2. **Paparan Terperinci (Accordion):** Staf boleh membuka senarai penuh untuk melihat nombor PO, nama pelanggan, serta sebab utama penolakan (contoh: *"Tunggakan hutang melepasi terma kredit 30 hari"* atau *"Pajanan melebihi had kredit RM 50,000"*).
3. **Tindakan Susulan Segera:** Staf BD boleh segera menghubungi pelanggan bagi menuntut pembayaran invois lama sebelum pesanan baharu dibenarkan untuk diproses.

### 2.3 Carta Kemajuan Pemenuhan Pesanan (Order Progress Chart)
Komponen `OrderProgressChart` menvisualisasikan corong pemenuhan pesanan (*Order Fulfillment Funnel*) dari saat dokumen pertama kali dimuat naik sehingga pesanan selesai dijana ke tahap `SalesOrder`.

---

## 3.0 AI DOCUMENT INTAKE & PENGESTRAKAN PINTAR DOKUMEN PO

Modul AI Document Intake di laluan `/forms/sales-ordering/intake` menggunakan model pembelajaran mesin multimodal terkini (Google Gemini Vision API) bagi mengekstrak maklumat daripada pelbagai format dokumen pesanan pelanggan (PDF digital, imbasan pengimbas dokumen, mahupun foto dokumen fizikal).

### 3.1 Aliran Kerja Muat Naik Dokumen
1. Staf jualan atau BD membuka menu `AI Intake`.
2. Pengguna memuat naik fail PDF pesanan pelanggan melalui komponen seret-dan-lepas (*drag-and-drop uploader*).
3. Fail disimpan dengan selamat di storan awan Cloudflare R2 dengan penjanaan kunci unik berformat `sales-ordering-intakes/{timestamp}-{filename}`.
4. Sistem memulakan tugas latar belakang (*server-side pipeline*) yang menghantar dokumen kepada model AI dengan arahan prompt kewangan berstruktur tinggi.

```
+-------------------------------------------------------------------------------------------------------+
| FLOWCHART 1: ALIRAN AI DOCUMENT INTAKE & PENGESTRAKAN PINTAR                                          |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [ 1. Terima PO ]  ---> [ 2. Muat Naik PDF ]---> [ 3. Enjin Gemini AI ]---> [ 4. Pengesanan Format ]  |
|   Pelanggan hantar      Staf heret fail PO        Fail dihantar bersama     AI kenal pasti format PO  |
|   pesanan (PDF/Scan)    ke AI Intake Uploader     system prompt kewangan    Tunggal vs Multi-PO Batch |
|           |                                                                           |               |
|           v                                                                           v               |
|  [ 8. Sedia SOA ]  <--- [ 7. Forward Credit]<--- [ 6. Semak & Padan ] <--- [ 5. Hasil JSON Ekstrak ] |
|   Kes didaftarkan ke    Tekan butang 'Forward     Staf sahkan harga, qty    Data berstruktur disimpan:|
|   Pending SOA Check     to PO-SOA Check'          & padan Customer Master   header, baris item, total |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

### 3.2 Pengesanan Automatik Multi-PO Batch (Giant PO)
Pelanggan rangkaian pasar raya besar (seperti TF Value-Mart, Lotus's, Giant, AEON Big) kebiasaannya mengeluarkan satu fail PDF gergasi yang mengandungi puluhan pesanan belian berasingan bagi cawangan-cawangan outlet mereka.
* **Keupayaan Enjin AI V3:** Enjin AI AIO berupaya membaca struktur fail PDF berhalaman panjang, memisahkan setiap pesanan individu ke dalam array `subPos`, dan menjumlahkan nilai keseluruhan ke dalam `grandTotal`.
* **Integriti Data:** Setiap cawangan outlet mengekalkan nombor PO cawangan asal, tarikh penghantaran khusus, dan kuantiti karton produk tertentu tanpa berlaku pertindihan baris (*duplicate cross-referencing*).

---

## 4.0 SEMAKAN INTAKE, PENYELARASAN BARIS & PADANAN PELANGGAN

Setelah fail selesai diproses oleh AI, dokumen akan diletakkan di bawah status `NEEDS_REVIEW` pada laluan `/forms/sales-ordering/intake/[id]`.

### 4.1 Medan Header & Identiti Pelanggan
Antaramuka semakan membahagikan maklumat kepada seksyen yang tersusun:
* **Padanan Customer Master:** Kotak carian pantas pelanggan membolehkan pengguna memadankan nama pelanggan yang diekstrak dengan akaun sah di Customer Master. Sistem mencadangkan padanan berdasarkan kod pelanggan, nama dagangan (*trading name*), dan zon pengedaran.
* **Maklumat Rujukan Pesanan:**
  - **No. PO Pelanggan (*Customer PO Number*):** Nombor rujukan rasmi pembeli.
  - **Tarikh Dokumen (*PO Document Date*):** Tarikh pesanan dikeluarkan (format standard `YYYY-MM-DD`).
  - **Alamat Penghantaran (*Delivery Address*):** Lokasi tapak atau gudang pelanggan untuk penghantaran stok.
  - **Terma Bayaran Asal (*Payment Terms Raw*):** Maklumat kredit pada PO (contoh: "30 Hari", "Tunai", "COD").

### 4.2 Grid Baris Pesanan (Line Items Editor)
Setiap baris produk yang diekstrak dipaparkan dalam jadual interaktif yang membenarkan pengubahsuaian segera:
* **Kod Barangan / SKU:** Pemilihan SKU produk BubblesO2 (contoh: `B350-S` untuk 350ml Semulajadi, `B500-D` untuk 500ml Berkarbonat).
* **Keterangan Produk (*Description*):** Nama rasmi produk seperti yang tertera pada pesanan.
* **Kuantiti & Unit Ukuran (Qty & UOM):** Bilangan karton (`CTN`) atau botol (`BTL`).
* **Harga Seunit (Unit Price):** Harga bersih seunit dalam Ringgit Malaysia (RM).
* **Diskaun & Cukai:** Potongan harga promosi atau cukai jualan jika berkaitan.
* **Jumlah Garisan (*Line Total*):** Dikira secara automatik: `(Kuantiti × Harga) - Diskaun + Cukai`.

### 4.3 Aliran Hantar ke Semakan Kredit (Forward to Credit Check)
Setelah staf berpuas hati dengan ketepatan data:
1. Pengguna menekan butang **Simpan Semakan (Save Review)** untuk mengunci data dokumen.
2. Pengguna menekan butang **Forward to PO-SOA Check**.
3. Sistem mencipta rekod baharu dalam jadual `CreditCheckCase` dengan status permulaan `PENDING_SOA` dan mengalihkan pengguna terus ke konsol kawalan kredit.

---

## 5.0 PENGURUSAN PO CUSTOMER & PENJEJAKAN STATUS PESANAN

Halaman `/forms/sales-ordering/po-customer` bertindak sebagai arkib dan konsol penjejakan bagi semua pesanan pelanggan merentasi pelbagai fasa pemprosesan.

### 5.1 Tab Pembahagian Status Pesanan
* **Approved SOA:** Menyenaraikan semua pesanan yang telah disahkan bebas daripada sebarang halangan kewangan atau telah menerima kelulusan pelepasan khas (*Finance Override*).
* **Pending SOA:** Menyenaraikan pesanan yang masih menunggu muat naik Penyata Akaun (SOA) oleh pihak kewangan atau sedang ditahan untuk semakan lanjut (*ON_HOLD*).

### 5.2 Sokongan Dwi-Varian Cetakan PDF (Internal vs External Copy)
Bagi pesanan yang diterima melalui pendaftaran borang digital (*Google Form Webhook*), sistem menyediakan butang lungsur (*dropdown menu*) khas dengan dua varian dokumen PDF:
1. **Internal Copy (Salinan Dalaman):** Mengandungi jejak audit penuh, status kelulusan SOA, nama pegawai pemproses, log semakan kredit, dan sejarah perakaunan untuk kegunaan audit dalaman.
2. **External Copy (Salinan Rasmi Pelanggan):** Format komersial kemas tanpa maklumat audit sensitif syarikat, sesuai untuk dicetak atau dihantar kepada pelanggan sebagai pengesahan penerimaan pesanan rasmi.

---

## 6.0 PO-SOA CREDIT CHECK & ENJIN KEPUTUSAN KEWANGAN (V3)

Integriti kewangan BubblesO2 dipelihara melalui modul **PO-SOA Credit Check** di laluan `/forms/sales-ordering/credit-check`. Modul ini menguatkuasakan piawaian perakaunan bertauliah (ACCA) bagi memastikan tiada pesanan dibekalkan kepada pelanggan yang gagal menjelaskan hutang lapuk.

### 6.1 Pematuhan Ketat Peraturan Kredit Kewangan (AGENTS.md)
Sistem melaksanakan logik penilaian kredit mengikut ketetapan peraturan mandatori berikut:
1. **Tarikh Sauh Penilaian (*Evaluation Anchor Date*):** Status kelewatan bayaran (*overdue*) dan pengiraan umur hutang MESTI dinilai berbanding **Tarikh Penyata SOA (`soa.statementDate`)** atau tarikh penilaian semasa. Menilai umur hutang berbanding tarikh cipta PO sejarah adalah DILARANG SAMA SEKALI kerana ia boleh menyebabkan invois lapuk dalam lejar SOA tersalah tanda sebagai "Belum Matang".
2. **Toleransi Kelewatan Dinamik (*Dynamic Aging Tolerance*):** Invois hanya dianggap tertunggak tegar (*Strictly Overdue*) sekiranya:
   daysOverdue > creditTermDays
   Bagi pelanggan dengan terma kredit 30 hari, penangguhan bayaran sehingga 30 hari melepasi tarikh matang invois (jatuh dalam baldi umur 1 Bulan) diberi toleransi (*Tolerated Grace Period*) sebelum sistem mencadangkan sekatan kredit (*REJECT*).
3. **Pelanggaran Had Kredit (*Credit Limit Breach*):** Sekiranya *Credit Limit* dinyatakan, sebarang transaksi yang menyebabkan jumlah baki tertunggak unjuran (`outstandingAtPoDate + poAmount`) melebihi had kredit AKAN mencetuskan sekatan serta-merta (**REJECT / CREDIT HOLD**), tanpa mengira sama ada hutang sedia ada sudah overdue atau belum.
4. **Prinsip Pelunasan FIFO (*First-In, First-Out Knock-Off*):** Sebarang bayaran yang diterima di dalam SOA tanpa perincian invois khusus akan diperuntukkan secara automatik untuk melunaskan invois tertua terlebih dahulu.
5. **Akaun Baki Kredit / Prabayar (*Credit Advance Balance*):** Sekiranya baki penutup SOA pelanggan bernilai sifar atau negatif (contoh: `-RM 1,320.00`), sistem secara automatik menetapkan semua invois sebagai lunas (`PAID`) dan membenarkan pelepasan pesanan.

```
+-------------------------------------------------------------------------------------------------------+
| FLOWCHART 2: ALIRAN SEMAKAN KREDIT PO-SOA & KUADRAN KEPUTUSAN KEWANGAN                                |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [ 1. Muat Naik SOA ] ---> [ 2. Ekstrak AI ]   ---> [ 3. Sauh Tarikh SOA]---> [ 4. Semakan Lejar ]     |
|   Staf muat naik fail      Gemini baca baki,        Kira umur invois          Lunas invois secara     |
|   PDF Penyata Akaun        invois & aging lejar     guna soa.statementDate    FIFO atau baki kredit   |
|           |                                                                           |               |
|           v                                                                           v               |
|  [ 8. Luluskan SO ]  <--- [ 7. Keputusan ]     <--- [ 6. Semak Had Had ] <--- [ 5. Toleransi Umur ]   |
|   Pesanan dilepaskan      APPROVE / ON_HOLD /       Adakah pajanan melebihi   daysOverdue > creditTerm|
|   untuk Sales Order       REJECT (Perlu Ulasan)     Credit Limit syarikat?    Strictly Overdue?       |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

---

## 7.0 MATRIKS KEPUTUSAN KEWANGAN, OVERDUE & OVERRIDE WORKFLOW

Enjin keputusan (`decision-engine.ts`) menjalankan 5 semakan keselamatan kewangan terperinci bagi setiap permohonan pesanan:

### 7.1 Lima Semakan Utama (ACCA Decision Checks)

| Kod Semakan | Kategori Semakan | Kriteria Penilaian | Keterukan (*Severity*) |
| :--- | :--- | :--- | :--- |
| `CUSTOMER_MATCH` | Padanan Entiti Pelanggan | Membandingkan nama pembeli pada PO dengan nama akaun di SOA. | **PASS:** Padan tepat.<br>**HOLD:** Nama meragukan.<br>**REJECT:** Entiti berbeza. |
| `PO_AMOUNT_MATCH` | Pendedahan Nilai Pesanan | Memastikan nilai pesanan dibaca dengan yakin dan merekodkan jumlah pendedahan keseluruhan akaun. | **PASS:** Nilai disahkan.<br>**HOLD:** Amaun kabur. |
| `OVERDUE_BALANCE` | Semakan Tunggakan Lapuk | Menyemak sama ada terdapat baki invois yang berstatus *Strictly Overdue* (melebihi tempoh toleransi kredit). | **PASS:** Tiada overdue tegar.<br>**REJECT:** Terdapat invois tertunggak lapuk. |
| `CREDIT_LIMIT_BREACH` | Had Pendedahan Kredit | Mengira unjuran pajanan: `Baki Lejar + Nilai PO Baharu`. Sekiranya melebihi had kredit, pesanan disekat serta-merta. | **PASS:** Dalam had kredit.<br>**REJECT:** Melebihi had kredit. |
| `DATA_CONFIDENCE` | Keyakinan Data Dokumen | Memastikan tarikh dokumen, terma kredit, dan amaun penutup dibaca dengan skor keyakinan >= 75%. | **PASS:** Keyakinan tinggi.<br>**HOLD:** Maklumat kabur / perlu semakan manual. |

### 7.2 Analisis Umur Hutang (Aging Breakdown Table)
Status akaun pelanggan diringkaskan ke dalam 4 baldi utama:
* **Belum Matang (Current):** Invois yang masih berada dalam tempoh kredit sah atau baki kredit advance (nilai negatif).
* **1 - 30 Hari Overdue:** Invois yang melepasi tarikh matang antara 1 hingga 30 hari (diberi toleransi di bawah terma kredit 30 hari).
* **31 - 60 Hari Overdue:** Invois tertunggak antara 31 hingga 60 hari.
* **> 60 Hari Overdue:** Invois tertunggak tegar yang melebihi 60 hari (Mencetuskan sekatan mandatori).

### 7.3 Aliran Pelepasan Khas Kewangan (Finance Override Workflow)
Sekiranya sesuatu kes berstatus `ON_HOLD` atau `REJECTED`, pesanan TIDAK BOLEH dijana secara automatik. Walau bagaimanapun, pegawai kewangan yang diberi kuasa boleh membuat pelepasan pengecualian:
1. **Ulasan / Justifikasi Kewangan Mandatori:** Pegawai kewangan WAJIB memasukkan ulasan rasmi (contoh: *"Pelanggan telah membuat bayaran separuh melalui slip transaksi MBB12345 dan baki dijamin oleh Pengarah Urusan"*).
2. **Pautan Bukti Bayaran (*Evidence URL / Name*):** Pegawai boleh melampirkan resit bank atau surat perjanjian kredit.
3. **Pilihan Keputusan:**
   - **PROCEED / APPROVE_EXCEPTION:** Melepaskan pesanan untuk penjanaan Sales Order.
   - **REJECT:** Mengesahkan sekatan jualan dan mengarahkan staf BD menuntut bayaran daripada pelanggan.

---

## 8.0 SALES ORDERS & PENGURUSAN DRAF KOMERSIAL

Laluan `/forms/sales-ordering/orders` memaparkan semua pesanan jualan rasmi syarikat yang telah melepasi tapisan kawalan kredit.

```
+-------------------------------------------------------------------------------------------------------+
| FLOWCHART 3: ALIRAN PENJANAAN SALES ORDER & PEMENUHAN DOKUMEN                                         |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [ 1. Lulus Kredit ] ---> [ 2. Tekan 'Create SO']---> [ 3. Jana Nombor SO ]---> [ 4. Kunci Data ]     |
|   Pesanan berstatus        SOD buka kes dan tekan     Sistem jana no unik       Kunci harga seunit,   |
|   APPROVED / PROCEED       'Create Sales Order'       SO-YYYYMM-XXXX            diskaun & alamat hantar|
|           |                                                                           |               |
|           v                                                                           v               |
|  [ 8. Laporan Excel] <--- [ 7. Agihan Gudang ] <--- [ 6. Cetak Pesanan ]  <--- [ 5. Draf Komersial ]  |
|   Eksport transaksi        Logistik kilang sediakan   Cetak salinan rasmi       Dokumen TIDAK tolak   |
|   untuk semakan bulanan    produk mengikut DO         untuk penghantaran        stok inventori fizikal|
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

### 8.1 Format Penomboran & Integriti Draf Komersial
* **Penomboran Rasmi:** Setiap pesanan jualan diberikan nombor siri berurutan: `SO-YYYYMM-XXXX` (contoh: `SO-202609-0012`).
* **Prinsip Bebas Inventori (*Non-Stock Deducting Draft*):** Penjanaan Sales Order di bawah modul ini bertindak sebagai draf komersial dan perjanjian jualan sah. Rekod ini **TIDAK** memilih batch secara automatik dan **TIDAK** menolak stok inventori fizikal gudang sehingga dokumen pesanan agihan (*Distribution Order - DO*) rasmi dikeluarkan oleh Jabatan Gudang.
* **Eksport Excel Bersepadu:** Pegawai boleh memuat turun keseluruhan senarai pesanan jualan dalam format lembaran kerja Excel melalui endpoint `/api/sales-ordering/export/orders` untuk tujuan pelaporan kewangan bulanan.

---

## 9.0 DIREKTORI INDUK PELANGGAN (CUSTOMER MASTER)

Laluan `/forms/sales-ordering/customers` (Tab Customer Master) menyimpan direktori berpusat bagi semua pelanggan yang berurusan dengan BubblesO2.

### 9.1 Maklumat Profil Pelanggan
Setiap rekod pelanggan mengandungi atribut perniagaan yang lengkap:
* **Kod Pelanggan (*Customer Code*):** Kod pengenalan unik (contoh: `CUST-TF01`, `CUST-LOTUS02`).
* **Kod Sage ERP (*Sage Customer ID*):** Pautan integrasi kepada sistem perakaunan Sage X3 (contoh: `CL000429`).
* **Nama Berdaftar & Nama Dagangan (*Legal & Trading Name*):** Nama rasmi pendaftaran syarikat dan nama papan tanda premis.
* **Klasifikasi & Zon Pengedaran:** Kategori perniagaan (Pasar Raya, Pemborong, Runcit, HORECA) dan zon logistik (Lembah Klang, Pantai Timur, Utara, Selatan, Sabah/Sarawak).
* **Terma Kredit Lalai (*Default Credit Terms*):** Tempoh kredit standard yang dipersetujui semasa pendaftaran akaun (contoh: `30 DAYS`, `60 DAYS`, atau `CASH/COD`).
* **Alamat Pengebilan & Penghantaran:** Rekod alamat berdaftar untuk urusan invois dan tapak gudang serahan.

### 9.2 Pengimportan Fail Induk Pukal (Bulk Customer Import)
Pengguna yang mempunyai kebenaran `SALES_ORDERING_CUSTOMERS_MANAGE` boleh memuat naik fail hamparan elektronik (CSV/Excel) untuk mengemas kini atau menambah pelanggan baharu secara pukal tanpa perlu memasukkan rekod satu persatu.

---

## 10.0 PERMOHONAN PENDAFTARAN PELANGGAN BAHARU (CUSTOMER ONBOARDING)

Bagi memudahkan pendaftaran peruncit atau pengedar baharu, sistem menyediakan modul **Permohonan Pendaftaran Pelanggan** pada tab kedua di laluan `/forms/sales-ordering/customers`.

```
+-------------------------------------------------------------------------------------------------------+
| FLOWCHART 4: ALIRAN PENDAFTARAN PELANGGAN BAHARU & TADBIR URUS DATA SUPERADMIN                        |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [ 1. Google Form ]  ---> [ 2. Webhook AIO ]  ---> [ 3. Queue BD Semak ]---> [ 4. Iframe Drive ]     |
|   Pelanggan isi borang     Data & pautan fail       Borang masuk ke status    Pegawai semak sijil SSM |
|   pendaftaran atas talian  ditolak ke pangkalan     PENDING di AIO            & bank di Google Drive  |
|           |                                                                           |               |
|           v                                                                           v               |
|  [ 8. Zero State ]   <--- [ 7. Superadmin Purge]<--- [ 6. Luluskan Akaun ]<--- [ 5. Verifikasi BD ]   |
|   Sistem sedia diuji       Superadmin padam data    Cipta Customer Code       Pegawai tentukan had    |
|   semula dari kosong       ujian dengan Purge Tool  automatik ke Master       kredit & zon pelanggan  |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

### 10.1 Aliran Kerja Pendaftaran Digital
1. **Penyerahan Maklumat Pelanggan:** Pelanggan mengisi borang pendaftaran digital melalui Google Form rasmi syarikat, termasuk memuat naik salinan sijil SSM (Borang 9, 24, 49), Penyata Bank 3 Bulan, dan Borang Cukai SST.
2. **Integrasi Webhook:** Data dihantar terus ke pangkalan data AIO dan didaftarkan dengan nombor permohonan berformat `REG-YYYYMM-XXXX`.
3. **Pemeriksaan Dokumen Sokongan (Google Drive Embedded Viewer):** Pegawai BD menekan butang *Semak & View Dokumen*. Tetingkap modal interaktif memaparkan dokumen sokongan pelanggan secara langsung melalui komponen pratonton Google Drive terbenam tanpa memerlukan muat turun ke komputer peribadi staf.
4. **Keputusan Pelulusan:**
   - **Lulus (*Approve*):** Sistem secara automatik mencipta profil pelanggan baharu dalam Customer Master dengan status `READY`.
   - **Tolak (*Reject*):** Pegawai WAJIB memasukkan sebab penolakan (contoh: *"Sijil SSM luput tarikh"* atau *"Penyata bank tidak lengkap"*).

---

## 11.0 DATABASE MANAGER & PURGE TOOL (SUPERADMIN EXCLUSIVE)

Alat pengurusan pangkalan data di laluan `/forms/sales-ordering/database` merupakan instrumen pentadbiran aras tinggi yang direka khas untuk pengguna **SUPERADMIN** sahaja.

### 11.1 Objektif & Kawalan Keselamatan
Dalam fasa latihan pengguna, penyesuaian sistem, dan simulasi audit, banyak rekod ujian dimasukkan ke dalam pangkalan data. Alat ini membolehkan Superadmin membersihkan data ujian dengan selamat tanpa memerlukan capaian terus ke terminal pelayan pangkalan data PostgreSQL.
* **Sekatan Akses Ketat:** Pengguna biasa atau staf yang cuba mengakses laluan ini akan dihalang serta-merta dan dialihkan semula ke dashboard utama.
* **Tetingkap Pengesahan Berganda (*Double Confirmation Prompt*):** Setiap tindakan pemadaman memaparkan dialog amaran yang menyatakan dengan tepat bilangan rekod yang bakal dipadamkan.

### 11.2 Empat Operasi Pembersihan Data (Purge Operations)

| Operasi Pembersihan | Skop Rekod yang Dilibatkan | Kesan Terhadap Pangkalan Data | Senario Penggunaan |
| :--- | :--- | :--- | :--- |
| **Padam Rekod Pending SOA** | Jadual `CreditCheckCase` berstatus `PENDING_SOA` atau yang belum dimuat naik fail SOA. | Memadam rekod ujian semakan yang tidak selesai. Rekod yang sudah diluluskan (`APPROVED`) atau ditolak (`REJECTED`) dikekalkan. | Membersihkan kes-kes ujian harian yang terbiar tanpa menjejaskan sejarah audit pesanan sebenar. |
| **Reset All (Zero State)** | Semua rekod dalam jadual `CreditCheckCase` dan `SalesDocumentIntake`. | Mengosongkan keseluruhan transaksi semakan kredit dan fail muat naik intake. Pangkalan data kembali kepada status kosong (*Zero State*). | Digunakan sebelum permulaan fasa pengujian sistem end-to-end yang baharu atau latihan pengguna berskala besar. |
| **Padam Semua PO-SOA Check** | Semua rekod dalam jadual `CreditCheckCase` sahaja. | Memadam keseluruhan sejarah kelulusan kewangan tanpa memadam fail asal dokumen intake yang dimuat naik oleh staf BD. | Digunakan apabila peraturan kredit dikemas kini dan pengguna ingin menilai semula dokumen PO yang sedia ada. |
| **Padam Semua Fail Intake** | Semua rekod dalam jadual `SalesDocumentIntake` sahaja. | Memadam senarai muat naik dokumen daripada staf jualan. | Membersihkan arkib fail muat naik yang telah luput atau fail imbasan yang salah format. |

---

## 12.0 PANDUAN PENYELESAIAN MASALAH (TROUBLESHOOTING) & GLOSARI

### 12.1 Panduan Penyelesaian Masalah Lazim

| Masalah yang Dihadapi | Punca Utama | Tindakan Pembetulan |
| :--- | :--- | :--- |
| **Fail PDF PO gagal diekstrak oleh AI.** | Kualiti imbasan fail terlalu kabur, resolusi di bawah 150 DPI, atau fail dilindungi kata laluan. | Minta pelanggan menghantar fail PDF digital asal atau muat naik semula dengan menekan butang *Reprocess AI* di halaman semakan intake. |
| **Multi-PO hanya membaca satu pesanan sahaja.** | Susun atur fail PDF menggunakan format bukan standard yang mengelirukan penanda cawangan. | Buka antaramuka semakan `/intake/[id]`, klik butang *Reprocess AI* untuk mengaktifkan parser enjin V3, atau masukkan baris cawangan secara manual. |
| **Sistem mencadangkan REJECT walaupun invois baru lewat 10 hari.** | Terma kredit pelanggan di SOA disetkan sebagai `CASH` atau `0 DAYS` (tiada tempoh penangguhan). | Semak medan `paymentTermsRaw`. Sekiranya pelanggan berhak menerima kredit 30 hari, muat naik SOA yang dikemas kini atau gunakan pelepasan *Finance Override*. |
| **Butang 'Create Sales Order' tidak kelihatan.** | Kes kredit masih berstatus `ON_HOLD` atau `REJECTED`, atau pengguna tidak mempunyai modul `SALES_ORDERING_ORDERS`. | Selesaikan semakan kewangan terlebih dahulu. Pastikan pengguna diberikan kebenaran modul pesanan oleh pentadbir IT. |
| **Ralat kebenaran ketika membuka Database Manager.** | Pengguna bukan bertaraf `SUPERADMIN` dalam sesi pengesyoran NextAuth. | Hanya Superadmin sah yang dibenarkan. Pengguna perlu menghubungi Pengurus IT sekiranya memerlukan pembersihan rekod ujian. |

### 12.2 Glosari Istilah Komersial & Kewangan
* **AI Document Intake:** Proses pembacaan dan pengecaman data berstruktur daripada dokumen tidak berstruktur secara automatik menggunakan model AI.
* **Customer Master:** Pangkalan data pusat yang menyimpan maklumat sah entiti pelanggan syarikat.
* **Statement of Account (SOA):** Penyata rasmi perakaunan yang dikeluarkan oleh pembekal kepada pelanggan bagi memperincikan senarai invois, bayaran, dan baki tertunggak lejar.
* **Strictly Overdue:** Keadaan di mana tempoh kelewatan pembayaran sesuatu invois telah melebihi had kredit dan tempoh toleransi penangguhan yang dibenarkan oleh syarikat.
* **Credit Limit Breach:** Keadaan di mana jumlah pendedahan liabiliti hutang pelanggan melebihi had kredit maksimum yang diluluskan oleh pihak pengurusan kewangan.
* **Non-Stock Deducting Draft:** Dokumen draf komersial sah yang tidak melakukan potongan automatik terhadap baki fizikal inventori di gudang.
* **Zero State Reset:** Tindakan mengembalikan pangkalan data ujian kepada keadaan bersih permulaan tanpa sebarang rekod transaksi lampau.
