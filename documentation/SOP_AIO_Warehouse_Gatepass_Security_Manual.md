# BUBBLESO2 ALL-IN-ONE (AIO) SYSTEM
## MANUAL OPERASI GUDANG, PAS PINTU MASUK (GATEPASS) & KAWALAN KESELAMATAN PINTU PAGAR (SECURITY GATE)
**Standard Operating Procedure (SOP) & Panduan Teknikal Operasi Logistik**

---

### MAKLUMAT DOKUMEN & PENGESAHAN KORPORAT
* **Tajuk Dokumen:** BubblesO2 All-In-One (AIO) System — Manual Operasi Gudang, Pas Pintu Masuk (Gatepass) & Kawalan Keselamatan Pintu Pagar (Warehouse, Gatepass & Security Gate Master Manual)
* **Pengguna / Pemilik Modul:** Muhammad Iskandar Zulkarnain Bin Zulkifli
* **Jabatan Bertanggungjawab:** Bahagian Teknologi Maklumat (IT), Jabatan Gudang & Logistik (Warehouse), dan Unit Keselamatan Fizikal (Security)
* **Tarikh Penerbitan:** September 2026
* **Versi Dokumen:** 1.0 (Keluaran Rasmi Kilang Rantau, Sendayan & HQ)
* **Klasifikasi:** Dokumen Sulit Dalaman Syarikat (Strictly Confidential / Internal Use Only)

| Disediakan Oleh (Prepared By): | Disahkan Oleh (Approved By): |
| :--- | :--- |
| **Muhammad Iskandar Zulkarnain Bin Zulkifli** | **Abdul Aziz Arifin** |
| System Developer, | Pengurus (Manager), |
| Bahagian Teknologi Maklumat, | Bahagian Teknologi Maklumat, |
| BubblesO2 Sdn Bhd | BubblesO2 Sdn Bhd |

---

## 1.0 PENGENALAN & SENI BINA EKOSISTEM GUDANG & LOGISTIK

Sistem **BubblesO2 All-In-One (AIO)** menyepadukan keseluruhan rantaian logistik fizikal kilang bermula dari saat produk siap keluar dari barisan pemprosesan, disimpan di gudang, disediakan di zon pemuatan (*loading bay*), sehinggalah lori melepasi pos kawalan pengawal keselamatan (*Security Gate*).

Sebelum pengenalan modul digital ini, pergerakan lori keluar masuk hanya bergantung kepada borang pas kertas manual dan buku log pondok pengawal. Kelemahan kaedah lama ini sering mengakibatkan:
1. **Ketidakpadanan Lori (*Vehicle Mismatch*):** Lori yang tiba berbeza dengan nombor plat yang berdaftar dalam pesanan tanpa disedari oleh pihak stor.
2. **Kesesakan Pintu Pagar (*Gate Congestion*):** Pengawal keselamatan terpaksa menelefon pihak gudang secara manual untuk mengesahkan sama ada muatan lori telah siap dibungkus.
3. **Kehilangan Aset Pallet (*Unaccounted Pallet Loss*):** Pallet kayu dan plastik bernilai tinggi keluar ke pasaran tanpa rekod pemegang amanah (*custodian*) yang jelas.

Platform AIO menyelesaikan masalah ini melalui sistem pengesahan digital masa nyata dengan kod QR verifikasi awam yang selamat, lejar pallet automatik, dan konsol khas bagi pos keselamatan.

### 1.1 Navigasi Utama Modul Gudang & Logistik

| Modul / Tab | Laluan URL | Pengguna Sasaran | Fungsi Utama |
| :--- | :--- | :--- | :--- |
| **Inventory & Transfers** | `/forms/warehouse/dashboard` | Kerani Stor, Staf Gudang | Pemantauan stok fizikal produk siap dan bahan mentah mengikut zon dan lokasi bay. |
| **Distribution (DO)** | `/forms/warehouse/distribution` | Pegawai Logistik | Penjanaan dan pemantauan status penghantaran Distribution Order kepada pelanggan. |
| **Quarantine & Returns** | `/forms/warehouse/quarantine` | Pegawai Kualiti (QC), Stor | Pengasingan produk rosak, pulangan pasaran, atau barangan yang ditahan siasatan. |
| **Gatepass Planning** | `/forms/warehouse/gatepass` | Pemohon, Sales, Ops Gudang | Perancangan jadual lori tiba, pengagihan kuantiti karton/pallet, dan pautan pendaftaran lori. |
| **Security Gate** | `/forms/warehouse/gatepass/security` | Pegawai Keselamatan (Guards) | Pengimbasan kod QR di pos pintu pagar, semakan no plat/pemandu, dan pendaftaran Check-In / Check-Out. |
| **Pallet Ledger** | `/forms/maintenance/pallet-transfer` | Kerani Pallet, Supervisor | Lejar rekod keluar-masuk pallet boleh pulang (*returnable pallets*) syarikat. |

---

## 2.0 OPERASI GUDANG, PENERIMAAN HANDOVER & PESANAN AGIHAN (DO)

### 2.1 Penerimaan Produk Siap dari Barisan Pengeluaran (Production Handover)
Setelah pengeluaran selesai pada hujung syif, staf gudang membuka menu `/forms/warehouse/handover` untuk menerima penyerahan produk siap:
1. **Pengesahan Fizikal:** Pemandu forklift memeriksa susunan pallet di kawasan zon penampung (*staging area*).
2. **Semakan Potongan Sampel:** Mengesahkan kuantiti potongan sampel makmal QC dan botol rosak yang direkodkan oleh penyelia pengeluaran.
3. **Tandatangan Penerimaan Digital:** Staf gudang menandatangani borang serahan secara digital. Status dokumen bertukar menjadi `ACCEPTED`, dan baki karton sedia dijual dikemas kini serta-merta ke dalam katalog jualan syarikat.

### 2.2 Pengeluaran Pesanan Agihan (Distribution Orders - DO)
Apabila pesanan pelanggan diluluskan, dokumen DO dijana bagi mengarahkan staf gudang memilih stok mengikut kelompok batch tertentu. Setiap DO mengandungi maklumat destinasi, nama pemandu, nombor lori penghantaran, dan senarai nombor pallet yang perlu dimuatkan.

```
+-------------------------------------------------------------------------------------------------------+
| FLOWCHART 1: ALIRAN OPERASI GUDANG & PENERIMAAN HANDOVER PRODUK SIAP                                 |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [ 1. Selesai Syif ] ---> [ 2. Staf Gudang ]   ---> [ 3. Semak Fizikal ] ---> [ 4. Dwi-Tandatangan ]  |
|   Produksi hantar          Buka borang Handover      Kira bilangan pallet      Staf gudang tandatangan|
|   laporan serahan siap     di menu sistem            & sahkan potongan QC      digital untuk terima   |
|           |                                                                           |               |
|           v                                                                           v               |
|  [ 8. Lori Bergerak ]<--- [ 7. Muat ke Lori ]  <--- [ 6. Pautkan ke DO ] <--- [ 5. Stok Jualan Aktif ]|
|   Lori keluar melalui      Pemandu forklift muat     Keluarkan dokumen DO      Kuantiti produk masuk  |
|   Gatepass rasmi           pallet ke dalam lori      untuk penghantaran        ke katalog sedia niaga |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

---

## 3.0 PENGURUSAN LEJAR PALLET BOLEH PULANG (RETURNABLE PALLETS)

Pallet kayu bertaraf industri dan pallet plastik tahan lasak merupakan aset modal syarikat yang berharga tinggi. Bagi membendung risiko kehilangan pallet semasa penghantaran luar, sistem AIO menguatkuasakan **Lejar Pallet Automatik (Pallet Ledger Service)** di laluan `/forms/maintenance/pallet-transfer`.

### 3.1 Pendaftaran Pemegang Amanah Pallet (Pallet Custodians)
Setiap entiti luar yang menerima pallet BubblesO2 didaftarkan sebagai pemegang amanah:
* **CUSTOMER (Pelanggan):** Rangkaian pasar raya, pemborong, atau pengedar rasmi yang menerima barangan bersama pallet.
* **TRANSPORTER (Syarikat Pengangkutan):** Kontraktor logistik pihak ketiga yang mengangkut pallet antara kilang dan hab pengedaran.

### 3.2 Kitaran Pergerakan Pallet (Movement Types)
* **OUTBOUND (Keluar Kilang):** Bilangan pallet ditolak daripada inventori kilang dan dicaj ke dalam akaun baki lejar pelanggan/transporter.
* **INBOUND (Masuk / Pulangan):** Apabila lori kembali membawa pallet kosong, bilangan pallet dikreditkan semula ke dalam inventori kilang dan baki hutang lejar pelanggan ditolak.
* **REVERSAL (Pembatalan):** Sekiranya berlaku kesilapan kiraan, transaksi lejar boleh dibatalkan dengan memasukkan alasan bertulis bagi tujuan audit.

```
+-------------------------------------------------------------------------------------------------------+
| FLOWCHART 2: ALIRAN LEJAR PALLET BOLEH PULANG (RETURNABLE PALLET TRACKING)                            |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [ 1. Pemuatan Lori ]---> [ 2. Rekod Lejar ]   ---> [ 3. Paut ke Gatepass]---> [ 4. Lori Keluar ]     |
|   Susun karton atas        Daftar Pallet Transfer    Nombor lejar pallet       Pengawal sahkan jumlah |
|   pallet kayu/plastik      OUT kepada pelanggan      dipautkan ke Gatepass     pallet di pos pintu    |
|           |                                                                           |               |
|           v                                                                           v               |
|  [ 8. Lejar Selesai ]<--- [ 7. Audit Stok ]    <--- [ 6. Rekod Pulangan ]<--- [ 5. Lori Pulang ]     |
|   Akaun pallet             Sistem kemas kini         Staf stor catat Pallet    Lori hantar semula     |
|   pelanggan diimbangi      baki pallet gudang        Transfer IN di sistem     pallet kosong          |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

---

## 4.0 KITARAN HAYAT PAS PINTU MASUK (GATEPASS PLANNING)

Modul **Gatepass Planning** di laluan `/forms/warehouse/gatepass` merupakan gerbang keselamatan utama yang mengawal sebarang kenderaan pengangkut barangan keluar-masuk premis kilang.

### 4.1 Format Nombor Gatepass Piawai & Kunci Transaksi
Setiap Gatepass diberikan nombor siri rasmi automatik berasaskan tarikh:

$$\mathbf{GP\text{ - }}\langle\mathbf{YYYYMMDD}\rangle\text{ - }\langle\mathbf{SEQ}\rangle\quad\text{(Contoh: } GP-20260904-0001\text{)}$$

Bagi menjamin tiada nombor bertindih (*zero duplicate number*) walaupun beberapa staf mencipta Gatepass serentak, sistem menggunakan kunci penasihat pangkalan data PostgreSQL: `pg_advisory_xact_lock(hashtext('warehouse-gatepass:YYYYMMDD'))`.

### 4.2 Mesin Status Kitaran Hayat Gatepass (10-Stage State Machine)

| Status | Pihak Bertindak (Actor) | Huraian & Peraturan Operasi |
| :--- | :--- | :--- |
| **DRAFT** | Pemohon (Requester) | Peringkat draf awal. Item produk, destinasi, dan kuantiti dirancang dimasukkan. |
| **AWAITING_CUSTOMER** | Sistem / Pemohon | Pautan awam dihantar kepada pelanggan / syarikat transporter untuk melantik lori. |
| **CUSTOMER_SUBMITTED**| Pelanggan / Pemandu | Pemandu mengisi nombor plat lori, nama pemandu, nombor telefon, dan anggaran tiba (ETA). |
| **WAREHOUSE_ACKNOWLEDGED**| Staf Gudang | Pihak gudang mengesahkan jadual lori dan memperuntukkan zon pemuatan (*loading bay*). |
| **PREPARING** | Staf Gudang | Pemandu forklift mula mengumpul stok produk siap dan menyusun pallet di bay pemuatan. |
| **READY_FOR_PICKUP** | Staf Gudang | Barangan siap dibungkus dan sedia untuk dimuatkan. Sistem membenarkan pengawal mendaftar masuk lori. |
| **CHECKED_IN** | Pegawai Keselamatan | Pengawal keselamatan mengimbas kod QR di pintu pagar, menyemak no plat, dan merekodkan waktu masuk lori. |
| **LOADING** | Staf Gudang | Pemuatan pallet ke dalam ruang kargo lori sedang berjalan secara fizikal di loading bay. |
| **CHECKED_OUT** | Pegawai Keselamatan | Pengawal memeriksa muatan lori bersama DO, menyemak nombor seal kontena, dan merekod waktu lori keluar. |
| **COMPLETED** | Staf Gudang / Sistem | Transaksi selesai sepenuhnya dan diarkibkan ke dalam rekod sejarah pergerakan kilang. |

*Status Pengecualian / Terminal:*
* `REJECTED`: Lori atau barangan ditolak oleh Pengawal Keselamatan atau Pihak Gudang.
* `EXPIRED`: Pautan luaran tamat tempoh selepas 24 jam daripada tarikh pengambilan yang dirancang.
* `CANCELLED`: Dibatalkan oleh pemohon atas pembatalan pesanan jualan.
* `NO_SHOW`: Lori tidak hadir pada tarikh yang dijadualkan.

```
+-------------------------------------------------------------------------------------------------------+
| FLOWCHART 3: KITARAN HAYAT PAS PINTU MASUK (GATEPASS STATE MACHINE)                                  |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [ DRAFT ] --------> [ AWAITING_CUSTOMER ] --------> [ CUSTOMER_SUBMITTED ]                          |
|  Pemohon isi          Hantar pautan awam             Pemandu isi no plat lori                         |
|  item & destinasi     kepada pelanggan               & anggaran waktu tiba (ETA)                      |
|                                                              |                                        |
|                                                              v                                        |
|  [ READY_FOR_PICKUP ] <--- [ PREPARING ] <--- [ WAREHOUSE_ACKNOWLEDGED ]                              |
|  Barangan siap di          Forklift kumpul    Gudang sahkan tempahan                                  |
|  loading bay               pallet di bay      & tetapkan zon bay                                      |
|         |                                                                                             |
|         v                                                                                             |
|  [ CHECKED_IN ] ---------> [ LOADING ] ------------> [ CHECKED_OUT ] ---------> [ COMPLETED ]         |
|  Guard imbas QR            Muat kargo ke             Guard sahkan DO &          Selesai & arkib       |
|  & catat masa masuk        dalam lori                seal, lori keluar pintu    ke rekod kilang       |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

---

## 5.0 PORTAL PELANGGAN & PEMANDU TRANSPORTER LUAR (PUBLIC LINK)

Bagi menjimatkan masa pemandu lori menunggu di pintu pagar, sistem AIO menyediakan portal pendaftaran mudah alih yang boleh diakses terus daripada telefon pintar pemandu tanpa memerlukan kata laluan atau pemasangan aplikasi khas.

### 5.1 Mekanisme Keselamatan Token Terlindung (Opaque Secure Token)
* Apabila Gatepass bertukar ke status `AWAITING_CUSTOMER`, sistem menjana kunci token rawak 32-bait selamat (*base64url safe string*).
* Kunci token dienkripsi menggunakan algoritma `SHA-256` di dalam pangkalan data.
* Pautan awam dihasilkan: `https://aio.bubbleso2.com/public/gatepass/[TOKEN]`.
* **Tempoh Sah Token:** Tamat secara automatik dalam tempoh **24 jam** selepas waktu pengambilan yang dijadualkan (*requestedPickupAt + 24 Hours*).

### 5.2 Maklumat Yang Diisi Oleh Pemandu Lori
Pemandu atau ejen logistik luar hanya perlu mengisi maklumat ringkas berikut sebelum memulakan perjalanan ke kilang:
1. **Syarikat Pengangkutan (Transport Company):** Contoh: *Sinar Logistics Sdn Bhd*.
2. **Nama Penuh Pemandu (Driver Name):** Nama pemandu lori yang bertugas.
3. **Nombor Telefon Pemandu (Driver Phone):** Untuk dihubungi pihak stor sekiranya terdapat pertukaran bay.
4. **Nombor Pendaftaran Lori (Vehicle No):** Nombor plat lori (Contoh: *WXX 8921*).
5. **Jenis Kenderaan (Vehicle Type):** Contoh: *Lori 10 Tan, Treler 40 Kaki, Van Bonded*.
6. **Anggaran Masa Tiba (Confirmed ETA):** Tarikh dan jam lori dijangka sampai di kilang.

---

## 6.0 OPERASI POS KAWALAN KESELAMATAN (SECURITY GATE SCANNER)

Pos Pengawal Keselamatan di pintu utama kilang bertindak sebagai benteng terakhir kawalan aset syarikat. Pengawal keselamatan menggunakan peranti tablet atau telefon pintar di laluan `/forms/warehouse/gatepass/security`.

### 6.1 Kaedah Akses Pemeriksaan Pengawal
1. **Imbasan Kamera Kod QR:** Pengawal menekan butang `[Buka Pengimbas Kamera]` dan menghalakan kamera tablet ke kod QR pada skrin telefon pemandu atau cetakan kertas Gatepass.
2. **Carian Kod Manual:** Jika kamera rosak atau skrin telefon pemandu retak, pengawal boleh menaip kod verifikasi manual (contoh: `gp_sec_abc123`) untuk membuka rekod serta-merta.

```
+-------------------------------------------------------------------------------------------------------+
| FLOWCHART 4: ALIRAN PEMERIKSAAN KESELAMATAN DI PINTU PAGAR (SECURITY GATE)                            |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [ 1. Lori Tiba di ] ---> [ 2. Imbas Kod QR ]  ---> [ 3. Semakan Padanan ]---> [ 4. Klik CHECK-IN ]   |
|   Pintu Pagar Utama        Pengawal imbas QR        Banding plat fizikal vs    Sistem rekod waktu     |
|   Kilang BubblesO2         di peranti tablet        berdaftar di sistem        masuk & status bertukar|
|           |                                                                           |               |
|           v                                                                           v               |
|  [ 8. Lori Dilepaskan]<--- [ 7. Klik CHECK-OUT ]<--- [ 6. Semak DO & Seal ]<--- [ 5. Pemuatan Selesai] |
|   Pagar dibuka & lori      Sistem kunci rekod &     Periksa fizikal kargo      Staf gudang selesai    |
|   bergerak keluar          catat waktu keluar       bersama dokumen DO         muat karton & pallet   |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

### 6.2 Tanggungjawab Pegawai Keselamatan Semasa Masuk (Check-In)
* Memastikan status Gatepass telah mencapai **READY_FOR_PICKUP** (barangan di gudang telah siap sedia).
* Memeriksa fizikal nombor plat pendaftaran lori dan kad pengenalan pemandu.
* Memasukkan nombor lori yang diperhatikan (*Observed Vehicle No*) dan nama pemandu sebenar (*Observed Driver Name*).
* Menekan butang hijau **[Daftar Masuk (Check-In)]**. Waktu masuk direkodkan secara waktu nyata (`checkedInAt`).

### 6.3 Tanggungjawab Pegawai Keselamatan Semasa Keluar (Check-Out)
* Memastikan status Gatepass telah mencapai **LOADING** (atau proses muatan telah selesai sepenuhnya).
* Memeriksa dokumen Delivery Order (DO) fizikal yang diserahkan oleh pemandu.
* Memastikan bilangan pallet fizikal menyamai kuantiti dalam sistem (`actualPalletQty`).
* Sekiranya lori bertutup atau kontena, pastikan nombor seal keselamatan fizikal dipasang dan dicatat.
* Menekan butang biru **[Pengesahan Keluar (Check-Out)]**. Waktu keluar direkodkan (`checkedOutAt`) dan Gatepass ditutup rasmi.

---

## 7.0 PROTOKOL PENGESANAN KETIDAKPADANAN (MISMATCH) & PENOLAKAN LORI

Bagi mengelakkan kecurian stok atau pemalsuan identiti pemandu, sistem AIO dilengkapi algoritma pengesanan perbezaan secara automatik:

### 7.1 Pengesanan Ketidakpadanan Lori & Pemandu (Mismatch Detection Algorithm)
Semasa pengawal memasukkan nombor plat dan nama pemandu fizikal di pos pintu pagar:
* **Perbezaan Nombor Plat (`hasVehicleMismatch`):** Berlaku sekiranya nombor pendaftaran lori yang tiba berbeza dengan nombor plat yang didaftarkan oleh syarikat pengangkutan dalam portal awam.
* **Perbezaan Nama Pemandu (`hasDriverMismatch`):** Berlaku sekiranya pemandu lori yang hadir adalah orang lain berbanding nama yang dinamakan dalam pendaftaran awal.

Apabila ketidakpadanan dikesan:
1. Sistem serta-merta memaparkan **Kotak Amaran Berwarna Merah / Jingga (Alert Banner)** pada skrin pengawal keselamatan.
2. Butang pengesyoran akan mewajibkan pengawal memasukkan **Catatan Sebab Perbezaan (Remarks)** (contoh: *"Lori asal WXX 1234 rosak di bengkel, syarikat hantar lori ganti BXX 5678"*).
3. Sekiranya pemandu gagal memberikan bukti atau penjelasan sahih, pengawal keselamatan dilarang sama sekali membenarkan lori tersebut memasuki kawasan kilang!

### 7.2 Protokol Penolakan Gatepass (Rejection Protocol)
Pengawal keselamatan atau pihak gudang mempunyai kuasa mutlak untuk menolak Gatepass (`REJECTED`) sekiranya berlaku keadaan berikut:
* Pemandu disyaki berada di bawah pengaruh bahan terlarang atau gagal mematuhi etika keselamatan kilang (tidak memakai kasut keselamatan / vest keselamatan).
* Kenderaan kargo dalam keadaan kotor, berbau busuk, bocor bumbung, atau tidak selamat untuk membawa produk minuman makanan.
* Nombor pendaftaran lori palsu atau pemandu enggan bekerjasama menunjukkan kad pengenalan.
* Barangan yang hendak diambil didapati tidak sepadan dengan dokumen pesanan jualan rasmi.

---

## 8.0 PANDUAN PRAKTIKAL ANTARA MUKA MENGIKUT 4 PERANAN PELAKSANA

### Panduan 1: Peranan Pemohon (Requester / Sales / Operations)
1. Buka menu **Warehouse** $\rightarrow$ **Gatepass Planning** $\rightarrow$ Tekan butang **[+ New Gate Pass]**.
2. Masukkan **Tujuan Pengambilan** (contoh: *Jualan Pelanggan, Pindahan Kilang, Pelupusan*), **Lokasi Pengambilan** (*Kilang Rantau*), dan **Destinasi**.
3. Masukkan maklumat pelanggan dan senarai item produk berserta kuantiti karton dan anggaran bilangan pallet.
4. Tekan **[Simpan & Jana Pautan Awam]**. Salin pautan URL token dan hantarkan kepada pelanggan/transporter melalui WhatsApp atau emel.

### Panduan 2: Peranan Pemandu / Syarikat Pengangkutan (Transporter)
1. Buka pautan URL yang diterima pada pelayar web telefon pintar.
2. Semak butiran barangan yang perlu diambil dan lokasi kilang.
3. Masukkan **Nama Syarikat Lori**, **Nombor Pendaftaran Lori**, **Nama Pemandu**, **No Telefon**, dan **Anggaran Masa Tiba (ETA)**.
4. Tekan butang **[Hantar Maklumat Pengambilan]**. Skrin akan memaparkan kod QR keselamatan untuk ditunjukkan di pondok pengawal kilang.

### Panduan 3: Peranan Staf Gudang (Warehouse Stager & Loader)
1. Buka senarai Gatepass di `/forms/warehouse/gatepass`. Cari rekod berstatus `CUSTOMER_SUBMITTED`.
2. Klik butang **[Acknowledge]** untuk mengesahkan tempahan dan tetapkan nombor *Loading Bay*.
3. Setelah forklift selesai menyusun pallet di zon pemuatan, klik butang **[Ready for Pickup]**.
4. Pautkan dokumen Distribution Order (DO) dan Lejar Pallet berkaitan sebelum muatan dilepaskan.

### Panduan 4: Peranan Pegawai Keselamatan (Security Guard di Pintu Pagar)
1. Buka konsol keselamatan di `/forms/warehouse/gatepass/security`.
2. Tekan **[Buka Pengimbas Kamera]** dan imbas kod QR pemandu.
3. Periksa fizikal lori. Jika sama, klik butang hijau **[Daftar Masuk (Check-In)]**.
4. Apabila lori hendak keluar selepas muatan selesai, imbas semula QR, semak DO fizikal & nombor seal, kemudian klik butang biru **[Pengesahan Keluar (Check-Out)]**.

---

## 9.0 MATRIKS DIAGNOSIS & TROUBLESHOOTING MASALAH LAZIM GUDANG & GATEPASS

| Ralat / Simptom Masalah | Punca Masalah (Root Cause) | Tindakan Pembetulan Segera (Resolution) |
| :--- | :--- | :--- |
| **"Status Gatepass tidak boleh ditukar daripada X kepada Y"** | Pelanggaran urutan aliran sistem (contoh: cuba klik Check-In sebelum gudang klik Ready for Pickup). | Pastikan pihak gudang telah mengemas kini status barangan kepada `READY_FOR_PICKUP` terlebih dahulu sebelum pengawal mendaftar masuk lori. |
| **"Ralat perbezaan nombor plat lori (Vehicle Mismatch)"** | Syarikat lori menghantar kenderaan lain tanpa mengemas kini portal pendaftaran awal. | Pengawal wajib memasukkan nombor plat fizikal sebenar pada ruangan *Observed Vehicle No* dan menulis sebab pertukaran lori dalam ruangan catatan (*Remarks*). |
| **"Kamera pengimbas pos pengawal gagal dibuka"** | Tetapan kebenaran kamera disekat oleh penyemak imbas atau URL tidak menggunakan sambungan HTTPS selamat. | Masuk ke *Site Settings* di pelayar Chrome/Safari tablet pengawal, pilih *Camera: Allow*, dan muat semula laman web. Sebagai alternatif, taip kod verifikasi manual. |
| **"Sila selesaikan lejar pallet sebelum Check-Out"** | Gatepass memerlukan lejar pallet tetapi belum dipautkan dengan rekod Pallet Transfer rasmi. | Staf gudang mesti membuka menu *Pallet Transfer*, menjana dokumen lejar pallet OUT untuk pelanggan tersebut, dan memautkannya kepada nombor Gatepass. |
| **"Pautan verifikasi token tamat tempoh (Token Expired)"** | Lori tiba lewat melebihi 24 jam daripada tarikh waktu pengambilan yang dijadualkan. | Pemohon (Requester) perlu membuka rekod Gatepass tersebut di dalam sistem dan menekan butang *Regenerate Token* untuk memperbaharui pautan pengesahan. |

---

## 10.0 RUMUSAN OPERASI, INTEGRITI LOGISTIK & PENGESAHAN DOKUMEN (FORMAL SIGN-OFF)

Pengurusan kawalan pintu pagar kilang dan pergerakan stok gudang adalah benteng kritikal dalam menjaga keselamatan aset fizikal dan reputasi perniagaan BubblesO2 Sdn Bhd. Pelaksanaan sistem Gatepass digital berpusat ini bukan sahaja mempercepatkan tempoh pusingan lori (*lorry turnaround time*), malah menyediakan rekod jejak audit (*audit trail*) yang telus dan kebal daripada manipulasi manusia.

Semua kakitangan Jabatan Gudang, Pegawai Keselamatan Pos Pintu Pagar, Kerani Logistik, dan Penyelia Operasi diwajibkan mematuhi prosedur operasi standard yang terkandung di dalam manual ini.

### RUANGAN KELULUSAN & PENGESAHAN PENGURUSAN:

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
