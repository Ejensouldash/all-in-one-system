# BUBBLESO2 ALL-IN-ONE (AIO) SYSTEM
## MANUAL PROSEDUR OPERASI STANDARD (SOP): PENGISIAN REKOD KAWALAN BAHAYA & PROSES (SGMP/19/FUV)
**Standard Operating Procedure (SOP) & Panduan Visual Lengkap Pengendalian Borang Kawalan Bahaya & Proses, Pemantauan Parameter Rawatan Air Loji, Titik Kawalan Kritikal (CCP1 & CCP2), Rekod Henti Tugas (Downtime), dan Pengesahan Audit GMP KKM.**

---

### MAKLUMAT TERPERINCI DOKUMEN & KAWALAN TADBIR URUS

| Atribut Dokumen | Butiran Kawalan Tadbir Urus |
| :--- | :--- |
| **Tajuk Dokumen:** | BubblesO2 AIO System — Manual Operasi Standard (SOP) Pengisian Rekod Kawalan Bahaya & Proses (SGMP/19/FUV) |
| **Nombor Rujukan:** | BUBBLESO2-SOP-GMP-SGMP19-FUV-2026.09 |
| **Pemilik / Penyelaras:** | Muhammad Iskandar Zulkarnain Bin Zulkifli (System Developer) & Pasukan Pengeluaran GMP |
| **Jabatan Berkepentingan:** | Bahagian Pengeluaran (GMP - Production), Kawalan Kualiti (QC/QA), Penyelenggaraan (Maintenance), & IT |
| **Tarikh Penerbitan:** | September 2026 (Versi 1.0 — Keluaran Rasmi) |
| **Tarikh Kuat Kuasa:** | 02 Mac 2026 (Selaras Dokumen Rasmi SGMP/19/FUV Rev 4) |
| **Klasifikasi Dokumen:** | SULIT DALAMAN SYARIKAT (Strictly Confidential / Internal Use Only) |
| **Liputan Sistem:** | Pusat Rawatan Air (WTP), Kilang Sumber Mineral Semulajadi Rantau (Kompleks Al-Ammar) |

<br />

| DISEDIAKAN OLEH (PREPARED BY): | DISAHKAN OLEH (APPROVED BY): |
| :--- | :--- |
| **Muhammad Iskandar Zulkarnain Bin Zulkifli** | **Abdul Aziz Arifin** |
| System Developer, Bahagian Teknologi Maklumat (IT) | Pengurus (Manager), Bahagian Teknologi Maklumat (IT) |
| BubblesO2 Sdn Bhd • Tarikh: 07 September 2026 | BubblesO2 Sdn Bhd • Tarikh: 07 September 2026 |

<br />

### JADUAL KAWALAN REKOD & SEJARAH PINDAAN

| Versi | Tarikh Kuat Kuasa | Ringkasan Pindaan | Pegawai Bertanggungjawab |
| :---: | :---: | :--- | :--- |
| **v1.0 Rasmi** | 07 September 2026 | Dokumentasi komprehensif penstrukturan semula borang antaramuka kad berfokus (Slot-by-Slot Paper-Like Form), 6 zon loji, togol pintar operasi/downtime, butang salin nilai slot, amaran CCP1 & CCP2, dan tandatangan digital audit-proof. | Muhammad Iskandar (IT) & Pasukan GMP |

---

## 1.0 PENGENALAN & KEPENTINGAN KAWALAN PROSES (GMP, HACCP & KKM)

Air mineral semulajadi **Bubbles O2** merupakan produk minuman berkualiti tinggi yang dibotolkan terus dari punca sumber bawah tanah di Rantau, Negeri Sembilan. Kualiti, kebersihan, dan keselamatan setiap titisan air bergantung sepenuhnya kepada ketelitian kawalan proses di Pusat Rawatan Air (*Water Treatment Plant - WTP*).

Borang **SGMP/19/FUV (Hazard and Process Control Records)** ialah instrumen audit harian yang paling kritikal di bawah Skim Pensijilan Amalan Pengilangan Baik (*Good Manufacturing Practice - GMP*) dan Analisis Bahaya serta Titik Kawalan Kritikal (*HACCP*) Kementerian Kesihatan Malaysia (KKM).

### 1.1 Tiga Sebab Utama Kewajipan Pengisian Setiap 2 Jam:
1. **Perlindungan Kesihatan Pengguna Awam**: Memastikan tiada sebarang pencemaran fizikal (keladak/warna), kimia (sisihan pH/mineral konduktiviti), atau mikrobiologi (bakteria/kuman) yang terlepas ke dalam botol minuman.
2. **Kesihatan Mesin & Pencegahan Kegagalan Loji**: Tolok tekanan dan pemancar tekanan memberikan petunjuk awal jika penapis pasir, penapis karbon, atau membran ultrafiltrasi tersumbat sebelum kerosakan kekal berlaku.
3. **Pematuhan Tegas Audit KKM, HACCP & Halal JAKIM**: Apabila pegawai juruaudit KKM atau JAKIM memeriksa kilang, rekod berkala yang konsisten dan ditandatangani adalah bukti mandatori bahawa kilang beroperasi mengikut undang-undang Akta Makanan 1983.

### 1.2 Perbandingan Kaedah Manual Lapuk vs Antaramuka Kad Berfokus Baharu

| Aspek Operasi | Kelemahan Kaedah Lama (Excel 25 Kolum) | Kelebihan Antaramuka Kad Baharu (AIO System) |
| :--- | :--- | :--- |
| **Pengalaman Pengguna (UX)** | Terpaksa menatal skrin ke kiri dan kanan merentasi 25 kolum sempit (`min-w-[2100px]`), sangat sukar di telefon atau tablet kilang. | **Mod Kad Slot Berfokus**: Tiada tatalan mendatar. Parameter dipaparkan mengikut susunan kad bertingkat yang bersih dan bersaiz besar. |
| **Risiko Tersalah Baris** | Operator mudah tersalah menaip bacaan jam 9.30 am ke dalam baris jam 1.30 pm kerana kotak input yang rapat dan kecil. | **Navigasi Pil Masa Interaktif**: Hanya slot masa aktif yang dipaparkan pada satu-satu masa, lengkap dengan penunjuk siap/belum. |
| **Pengendalian Henti Tugas (Downtime)** | Operator terpaksa menaip tanda `-` satu persatu pada berpuluh-puluh sel semasa rehat atau mesin henti tugas. | **Togol Pintar RUNNING / OFF**: Satu klik pada butang togol OFF mengisi semua tanda `-` secara automatik dan memaparkan notis henti tugas. |
| **Pengesanan Pelanggaran CCP** | Sukar dikesan dalam hamparan nombor yang padat, menyebabkan maklum balas kelewatan kepada pegawai kualiti (QC). | **Sistem Amaran Lampu Isyarat**: Kotak berkelip merah terang jika had CCP dilanggar dan mewajibkan catatan pembetulan sebelum simpan. |
| **Kelajuan Pengisian Data** | Mengambil masa 8 hingga 12 minit setiap kali rondaan untuk mencari kolum di skrin tablet. | **Butang "Salin Slot Sebelum"**: Bacaan stabil boleh disalin dengan 1 klik, operator hanya perlu mengemas kini 1 atau 2 bacaan yang berubah. |

---

## 2.0 CARTA ALIRAN & WORKFLOW OPERASI PEMERIKSAAN

Bagi memastikan integriti data audit, proses pemeriksaan berjadual hendaklah mematuhi carta aliran kerja berikut:

### FLOWCHART 1: ALIRAN LENGKAP PEMERIKSAAN LOJI DARI MULA HINGGA HANTAR
```
+-------------------------------------------------------------------------------------------------------+
| FLOWCHART 1: ALIRAN LENGKAP PEMERIKSAAN LOJI SGMP/19/FUV                                              |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [ LANGKAH 1 ]       [ LANGKAH 2 ]       [ LANGKAH 3 ]       [ LANGKAH 4 ]       [ LANGKAH 5 ]        |
|  Log Masuk AIO  ---> Pilih Tarikh   ---> Pilih Slot     ---> Semak Status   ---> Ambil Bacaan &       |
|  Buka menu           & Syif Kerja        Masa Rondaan        Operasi Loji        Taip Nilai Meter     |
|  Forms > GMP >       (Pagi / Malam)      (cth: 9.30 am)      (RUNNING / OFF)     (Zon 01 hingga 06)   |
|  SGMP/19/FUV                                                                            |             |
|                                                                                         v             |
|  [ LANGKAH 8 ]       [ LANGKAH 7 ]       [ LANGKAH 6B ]      [ LANGKAH 6A ]     [ PEMERIKSAAN WARNA ] |
|  Pengesahan QC  <--- Tandatangan    <--- Tulis Tindakan <--- Amaran CCP!    <--- Semak Status Sel:    |
|  Penyelia semak      Digital Staf        Pembetulan          Merah Berkelip      Hijau = Selamat      |
|  & kunci rekod       & Simpan Rekod      (Jika Ada CCP)      (PG02/PG05/UV)      Kuning = Had Normal  |
|  (Audit-Proof)       Borang Syif                                                                      |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

### 2.1 Matriks Pengasingan Tugas (*Separation of Duties*)
* **Operator Rawatan Air / Operator Pengeluaran**:
  - Menjalankan rondaan fizikal di loji rawatan air setiap 2 jam.
  - Memasukkan bacaan sebenar meter ke dalam borang.
  - Mengambil tindakan segera jika terdapat amaran kuning atau merah.
  - Menurunkan e-tandatangan kakitangan bertugas di akhir syif.
* **Juruteknik Penyelenggaraan (*Maintenance Technician*)**:
  - Memeriksa keadaan fizikal pam, tiub UV, dan membran jika operator melaporkan ketidakteraturan.
  - Melakukan kerja *backwash* penapis media jika perbezaan tekanan `PG02` meningkat.
* **Penyelia Pengeluaran / Pegawai Kualiti (*Supervisor / QC Officer*)**:
  - Menyemak ketepatan bacaan keseluruhan 6 slot masa pada hujung syif.
  - Mengesahkan tindakan pembetulan yang dicatatkan bagi sebarang isu CCP.
  - Menurunkan tandatangan pengesahan (*Verified By*) yang mengunci (*lock*) dokumen secara kekal daripada sebarang pengubahsuaian.

---

## 3.0 PANDUAN PENGISIAN LANGKAH-DEMI-LANGKAH (STEP-BY-STEP UI GUIDE)

### Langkah 1: Capaian Modul Borang
1. Buka pelayar web pada tablet kilang atau komputer terminal pengeluaran.
2. Log masuk ke dalam sistem **BubblesO2 All-in-One (AIO)**.
3. Pada bar navigasi sebelah kiri, klik menu **Forms** > **GMP** > **Bahagian Production**.
4. Klik kad **Hazard and Process Control Records (SGMP/19/FUV)** atau layari pautan `/forms/maintenance/fuv`.

### Langkah 2: Pemilihan Tarikh & Syif Kerja
1. **Tarikh Pemeriksaan**: Sistem menetapkan tarikh hari ini secara automatik. Ubah jika anda memasukkan data tertangguh yang dibenarkan.
2. **Pilihan Syif Kerja**:
   - Klik **Syif Pagi (Day Shift)** bagi waktu kerja 07:30 AM hingga 05:30 PM (6 slot masa: 7.30 am, 9.30 am, 11.30 am, 1.30 pm, 3.30 pm, 5.30 pm).
   - Klik **Syif Malam (Night Shift)** bagi waktu kerja 07:30 PM hingga 05:30 AM (6 slot masa: 7.30 pm, 9.30 pm, 11.30 pm, 1.30 am, 3.30 am, 5.30 am).
   > [!IMPORTANT]
   > **Petua Khas Syif Malam**: Sekiranya anda bertugas pada malam 5 Mac (masuk 7.00 malam 5 Mac, balik 7.00 pagi 6 Mac), **sentiasa pilih tarikh 05/03/2026**. Walaupun slot 1.30 am, 3.30 am, dan 5.30 am berada pada hari kalendar berikutnya, sistem menggabungkannya di bawah tarikh syif yang sama untuk rekod audit harian 24 jam!
3. **Pemeriksa Bertugas**: Nama anda dimuatkan secara automatik daripada profil log masuk.

### Langkah 3: Penggunaan Bar Pil Navigasi Slot Masa
1. Di bawah bahagian pengepala, terdapat 6 butang pil slot masa mengikut syif anda.
2. Sistem secara pintar mengaktifkan slot masa terdekat dengan waktu semasa.
3. Anda boleh mengklik mana-mana pil untuk berpindah ke waktu rondaan tersebut.
4. Perhatikan lencana status pada setiap pil:
   - **Lencana Hijau (✓ Siap)**: Semua 21 bacaan telah selamat diisi.
   - **Lencana Biru (X/21 Diisi)**: Slot sedang diisi tetapi belum lengkap.
   - **Lencana Kelabu (OFF)**: Slot ditandakan sebagai henti tugas.
   - **Lencana Merah (🚨 Amaran CCP)**: Terdapat parameter CCP yang memerlukan perhatian segera.
   - **Lencana Putih / Titik Kelabu**: Slot belum dimulakan.

### Langkah 4: Semak Status Operasi (Togol RUNNING vs OFF)
1. Di bahagian atas kad pemeriksaan aktif, perhatikan togol status operasi:
   - Jika loji sedang berjalan normal: Biarkan pada status **Beroperasi (RUNNING)**.
   - Jika loji dimatikan (rehat, tiada pembotolan, cucian CIP/backwash): Klik butang **Henti Tugas (OFF)**. Sistem akan memaparkan notis downtime dan mengisi tanda `-` secara automatik.

### Langkah 5: Masukkan Bacaan Mengikut 6 Kad Zon Proses
1. Lakukan rondaan fizikal dan masukkan angka bacaan meter ke dalam kotak input yang disediakan bagi Zon 01 hingga Zon 06.
2. Setiap kotak mempunyai label tag meter (cth: `VFD01`), nama alat, unit metrik, dan had selamat.

### Langkah 6: Gunakan Ciri Produktiviti Pantas
* **Salin Slot Sebelum**: Jika loji beroperasi secara stabil dan bacaan tidak banyak berubah dari rondaan lepas, tekan butang **"Salin Slot Sebelum"**. Semua nilai slot terdahulu akan disalin serta-merta, dan anda hanya perlu mengemas kini nilai yang berbeza!
* **Simpan & Ke Slot Seterusnya**: Selepas selesai memeriksa satu slot, klik butang biru **"Simpan & Ke Slot Seterusnya"** di bawah kad untuk melompat terus ke slot masa berikutnya tanpa perlu skrol ke atas.

---

## 4.0 PANDUAN LENGKAP 21 PARAMETER MENGIKUT 6 ZON LOJI RAWATAN AIR

Berikut adalah jadual rujukan lengkap bagi setiap parameter yang wajib diperiksa dan direkodkan:

### MATRIKS 21 PARAMETER PROSES LOJI (SGMP/19/FUV)

| Zon Proses | Kod Tag | Nama Peralatan / Titik Ujian | Had Piawai Selamat | Unit | Kepentingan Parameter & Tindakan Operator |
| :---: | :---: | :--- | :--- | :---: | :--- |
| **Zon 01** | `VFD01` | Pam Air Mentah (Source Pump) | **Maksimum 25 Hz** | Hz | Mengawal kelajuan pam sedutan punca air bawah tanah. Jika melebihi 25 Hz, kotak jadi kuning. Kurangkan kelajuan pam pada panel kawalan. |
| **Zon 01** | `VFD02` | Pam Booster (Booster Pump) | **Maksimum 25 Hz** | Hz | Mengawal tekanan aliran air ke saluran pra-rawatan loji. Had maksimum 25 Hz untuk mengelakkan lonjakan tekanan saluran paip. |
| **Zon 02** | `SP01` | Ujian Air Mentah (pH & Rupa) | **pH 6.5 – 7.5** & Clear / No Colour | pH | Menguji keasidan air mentah dan rupa bentuk fizikal. Pilih *"Turbid / Coloured"* hanya jika air kelihatan keruh atau kekuningan. |
| **Zon 02** | `CS02` | Konduktiviti Air Mentah | **50 – 270 µS/cm** | µS/cm | Mengukur kandungan mineral semulajadi air mentah masuk. Julat normal Bubbles O2 ialah antara 50 hingga 270 µS/cm. |
| **Zon 02** | `PG01` | Tolok Tekanan Air Mentah | **Maksimum 1.1 Bar** | Bar | Tolok tekanan analog pada paip air mentah masuk sebelum penapisan media. |
| **Zon 02** | `PT01` | Pemancar Tekanan Air Mentah | **Maksimum 1.1 Bar** | Bar | Pemancar tekanan digital saluran air mentah. Bacaan hendaklah selari dengan `PG01`. |
| **Zon 03** | `SP02` | Sampel Air Sand Filter | **pH 6.5 – 7.5** & Clear / No Colour | pH | Ujian air selepas melalui penapis pasir silika (memerangkap keladak kasar). |
| **Zon 03** | `SP03` | Sampel Air Carbon Filter | **pH 6.5 – 7.5** & Clear / No Colour | pH | Ujian air selepas melalui penapis karbon teraktif (menyingkirkan bau dan rasa asing). |
| **Zon 03** | `PG02` | Tekanan Sand + Carbon **(CCP1)** | **MAKSIMUM 3.0 BAR** | Bar | **TITIK KAWALAN KRITIKAL (CCP1)**! Mengukur perbezaan tekanan penapis pasir & karbon. Jika jarum &gt; 3.0 Bar, kotak bertukar merah berkelip! Penapis tersumbat teruk — lakukan *backwash* segera. |
| **Zon 04** | `PG03` | 10µm Precision Filter | **Minimum 0.9 Bar** | Bar | Tolok tekanan penapis halus 10 mikron. Memastikan tekanan mencukupi sebelum masuk ke peringkat seterusnya. |
| **Zon 04** | `PT02` | 5µm Precision Filter | **Minimum 0.9 Bar** | Bar | Pemancar tekanan penapis halus 5 mikron. Mengelakkan zarah halus daripada memasuki liang membran UF. |
| **Zon 05** | `PT03` | Pemancar Tekanan Inlet UF | **Maksimum 9.0 Bar** | Bar | Tekanan air yang dipam masuk ke dalam modul membran ultrafiltrasi. |
| **Zon 05** | `PG04` | Tolok Tekanan Inlet UF | **Maksimum 9.0 Bar** | Bar | Tolok analog tekanan masuk membran UF. Nilai mestilah selari dengan `PT03`. |
| **Zon 05** | `PG05` | Tolok Tekanan Outlet UF **(CCP1)** | **MAKSIMUM 2.0 BAR** | Bar | **TITIK KAWALAN KRITIKAL (CCP1)**! Tekanan saluran keluar air tulen (*permeate*). Jika melebihi 2.0 Bar, terdapat rintangan bahaya pada modul membran. Kotak bertukar merah berkelip! |
| **Zon 05** | `CS01` | Konduktiviti Outlet UF | **50 – 270 µS/cm** (&le; CS02) | µS/cm | Konduktiviti air selepas membran. Nilai mestilah sama atau lebih rendah daripada nilai air mentah `CS02`. |
| **Zon 05** | `FM01` | Kadar Aliran Air Telap (Permeate) | Mengikut Kapasiti Aliran | m³/Hr | Mengukur isipadu air bersih yang terhasil daripada membran per jam. |
| **Zon 05** | `PG06` | Tolok Tekanan Reject Line | **Nil (Tiada Tekanan Berlebihan)** | Bar | Tolok tekanan pada talian buangan pekat membran. Bacaan hendaklah rendah/bebas halangan. |
| **Zon 05** | `FM02` | Kadar Aliran Reject Line | **1.2 – 1.8 m³/Hr** | m³/Hr | Kadar aliran air buangan pembersihan membran berterusan. Mesti berada dalam julat 1.2 hingga 1.8 m³/Hr untuk mengelakkan kerak membran. |
| **Zon 06** | `UV INTENSITY` | Keamatan Sinaran UV **(CCP2)** | **80% – 99%** | % | **TITIK KAWALAN KRITIKAL (CCP2)**! Keamatan cahaya ultraviolet untuk membunuh kuman dan bakteria patogen. Jika bacaan bawah 80%, kotak bertukar merah berkelip! Air TIDAK BOLEH dibotolkan! |
| **Zon 06** | `OPERATING HOUR`| Jam Hayat Lampu UV | **Maksimum 9000 Jam** | Jam (Hr) | Hayat tiub lampu UV. Jika melebihi 9000 jam, kecekapan sinaran merosot dan tiub lampu wajib diganti baharu oleh bahagian Maintenance. |
| **Zon 06** | `RUNNING DAYS` | Jumlah Hari Beroperasi | Hari Kumulatif | Hari | Catatan jumlah hari modul rawatan beroperasi secara berterusan. |

---

## 5.0 PENGENDALIAN HENTI TUGAS (OFF / DOWNTIME WORKFLOW)

Dalam operasi harian kilang pembotolan, terdapat situasi di mana loji rawatan air dihentikan operasinya secara terancang atau tidak terancang:
1. Waktu rehat makan tengah hari atau pertukaran syif operasi kilang.
2. Aktiviti pencucian rutin penapis pasir dan karbon (*Backwashing Routine*).
3. Aktiviti sanitasi saluran paip (*Cleaning-in-Place / CIP*).
4. Ketiadaan pesanan pembotolan atau tangki simpanan air bersih sudah penuh (*Buffer Tank Full*).

### Peraturan Pengendalian Status OFF:
* **JANGAN BIARKAN SLOT KOSONG**: Dalam audit GMP KKM, sel yang dibiarkan kosong tanpa sebarang tanda dianggap sebagai kecuaian operator atau pemalsuan rekod pemeriksaan.
* **CARA MENGGUNAKAN TOGOL PINTAR**:
  1. Klik slot masa pemeriksaan berkenaan (contoh: 1.30 pm).
  2. Pada suis togol status di bahagian atas kad, klik butang **"Henti Tugas (OFF)"**.
  3. Sistem secara automatik menukar status slot kepada `isOff = true`, mengisi semua bacaan dengan tanda `-`, dan memaparkan notis banner kuning kelabu: *"Loji / Mesin Dimatikan (Downtime) pada 1.30 pm"*.
  4. Sekiranya mesin kembali beroperasi dalam slot yang sama, hanya klik butang **"Beroperasi (RUNNING)"** untuk memulihkan kotak input normal.

---

## 6.0 PROSEDUR TINDAKAN KECEMASAN & PELANGGARAN TITIK KAWALAN KRITIKAL (CCP1 & CCP2)

Titik Kawalan Kritikal (*Critical Control Point - CCP*) adalah garisan keselamatan mutlak dalam pensijilan HACCP dan GMP. Pelanggaran had CCP bermaksud produk minuman berpotensi membahayakan pengguna jika tidak dikawal serta-merta.

### 6.1 Sistem Lampu Isyarat Digital (Traffic Light Indicators)
Sistem AIO memaparkan status visual masa nyata bagi setiap input:
* 🟢 **HIJAU (Normal)**: Bacaan berada dalam julat had piawai yang selamat.
* 🟡 **KUNING (Amaran Had)**: Bacaan sedikit tersasar daripada julat optimum tetapi belum mencapai tahap kritikal (contoh: `VFD01` = 26 Hz, atau pH = 6.4). Operator perlu memantau teliti pada rondaan berikutnya.
* 🔴 **MERAH BERKELIP (Pelanggaran Had CCP)**: Parameter melepasi had bahaya mandatori. Kotak input berkelip merah terang dan amaran kecemasan dipaparkan di bahagian atas skrin.

### 6.2 Dua Titik Kawalan Kritikal Mandatori:
1. **CCP1 (Penapisan Fizikal)**:
   - `PG02` (Tekanan Sand + Carbon) &gt; **3.0 Bar**
   - `PG05` (Tekanan Saluran Keluar UF) &gt; **2.0 Bar**
   - *Bahaya*: Membran atau tangki penapis tersumbat/koyak, risiko bendasing fizikal dan pasir terlepas ke saluran air bersih.
2. **CCP2 (Pensterilan Mikrobiologi)**:
   - `UV INTENSITY` &lt; **80%** (atau &gt; 99% ralat sensor)
   - *Bahaya*: Tenaga sinaran UV tidak mencukupi untuk memusnahkan bakteria dan spora mikroorganisma. Kuman berbahaya boleh hidup di dalam botol minuman!

### 6.3 Tindakan Pembetulan Mandatori (*Corrective Action Protocol*):
Apabila sebarang bacaan merah dikesan:
1. **HENTIKAN PENGISIAN BOTOL SERTA-MERTA**: Maklumkan kepada Leader Line atau Operator Pengisian (*Filling Station*) untuk menghentikan pengisian air ke dalam botol.
2. **MAKLUMKAN KEPADA PEGAWAI KUALITI (QC) & SUPERVISOR**: Panggil Pegawai QC untuk mengambil sampel air dan maklumkan kepada Juruteknik Maintenance.
3. **WAJIB MENGISI RUANGAN CATATAN / REMARKS**:
   - Sistem AIO **MENYEKAT SEPENUHNYA** butang simpan borang selagi ruangan *Catatan / Tindakan Pembetulan* dibiarkan kosong.
   - Operator mesti menulis:
     - Masa berlaku dan parameter yang lari (cth: *"Jam 9.30 am, UV Intensity jatuh kepada 74%"*).
     - Tindakan serta-merta yang diambil (cth: *"Mesin pengisian dihentikan serta-merta. Maklumkan En. Azlan (Maintenance). Tiub lampu UV telah diganti baharu dan keamatan kembali ke 96%"*).
     - Pengesahan keselamatan (cth: *"Sampel air dihantar ke makmal mikrobiologi QC. Kelulusan sambung operasi diberikan oleh Pn. Siti (QA)"*).

---

## 7.0 PENGESAHAN, TANDATANGAN DIGITAL & KUNCI REKOD AUDIT (LOCK AUDIT-PROOF)

Bagi menjamin kesahihan dan mematuhi Seksyen 11 Akta Kualiti Makanan, setiap borang harian wajib melalui proses pengesahan dua peringkat:

### 7.1 Peringkat 1: Tandatangan Operator Bertugas (Operator Sign-off)
1. Setelah semua 6 slot masa selesai diisi (atau ditandakan OFF), skrol ke bahagian bawah halaman ke seksyen **Ringkasan Rekod, Catatan & Tandatangan Digital**.
2. Semak kaunter penyelesaian slot: Pastikan tertera `Semua 6 Slot Selesai` (atau jumlah slot yang telah selesai).
3. Turunkan tandatangan digital anda di dalam kotak **Signature Pad** menggunakan jari (jika menggunakan tablet) atau tetikus (*mouse*).
4. Klik butang **Simpan Rekod Syif (SGMP/19/FUV)**.
5. Skrin pengesahan hijau akan muncul menyatakan rekod telah selamat disimpan ke dalam pangkalan data.

### 7.2 Peringkat 2: Pengesahan Penyelia / QC (*Supervisor Verification & Lock*)
1. Pada penghujung hari atau pertukaran syif, Penyelia Pengeluaran atau Pegawai QA/QC membuka modul **Laporan & Ringkasan Penyelenggaraan** (`/forms/maintenance/summary`).
2. Penyelia memeriksa rekod harian, memastikan tiada bacaan abnormal yang dibiarkan tanpa tindakan pembetulan.
3. Penyelia menurunkan e-tandatangan pada ruangan **Verified By**.
4. **PENGUNCIAN AUDIT-PROOF (AUDIT LOCK)**:
   - Sebaik sahaja disahkan oleh Penyelia, rekod tersebut secara automatik **DIKUNCI (LOCKED)**.
   - Lambang mangga emas (🔒) akan dipaparkan pada borang.
   - Semua kotak input, pilihan tarikh, syif, dan butang simpan dinyahaktifkan secara kekal.
   - Tiada sesiapa (termasuk operator mahupun staf IT) dibenarkan mengubah data sejarah ini bagi memelihara integriti perundangan dan ketulenan audit KKM.

---

## 8.0 PANDUAN PENYELESAIAN MASALAH LAZIM (TROUBLESHOOTING MATRIX)

| Simptom Masalah | Punca Utama | Langkah Pembetulan Segera |
| :--- | :--- | :--- |
| **Butang "Simpan Rekod Syif" tidak boleh ditekan (berwarna pudar / disabled).** | 1. Tandatangan digital belum diturunkan.<br />2. Terdapat pelanggaran had CCP tetapi ruangan Catatan masih kosong.<br />3. Rekod telah disahkan dan dikunci oleh Penyelia. | 1. Turunkan tandatangan di pad tanda tangan.<br />2. Masukkan alasan dan tindakan pembetulan dalam kotak Catatan jika ada bacaan merah.<br />3. Jika rekod sudah dikunci (🔒), hubungi Superadmin jika terdapat rayuan pembetulan khas. |
| **Skrin tablet memaparkan amaran "Gagal memuat rekod bagi tarikh/syif".** | Sambungan Wi-Fi loji terputus atau tablet berada di luar liputan rangkaian kilang. | Pastikan tablet bersambung dengan Wi-Fi `BubblesO2_Production`. Muat semula (*refresh*) halaman pelayar web. Sistem mempunyai draf tempatan yang memelihara data anda. |
| **Saya tersalah taip nombor (contoh: sepatutnya 1.2 tapi tertaip 12).** | Kesilapan taip semasa menekan papan kekunci. | Selagi rekod belum dikunci oleh Penyelia, buka semula borang pada tarikh dan syif tersebut, pilih slot masa yang salah, taip nombor yang betul, dan tekan **Simpan Rekod Syif**. |
| **Butang "Salin Slot Sebelum" tidak berfungsi.** | Anda sedang berada pada slot pertama (7.30 am / 7.30 pm) di mana tiada slot terdahulu dalam syif aktif. | Butang salin hanya aktif bermula dari slot kedua (9.30 am ke atas) kerana ia memerlukan rekod slot sebelumnya sebagai sumber salinan. |
| **Borang memaparkan paparan jadual lama yang melebar.** | Pilihan paparan berada pada mod *Jadual Matriks Penuh*. | Di sudut atas kanan bar maklumat syif, klik butang **"Mod Kad Slot (Fokus)"** untuk kembali kepada paparan kad yang mudah. |

---

## 9.0 SOALAN-SOALAN LAZIM OPERATOR (OPERATOR FAQ)

**S1: "Saya baru masuk kerja syif malam jam 7.00 malam 12 Ogos dan tamat kerja jam 7.00 pagi 13 Ogos. Tarikh mana yang patut saya pilih?"**  
**Jawapan:** Sentiasa pilih tarikh **anda mula masuk kerja**, iaitu **12 Ogos**. Jangan tukar tarikh kepada 13 Ogos walaupun jam sudah melepasi 12 tengah malam. Sistem AIO menyatukan semua rekod rondaan syif malam di bawah tarikh hari pertama masuk kerja.

**S2: "Masa jam 3.30 petang loji berhenti sebab bekalan elektrik terputus (blackout). Macam mana saya nak rekod?"**  
**Jawapan:** Buka slot 3.30 pm, klik togol **"Henti Tugas (OFF)"**. Kemudian, di ruangan Catatan bawah borang, catatkan: *"Jam 3.30 pm: Bekalan elektrik TNB terputus, loji berhenti beroperasi sehingga jam 4.15 pm"*.

**S3: "Berapa lama masa yang saya ada untuk isi borang selepas jam rondaan?"**  
**Jawapan:** Anda dinasihatkan mengisi bacaan dalam tempoh **15 hingga 30 minit** selepas waktu rondaan yang ditetapkan bagi mengelakkan lupa nombor bacaan dan memastikan data sentiasa dikemas kini dalam masa nyata.

**S4: "Bolehkah saya gunakan butang Simpan Draf kalau belum habis semua 6 slot?"**  
**Jawapan:** Ya, sangat digalakkan! Setiap kali selesai mengisi satu slot (contoh: selepas isi slot 7.30 am), anda boleh menekan butang **"Simpan Draf"**. Sekiranya bateri tablet habis atau aplikasi tertutup, data anda selamat disimpan dalam storan pelayar.

---

## 10.0 GLOSARI ISTILAH TEKNIKAL & KUALITI (BAHASA OPERATOR)

* **VFD (*Variable Frequency Drive*)**: Alat kawalan kelajuan motor elektrik pada pam air mentah dan pam booster. Bacaan diukur dalam unit Hertz (Hz).
* **Bar**: Unit sukatan tekanan cecair dalam paip loji (1 Bar bersamaan lebih kurang 14.5 PSI).
* **µS/cm (*Micro-Siemens per Centimeter*)**: Unit sukatan konduktiviti elektrik air yang menunjukkan jumlah kandungan mineral semulajadi terlarut dalam air.
* **Permeate**: Air bersih yang berjaya melepasi liang membran ultrafiltrasi untuk disalurkan ke tangki pembotolan.
* **Reject Line**: Air buangan pekat yang membawa keluar mendapan yang terperangkap pada permukaan membran bagi mengelakkan membran tersumbat.
* **Backwash**: Proses membalikkan arah aliran air untuk mencuci dan membuang keladak yang terperangkap dalam penapis pasir silika dan karbon.
* **Titik Kawalan Kritikal (CCP)**: Tahap atau peringkat kawalan di mana kawalan boleh dilakukan dan penting untuk mencegah, menghapuskan atau mengurangkan bahaya keselamatan makanan ke tahap yang boleh diterima.
* **Audit-Proof**: Keadaan rekod digital yang dilindungi dengan jejak audit selamat dan tidak boleh diubah atau dipadamkan sesuka hati tanpa kebenaran pihak berkuasa audit.

---
*Dokumen Kawalan Kualiti Rasmi • BUBBLESO2 ALL-IN-ONE (AIO) SYSTEM • Kilang Sumber Mineral Semulajadi Rantau, N. Sembilan • Versi 1.0 (Rev 2026.09)*
