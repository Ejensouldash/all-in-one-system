# BUBBLESO2 ALL-IN-ONE (AIO) SYSTEM
## MANUAL OPERASI PEMBUATAN, PENGELUARAN & KAWALAN KUALITI (MANUFACTURING MASTER MANUAL)
**Standard Operating Procedure (SOP) & Panduan Teknikal Operasi Kilang**

---

### MAKLUMAT DOKUMEN & PENGESAHAN KORPORAT
* **Tajuk Dokumen:** BubblesO2 All-In-One (AIO) System — Manual Operasi Pembuatan, Pengeluaran & Kawalan Kualiti (Manufacturing Master Manual)
* **Pengguna / Pemilik Modul:** Muhammad Iskandar Zulkarnain Bin Zulkifli
* **Jabatan Bertanggungjawab:** Bahagian Teknologi Maklumat (IT) & Jabatan Pembuatan / Pengeluaran (Manufacturing)
* **Tarikh Penerbitan:** September 2026
* **Versi Dokumen:** 1.0 (Keluaran Rasmi Kilang Rantau & Sendayan)
* **Klasifikasi:** Dokumen Sulit Dalaman Syarikat (Strictly Confidential / Internal Use Only)

| Disediakan Oleh (Prepared By): | Disahkan Oleh (Approved By): |
| :--- | :--- |
| **Muhammad Iskandar Zulkarnain Bin Zulkifli** | **Abdul Aziz Arifin** |
| System Developer, | Pengurus (Manager), |
| Bahagian Teknologi Maklumat, | Bahagian Teknologi Maklumat, |
| BubblesO2 Sdn Bhd | BubblesO2 Sdn Bhd |

---

## 1.0 PENGENALAN & GAMBARAN KESELURUHAN OPERASI PEMBUATAN

Sistem **BubblesO2 All-In-One (AIO)** dibangunkan khusus untuk menyatukan keseluruhan operasi di lantai kilang (*shopfloor*) ke dalam satu platform digital yang pantas, mudah diguna, dan telus. Sebelum sistem ini diperkenalkan, kebanyakan catatan pengeluaran, borang pemeriksaan kualiti GMP, dan pergerakan stok bahan mentah direkod secara manual di atas kertas. Ini sering kali menyebabkan kelewatan maklumat, rekod tercicir, dan kekeliruan baki stok antara syif.

Platform AIO bertindak sebagai penghubung pintar antara operasi harian kilang dengan pengurusan atasan:
1. **Pengeluaran Pantas Tanpa Kertas (*Paperless Shopfloor*):** Semua laporan syif, penerimaan bahan mentah, dan semakan kualiti diisi terus menggunakan tablet atau telefon pintar di lantai kilang.
2. **Keseimbangan Bahan Waktu Nyata (*Real-Time Material Balancing*):** Mengira secara automatik baki bahan mentah (preform botol, penutup cap, kotak karton, dan label) dari satu syif ke syif seterusnya (*Carry Forward*).
3. **Kebolehkesanan Penuh (*End-to-End Batch Traceability*):** Setiap kelompok produk boleh dijejaki asal-usulnya melalui nombor batch KBP dan imbasan kod QR pantas.
4. **Pematuhan Piawaian Keselamatan Makanan (GMP / HACCP):** Menyediakan borang semakan piawai kebersihan, kawalan perosak, rekod pecah kaca/plastik, serta sokongan tandatangan digital bagi setiap kelulusan rasmi.

---

## 2.0 MODUL PENGELUARAN (PRODUCTION) & ALIRAN DAILY KAR

Modul Pengeluaran adalah jantung kepada operasi harian kilang pemprosesan air mineral semula jadi beroksigen BubblesO2. Di sini, penyelia barisan (*Line Leader*) dan operator merekodkan pencapaian pengeluaran sebenar setiap syif melalui borang **Daily KAR (Daily Production Report)**.

### 2.1 Konfigurasi Barisan Pengeluaran (Production Lines & SKU)
Kilang BubblesO2 beroperasi mengikut dua barisan utama dengan pembungkusan standard:

| Barisan Pengeluaran | Kod Produk (SKU) | Nama Pembungkusan | Kuantiti se-Kotak (Pcs/Box) |
| :--- | :--- | :--- | :--- |
| **Line 1 - 800ml** | `p800_12` | 800 ml x 12 Botol | 12 pcs |
| **Line 1 - 800ml** | `p800_20` | 800 ml x 20 Botol | 20 pcs |
| **Line 2 - 425ml** | `p425_24` | 425 ml x 24 Botol | 24 pcs |
| **Line 2 - 425ml** | `p425_6` | 425 ml x 6 Botol | 6 pcs |

### 2.2 Kitaran Hayat Status Laporan (Report Lifecycle)
Setiap laporan pengeluaran melalui tiga peringkat status yang ketat:
* **DRAFT:** Laporan sedang diisi oleh operator. Sistem menyimpan draf secara automatik ke dalam *local storage* penyemak imbas (*browser*) setiap saat bagi mengelakkan kehilangan data sekiranya talian internet terputus.
* **SUBMITTED:** Laporan telah lengkap diisi, ditandatangani secara digital oleh penyelia barisan, dan diserahkan ke dalam pangkalan data pusat.
* **APPROVED:** Laporan telah disemak dan diluluskan secara rasmi oleh Pengurus Kilang / HOD. Baki stok bahan mentah akan dikunci dan dibawa ke syif berikutnya secara automatik.

```
+-------------------------------------------------------------------------------------------------------+
| FLOWCHART 1: KITARAN HAYAT LAPORAN HARIAN PENGELUARAN (DAILY KAR / DPR)                              |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [ 1. Buka Borang ] ---> [ 2. Tarik Data DO ] ---> [ 3. Semak Baki Stor ] ---> [ 4. Isi Output & ]  |
|   Pilih Tarikh, Syif      Sistem import DO          Baki 'Carry Forward'        Agihan Batch mengikut |
|   & Line (800 / 425)      'Transfer In' hari ini    syif terdahulu dimuat       SKU kotak karton      |
|           |                                                                             |             |
|           v                                                                             v             |
|  [ 8. Lulus & Kunci ] <-- [ 7. Hantar Laporan ] <-- [ 6. Turun Tandatangan ] <-- [ 5. Log Reject & ] |
|   HOD semak & klik         Data dimuat naik ke       Penyelia syif tandatangan   Rekod rosak (scrap/   |
|   APPROVE (Baki Carry      pangkalan data pusat      digital pada skrin          return) & masa henti  |
|   Forward diaktifkan)      secara rasmi              tablet                      (downtime mesin)      |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

---

## 3.0 LOGIK SISTEM & FORMULA MATEMATIK PENGELUARAN

Sistem AIO menggunakan formula matematik terbina dalam untuk memastikan ketepatan kuantiti bahan mentah, mengira kadar reject, dan mengelakkan kesilapan manusia (*human calculation error*).

### 3.1 Formula Penukaran Berat Penutup Botol (Cap Conversion Formula)
Penutup botol (Cap) biasanya dikeluarkan daripada kotak secara timbangan berat kasar di atas penimbang digital kilang. Sistem menukarkan berat penutup dalam kilogram (kg) kepada bilangan biji (*pieces*) dan kotak setara secara automatik.

* **Pemalar Piawai Sistem (System Constants):**
  * Kuantiti 1 Kotak Penuh: $4,000\text{ pcs}$
  * Berat Kotak Kosong (Tare Weight): $0.88\text{ kg}$
  * Anggaran Berat 1 Biji Penutup: $0.002125\text{ kg}\ (2.125\text{ gram})$

$$\text{Berat Bersih (Net Weight)} = \text{Berat Kasar (Gross Weight)} - (\text{Bilangan Kotak} \times 0.88\text{ kg})$$
$$\text{Kuantiti Biji (Pcs)} = \text{round}\left(\frac{\text{Berat Bersih}}{0.002125}\right)$$
$$\text{Kuantiti Setara Kotak / Bag} = \frac{\text{Kuantiti Pcs}}{4000}$$

> **CONTOH PENGIRAAN NYATA 1 (Worked Example):**
> * Operator menimbang 2 kotak penutup yang separa digunakan. Berat kasar atas penimbang ialah **18.50 kg**.
> * **Langkah 1 (Tolak berat kotak kosong):**
>   $$\text{Berat Bersih} = 18.50 - (2 \times 0.88) = 18.50 - 1.76 = 16.74\text{ kg}$$
> * **Langkah 2 (Kira bilangan biji penutup):**
>   $$\text{Kuantiti Penutup} = \frac{16.74}{0.002125} = 7,877.6 \approx 7,878\text{ pcs}$$
> * **Langkah 3 (Kira kuantiti setara kotak):**
>   $$\text{Nilai Kotak} = \frac{7878}{4000} \approx 1.97\text{ kotak}$$
> * Sistem memaparkan nilai **7,878 pcs (1.97 Kotak)** secara langsung pada borang!

---

### 3.2 Formula Imbangan Inventori & Baki Bawa Ke Hadapan (Storeroom Carry Forward)
Untuk mengelakkan bahan mentah hilang atau terlebih kira antara syif pagi (AM) dan malam (PM), sistem mengira baki akhir stok mengikut formula aliran:

$$\text{Jumlah Tersedia (Total Bags)} = \text{Terima DO Hari Ini (Transfer In)} + \text{Baki Stor Sedia Ada (Carry Fwd)}$$
$$\text{Jumlah Digunakan (Used Bags)} = \text{Penggunaan Sebelum (Before)} + \text{Penggunaan Semasa (After)}$$
$$\text{Baki Bawa Ke Hadapan (Carry Forward)} = \text{Jumlah Tersedia} - \text{Jumlah Digunakan}$$

* **Kadar Multiplier Setiap Kategori Bahan Mentah:**
  * Preform Botol 800ml: $225\text{ pcs/bag}$
  * Preform Botol 425ml: $181\text{ pcs/bag}$ (atau $162\text{ pcs/bag}$ bagi pek khas)
  * Penutup Botol (Cap): $4,000\text{ pcs/kotak}$
  * Kotak Karton (Box): $1\text{ pc/kotak}$
  * Carton Cap: $15\text{ pcs/bundle}$
  * Wrapping Film Mesin: $1\text{ gulung}$
  * Pita Pelekat (OPP Tape): $96\text{ gulung/kotak}$

> **CONTOH PENGIRAAN NYATA 2 (Worked Example):**
> * Bahagian Botol Line 1 (800ml):
>   * Baki bawa dari syif malam semalam: **12 bag** ($12 \times 225 = 2,700\text{ pcs}$).
>   * Terima Delivery Order (DO) baharu hari ini: **40 bag** ($40 \times 225 = 9,000\text{ pcs}$).
>   * Jumlah Tersedia di Lantai Kilang: $12 + 40 = 52\text{ bag}\ (11,700\text{ pcs})$.
>   * Penggunaan direkod semasa syif pagi: **35 bag** ($35 \times 225 = 7,875\text{ pcs}$).
>   * Baki Bawa Ke Hadapan untuk syif malam:
>     $$\text{Baki Carry Forward} = 52 - 35 = 17\text{ bag}\ (3,825\text{ pcs})$$
> * Apabila syif malam membuka borang, nilai **17 bag** akan sedia terpapar tanpa perlu ditaip semula!

---

### 3.3 Formula Kadar Reject (%) & Kecekapan Pengeluaran
Setiap keping botol, penutup, label, atau kotak yang rosak wajib direkodkan mengikut kategori **Scrap** (musnah terus) atau **Return** (pulang ke pembekal/stor), dan masa berlakunya (**Before** - sebelum jalan mesin, **After** - semasa jalan).

$$\text{Kadar Reject Kategori (\%)} = \frac{\text{Jumlah Reject (Before + After)}}{\text{Kuantiti Penggunaan} + \text{Jumlah Reject}} \times 100$$
$$\text{Kadar Reject Keseluruhan Kilang (\%)} = \frac{\text{Jumlah Keseluruhan Reject}}{\text{Jumlah Keseluruhan Penggunaan} + \text{Jumlah Keseluruhan Reject}} \times 100$$

> **CONTOH PENGIRAAN NYATA 3 (Worked Example):**
> * Pengeluaran Botol 425ml:
>   * Penggunaan botol sempurna: **18,100 pcs** (100 bag).
>   * Botol kemik/rosak sebelum jalan (Before): **50 pcs**.
>   * Botol sangkut/bocor semasa jalan (After): **150 pcs**.
>   * Jumlah Reject Botol: $50 + 150 = 200\text{ pcs}$.
>   $$\text{Kadar Reject Botol} = \frac{200}{18,100 + 200} \times 100 = \frac{200}{18,300} \times 100 \approx 1.09\%$$
> * Sekiranya sasaran KPI kilang adalah $< 1.5\%$, sistem menandakan prestasi ini sebagai **PATUH (Cemerlang)**.

---

### 3.4 Formula Agihan Masa Henti (Downtime) Mesin
Masa henti operasi direkodkan mengikut seksyen mesin yang terjejas dalam kiraan minit:

$$\text{Jumlah Masa Henti (Total Downtime)} = \sum \text{Minit Downtime Setiap Seksyen}$$
$$\text{Peratus Sumbangan Downtime (\%)} = \frac{\text{Downtime Seksyen (Minit)}}{\text{Jumlah Keseluruhan Downtime}} \times 100$$

Seksyen mesin dipantau merangkumi: *Autoscrambler, Blower, Conveyor, Filler, Capper, Labeler, Packer, Palletizer, dan Lain-lain*.

---

## 4.0 PENGURUSAN BAHAN MASUK, STOK AKTIF & KUARANTIN

Bagi memastikan bahan mentah terkawal sepenuhnya sebelum memasuki mesin pengeluaran, modul ini menyediakan tiga sub-ciri utama:

### 4.1 Pendaftaran Bahan Masuk (Transfer In / Incoming Stock)
Apabila lori pembekal atau lori dari stor luar tiba menghantar bahan mentah, kerani atau operator merekodkan maklumat penghantaran:
* **Nombor DO Pembekal:** Dicatatkan tepat mengikut kertas invois penghantaran.
* **Nombor Batch Pengeluar:** Mengenal pasti kelompok pengeluaran bahan.
* **Kategori Bahan & Multiplier:** Memilih sama ada Botol 425ml, Botol 800ml, Cap, Label, atau Kotak.
* **Kuantiti Bag / Bundle:** Jumlah fizikal yang diturunkan di gudang.
Setelah disimpan, data ini serta-merta muncul sebagai pilihan pada borang Daily KAR syif semasa.

### 4.2 Semakan Stok Pengeluaran (Production Stock)
Memaparkan papan pemuka (*live balance*) bagi setiap kelompok bahan mentah yang sedang berada di kawasan barisan pemprosesan:
* Menyenaraikan setiap batch nombor bersama kuantiti fizikal dalam unit *bag* dan *pieces*.
* Membantu penyelia kilang membuat perancangan sebelum memulakan syif baharu agar bahan mentah mencukupi.

### 4.3 Kawasan Tahanan & Kuarantin (Quarantine / Hold Items)
Sekiranya terdapat bahan mentah yang disyaki cacat (contohnya: penutup calar, botol herot, atau gam label pudar), penyelia boleh menanda kelompok tersebut sebagai **HOLD**:
* Stok bertanda HOLD akan diasingkan serta-merta dan tidak dibenarkan digunakan dalam pengeluaran harian.
* Baris stok ditandakan dengan lencana amaran berwarna oren keemasan `[HOLD]` pada skrin sistem sehingga pihak Kawalan Kualiti (QC) melengkapkan siasatan makmal.

---

## 5.0 MODUL AMBIL BAHAN DARI STOR WAREHOUSE

Proses pengambilan bahan mentah dari stor fizikal (*Warehouse Rack*) ke kawasan pengeluaran kini diautomasikan sepenuhnya bagi mengelakkan pertikaian baki fizikal antara staf gudang dan staf produksi.

```
+-------------------------------------------------------------------------------------------------------+
| FLOWCHART 2: ALIRAN KERJA AMBIL BAHAN DARI STOR KE PENGELUARAN                                        |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [ 1. Akses Menu ]  ---> [ 2. Pilih Bahan ]  ---> [ 3. Semak Prinsip ] ---> [ 4. Jana Auto DO ]      |
|   Staf buka menu          Pilih SKU & batch       FIFO (First-In-First-      Sistem hasilkan nombor   |
|   'Ambil Bahan'           mentah dari rak stor    Out): Cadang batch lama    DO-WD<yymmdd>-<seq>      |
|           |                                                                           |               |
|           v                                                                           v               |
|  [ 8. Laporan KAR ] <--- [ 7. Kemas Kini ]   <--- [ 6. Kelulusan Tarikh ]<-- [ 5. Tuntutan Bahan ]   |
|   Bahan ditolak           Stok keluar ditolak      Jika rekod tertinggal      Data masuk terus ke     |
|   semasa pengeluaran      daripada imbangan        (Backdate max 7 hari),     borang Daily KAR barisan|
|   syif semasa             stok stor secara terus   perlu ulasan bertulis      pengeluaran             |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

### 5.1 Ciri-Ciri Utama Modul Ambil Bahan
1. **Prinsip Masuk Dahulu, Keluar Dahulu (FIFO - First In, First Out):**
   Sistem menyusun batch mengikut format tarikh usia `DDMMYY`. Kumpulan bahan yang paling lama berada di atas rak dicadangkan terlebih dahulu untuk mengelakkan bahan mentah melangkaui tarikh luput.
2. **Penjanaan Automatik Delivery Order Dalaman:**
   Setiap transaksi pengambilan bahan menjana nombor rasmi dengan format:
   $$\text{DO - WD}\langle\text{YYMMDD}\rangle\text{-}\langle\text{SEQ}\rangle$$
   *Contoh:* `DO - WD260904-001`. Nombor ini menjadi rujukan rasmi audit pergerakan stok.
3. **Kebenaran Rekod Tarikh Lepas (Backdate Policy):**
   Sekiranya staf terlupa merekodkan pengambilan bahan pada waktu sebenar, sistem membenarkan rekod dibuat sehingga **7 hari ke belakang** (*maximum 7 days backdate*) dengan syarat mempunyai akses khas `RAW_MATERIAL_WITHDRAWAL_BACKDATE` serta memasukkan **Alasan Kelewatan (Backdate Reason)** bertulis.

---

## 6.0 MODUL KBP (KAWALAN BATCH & KEBOLEHKESANAN KOD QR)

Modul **KBP (Kawalan Botol Pecah / Batch Traceability)** bertanggungjawab mengawal pengeluaran botol dan penutup daripada mesin pengacuan (*moulding*) serta menghasilkan stiker kod QR rasmi bagi setiap bungkusan.

### 6.1 Direktori Mesin Kilang KBP
Kilang memiliki 5 unit mesin utama bagi penyediaan botol dan penutup:

| Kod Mesin | Nama Mesin & Lokasi | Kod Produk | Produk Dihasilkan | Saiz Piawai se-Bag |
| :--- | :--- | :--- | :--- | :--- |
| **BM1** | Blow Moulding 1 | 425 | Botol Kosong 425ml | 181 pcs / bag |
| **BM2** | Blow Moulding 2 | 425 | Botol Kosong 425ml | 181 pcs / bag |
| **BM3** | Blow Moulding 3 | 800 | Botol Kosong 800ml | 225 pcs / bag |
| **CM1** | Cap Moulding 1 | CAP | Penutup Botol (Cap) | 4,000 pcs / kotak |
| **CM2** | Cap Moulding 2 | CAP | Penutup Botol (Cap) | 4,000 pcs / kotak |

### 6.2 Struktur Pembinaan Kod Batch KBP Standard
Kod batch KBP dibina secara pintar menggunakan piawaian antarabangsa **ISO 8601 Week Date**:

$$\mathbf{\langle MESIN\rangle - \langle PRODUK\rangle - \langle HARI\rangle\langle MINGGU\rangle\langle TAHUN\rangle - \langle SHIFT\rangle}$$

```
Contoh Kod Batch:  BM1 - 425 - 052126 - 01
                   ---   ---   -- -- --   --
                    |     |     |  |  |    |
                    |     |     |  |  |    +--- Syif Operasi: 01 = Pagi (AM), 02 = Malam (PM)
                    |     |     |  |  +-------- 2 Digit Tahun Kalendar ISO (Tahun 2026 -> 26)
                    |     |     |  +----------- 2 Digit Nombor Minggu ISO (Minggu ke-21)
                    |     |     +-------------- 2 Digit Kod Hari ISO (01=Isnin ... 05=Jumaat)
                    |     +-------------------- Kod Produk (Derived daripada saiz mesin: 425)
                    +-------------------------- Kod Mesin Pengeluar (Blow Moulding 1)
```

```
+-------------------------------------------------------------------------------------------------------+
| FLOWCHART 3: ALIRAN PENJANAAN & PENGIMBASAN STIKER QR KBP                                             |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [ 1. Pilih Mesin ]  ---> [ 2. Pilih Syif ]  ---> [ 3. Formula Auto ]  ---> [ 4. Cetak Stiker QR ]    |
|   Operator pilih          Pilih syif AM (01)      Sistem janakan nombor     Cetak stiker matriks 2D   |
|   BM1, BM2, BM3, dll      atau syif PM (02)       batch mengikut ISO Week   kalis air Brother/Avery   |
|           |                                                                           |               |
|           v                                                                           v               |
|  [ 8. Audit Mutu ]   <--- [ 7. Rekod Pengeluaran]<--- [ 6. Imbas Kamera ]  <--- [ 5. Tampal Pada Bag] |
|   Laporan lengkap         Bahan ditolak semasa    Operator imbas QR guna    Tampal stiker pada plastik|
|   sedia untuk audit       proses pengeluaran      telefon pintar untuk sah  bungkusan botol di pallet |
|   HACCP / KKM             air minuman             status & butiran batch    simpanan                  |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

---

## 7.0 MODUL GMP & PEMATUHAN STANDARD KUALITI (SGMP)

Bagi menjamin piawaian keselamatan makanan Kementerian Kesihatan Malaysia (KKM) dan sijil HACCP/Halal, modul **SGMP (Standard Good Manufacturing Practice)** mendigitalkan lebih 20 jenis borang semakan operasi kilang ke dalam tiga kategori utama:

### 7.1 Matriks Borang Kawalan Kualiti (QC Forms)
* **SGMP/21/FIR:** *Finished Goods Product Inspection Record* — Pemeriksaan produk siap sebelum pelepasan pasaran.
* **SGMP/17/CCR:** *Chemical Control Records* — Penggunaan bahan kimia pembersihan dan rawatan air.
* **SGMP/18/DQIP:** *Daily Quality In-Process Records* — Pemeriksaan kualiti setiap jam di barisan pemprosesan.
* **SGMP/18/QCDR:** *QC Daily Report* — Ringkasan laporan harian kualiti kilang.
* **SGMP/06/PCS & PCDM:** *Pest Control Schedule & Daily Monitoring* — Rekod kawalan dan pemantauan makhluk perosak.
* **SGMP/06/FTDM:** *Fly Trap Daily Monitoring* — Pemeriksaan perangkap lalat berlampu UV setiap hari.
* **SGMP/18/FPIR:** *Finished Product Inspection Record* — Rekod parameter fizikal dan pembungkusan botol.
* **SGMP/18/WQTR:** *Water Quality Testing Record* — Ujian bacaan pH, kekonduksian, mineral, dan kebersihan air mentah punca bawah tanah.

### 7.2 Matriks Borang Kebersihan & Pengeluaran (Production Hygiene Forms)
* **SGMP/05:** *Cleaning & Sanitization Inspection Records* — Pemeriksaan pembersihan semua zon kilang.
* **SGMP/07/WMDR & WDIR:** *Waste Management & Disposal Records* — Pelupusan sisa pepejal dan cecair kilang.
* **SGMP/09/FHDIR:** *Food Handler Daily Inspection Records* — Pemeriksaan kesihatan, kuku, pakaian, dan etika pengendali makanan setiap pagi.
* **SGMP/08/LFCR:** *Lighting Fixtures Cleaning Record* — Pembersihan lampu dan penutup lampu di kawasan pemprosesan.
* **SGMP/12/MGL & MGB:** *Monthly Glass Log & Glass Breakage Records* — Inventori barang kaca dan tindakan kawalan jika berlaku botol kaca pecah.
* **SGMP/13/MWL & MWB:** *Monthly Wood Log & Breakage Records* — Kawalan bahan kayu dan pallet.
* **SGMP/13/MPL & MPB:** *Monthly Plastic Log & Breakage Records* — Kawalan peralatan plastik keras.

### 7.3 Matriks Borang Penyelenggaraan Mesin (Maintenance Forms)
* **SGMP/02/LIR:** *Lighting Inspection Records* — Memastikan kecerahan cahaya mencukupi standard industri.
* **SGMP/04/MR:** *Maintenance Record* — Rekod pembaikan dan servis kerosakan mesin.
* **SGMP/03/PMIR & PMR:** *Preventive Maintenance Inspection Records* — Penyelenggaraan berjadual berkala pencegahan kerosakan.
* **SGMP/19/FBSR:** *Filtration Backwash System Records* — Rekod cucian balik (*backwash*) penapis pasir dan penapis mikron rawatan air.

```
+-------------------------------------------------------------------------------------------------------+
| FLOWCHART 4: ALIRAN PEMERIKSAAN HARIAN GMP & LOG SANITASI                                             |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [ 1. Pemeriksaan ]  ---> [ 2. Isi Borang SGMP ]---> [ 3. Pengesahan Had ] ---> [ 4. Tindakan ]       |
|   Staf QC / Penyelia      Pilih borang digital      Jika parameter di luar     Jika tidak patuh, log  |
|   lakukan rondaan         pada tablet (contoh:      had (contoh: klorin atau   tindakan pembetulan    |
|   fizikal harian          SGMP/09 atau SGMP/18)     kebersihan), ditanda MERAH serta-merta            |
|           |                                                                           |               |
|           v                                                                           v               |
|  [ 8. Arkib Audit ]  <--- [ 7. Kelulusan Eksekutif]<- [ 6. Kunci Dokumen ]  <--- [ 5. E-Tandatangan ]  |
|   Rekod disimpan dalam    Pengurus QA semak dan     Data disahkan dan tidak    Penyelia dan operator  |
|   awan & sedia dicetak    luluskan secara rasmi     boleh diubah tanpa audit   turun tandatangan      |
|   semasa audit luaran     dalam sistem              trail                      digital pada borang    |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

---

## 8.0 MODUL PERINGATAN AUTOMATIK (REMINDER CALENDAR)

Bagi memastikan aktiviti penyelenggaraan mesin dan audit kualiti tidak terlepas daripada jadual, sistem AIO dilengkapi dengan enjin kalendar peringatan pintar:

* **Penjadualan Kekerapan Boleh Ubah:** Peringatan boleh ditetapkan untuk sekali sahaja (*Once*), harian (*Daily*), mingguan (*Weekly*), atau bulanan (*Monthly*).
* **Enjin Penghantaran E-mel Setiap Jam (MYT):** Sistem memeriksa jadual setiap 60 minit mengikut Waktu Malaysia (UTC+8) dan menghantar notifikasi e-mel automatik kepada penerima.
* **Sasaran Mengikut Unit & Peranan:** Peringatan boleh disasarkan kepada individu tertentu, seluruh unit kerja (contoh: *Semua Staf QC* atau *Semua Juruteknik Maintenance*), atau pengguna modul tertentu.
* **Peringatan Pra-Audit Automatik:** Menghantar amaran 3 hari sebelum tarikh luput penapis air (*filter cartridge replacement*), rawatan kawalan serangga, dan ujian makmal air bulanan.

---

## 9.0 NOTA SERAHAN PRODUKSI (HANDOVER KE GUDANG)

Setelah pengeluaran selesai pada hujung syif, produk siap (kotak karton air mineral) perlu diserahkan secara rasmi kepada bahagian Gudang Simpanan (*Warehouse*) melalui dokumen rasmi **Nota Serahan Produksi (Handover Form)**.

### 9.1 Formula Kuantiti Bersih ke Gudang (Net Handover Formula)
Bukan semua kuantiti yang dihasilkan dihantar ke dalam stok jualan. Sebahagian kecil diambil untuk sampel kualiti, simpanan rujukan (*retain sample*), atau ujian makmal:

$$\text{Kuantiti Bersih ke Gudang (Pcs)} = \text{Jumlah Dihasilkan (Total Produced)} - \sum \text{Kuantiti Potongan (Deductions)}$$

* **Kategori Potongan yang Sah:**
  1. *QC Lab Sampling:* Sampel ujian mikrobiologi dan kimia.
  2. *Retain Sample:* Sampel simpanan wajib bagi rekod kelompok.
  3. *Line Damage / Retest:* Botol yang rosak semasa pembungkusan akhir.
  4. *Management / Marketing:* Pengambilan khas pihak pengurusan.

### 9.2 Protokol Dwi-Tandatangan (Dual Digital Sign-Off)
Setiap dokumen serahan menjana nombor siri rasmi (contoh: `HO-2609A4F2`) dan memerlukan **Dua Tandatangan Digital**:
1. **Tandatangan Staf Pengeluaran:** Memperakui kuantiti yang siap dibungkus dan butiran potongan sampel.
2. **Tandatangan Staf Gudang:** Ditandatangani oleh penerima stok di gudang setelah kiraan fizikal pallet selesai dibuat. Status dokumen berubah daripada `PENDING` kepada `ACCEPTED`, dan stok jualan rasmi syarikat dikemas kini secara langsung!

---

## 10.0 PANDUAN LANGKAH DEMI LANGKAH ANTARA MUKA (UI TUTORIAL)

### Tutorial 1: Cara Mengisi Laporan Daily KAR
1. Buka menu utama dan tekan **Production** $\rightarrow$ **Daily KAR** (`/forms/production/daily-report`).
2. Masukkan **Tarikh**, **Masa Pengeluaran**, **Syif** (AM atau PM), dan **Barisan Pengeluaran** (Line 1 - 800ml atau Line 2 - 425ml).
3. Tandakan kotak SKU yang dihasilkan (contoh: `800 ml x 12`). Masukkan **Total Produced (Box)** dan agihkan kuantiti mengikut nombor batch produk. Pastikan jumlah agihan batch menyamai jumlah kotak!
4. Di bahagian **Transfer In**, semakan automatik akan memaparkan DO yang diterima hari ini. Jika ada DO tertinggal, klik dropdown untuk menambahnya.
5. Di bahagian **Storeroom Balance**, semak baki *Carry Forward*. Masukkan penggunaan sebelum dan semasa syif.
6. Masukkan data **Reject & Scrap** (atau tandakan `Tiada Barang Reject` sekiranya sifar).
7. Jika mesin terhenti, klik `[+ Add Downtime Record]`, pilih seksyen mesin, minit terhenti, dan punca kerosakan.
8. Turunkan **Tandatangan Digital** pada kotak kanvas dan tekan butang hijau **[Submit Daily Report]**.

### Tutorial 2: Cara Merekod Ambil Bahan dari Stor
1. Buka menu **Ambil Bahan** (`/forms/warehouse/reports/raw-material/withdraw`).
2. Masukkan **Tarikh**, **Masa**, **Nama Pengambil**, dan tujuan (**PRODUCTION**).
3. Pada senarai bahan, pilih bahan mentah yang diperlukan. Sistem akan memaparkan baki terkini atas rak mengikut susunan FIFO.
4. Masukkan kuantiti yang diambil dalam unit *Bag* atau *Kotak*.
5. Tekan butang **[Simpan Rekod Ambil Bahan]**. Sistem akan menjana nombor `DO - WD...` dan bahan tersebut sedia untuk dituntut dalam laporan pengeluaran syif anda!

---

## 11.0 MATRIKS DIAGNOSIS & TROUBLESHOOTING MASALAH LAZIM

| Ralat / Simptom | Punca Utama (Root Cause) | Tindakan Pembetulan Segera (Resolution) |
| :--- | :--- | :--- |
| **"Distributed batches must match Total Produced"** | Jumlah kotak pada pecahan batch tidak menyamai angka pada kotak Total Produced. | Semak kembali pecahan batch. Pastikan hasil tambah $\sum \text{batch.qty}$ tepat menyamai jumlah kotak pengeluaran. |
| **"Baris bertanda merah bukan Line 1 / Line 2"** | Terdapat bahan mentah milik barisan lain yang terselit dalam baki stor (contoh: botol 425ml dalam laporan 800ml). | Sistem akan membuang baris tersebut secara automatik semasa simpan, atau anda boleh klik ikon tong sampah untuk memadamnya segera. |
| **"Sila pilih Batch untuk rekod usage"** | Operator memasukkan kuantiti penggunaan tetapi membiarkan ruangan pilihan Batch kosong. | Pilih nombor batch yang sah daripada menu dropdown bagi setiap baris penggunaan bahan yang mempunyai nilai kuantiti. |
| **"Tiada kebenaran untuk merekod tarikh lepas"** | Pengguna cuba membuat rekod Ambil Bahan melebihi tarikh hari ini tanpa permit backdate. | Dapatkan kebenaran khas modul `RAW_MATERIAL_WITHDRAWAL_BACKDATE` daripada Pentadbir Sistem (IT Superadmin) dan sertakan alasan bertulis. |
| **"Borang tidak boleh dihantar tanpa tandatangan"** | Kotak tandatangan penyelia masih kosong semasa cubaan menghantar laporan. | Gunakan jari atau pen stylus pada skrin tablet untuk menurunkan tandatangan rasmi sebelum menekan butang serah. |

---

## 12.0 RUMUSAN OPERASI & PENGESAHAN DOKUMEN (FORMAL SIGN-OFF)

Buku panduan ini menjadi piawaian operasi standard (SOP) rasmi bagi memastikan integriti pengeluaran, pematuhan kawalan kualiti, dan keselamatan inventori syarikat sentiasa terpelihara pada tahap tertinggi. Semua warga kerja Jabatan Pembuatan, Pengeluaran, dan Kawalan Kualiti BubblesO2 diwajibkan mematuhi prosedur yang telah digariskan dalam manual ini.

### RUANGAN KELULUSAN & PENGESAHAN RASMI:

| DISEDIAKAN OLEH: | DISAHKAN OLEH: |
| :--- | :--- |
| <br><br>_________________________________________ | <br><br>_________________________________________ |
| **Muhammad Iskandar Zulkarnain Bin Zulkifli** | **Abdul Aziz Arifin** |
| System Developer, | Pengurus (Manager), |
| Bahagian Teknologi Maklumat, | Bahagian Teknologi Maklumat, |
| BubblesO2 Sdn Bhd | BubblesO2 Sdn Bhd |
| Tarikh: September 2026 | Tarikh: September 2026 |

---
*Hak Cipta Terpelihara © 2026 BubblesO2 Sdn Bhd. Dokumen ini disediakan secara khusus untuk kegunaan dalaman pengurusan syarikat sahaja. Sebarang pengedaran luar tanpa kebenaran bertulis adalah dilarang sama sekali.*
