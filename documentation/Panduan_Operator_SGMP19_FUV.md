# PANDUAN MUDAH OPERATOR KILANG: CARA MENGISI BORANG HAZARD & KAWALAN PROSES (SGMP-19/FUV)

**Bubbles O2 Sdn Bhd - Kilang Rantau, Negeri Sembilan**  
*Versi Dokumen: Rev 4 (1/9/2026) | Kategori: Panduan Visual Staf Kilang | Mesra & Mudah Difahami*

---

## 1.0 KENAPA KITA WAJIB ISI BORANG INI SETIAP HARI?

Air mineral semulajadi **Bubbles O2** diminum oleh beribu-ribu keluarga setiap hari. Catatan bacaan meter ini adalah bukti bahawa:
1. **Air Kita Bersih & Selamat:** Tiada kuman bahaya, tiada keladak, dan kualiti sentiasa terjamin.
2. **Mesin Sentiasa Sihat:** Pam, penapis membran, dan penapis karbon tidak meletup atau tersumbat.
3. **Lulus Pemeriksaan KKM & Halal JAKIM:** Bila pegawai audit datang ke kilang, rekod kita lengkap, teratur, dan jujur!

---

## 2.0 CARTA ALIRAN KERJA: 5 LANGKAH MUDAH DARI A SAMPAI Z

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  1. LOG MASUK   │ ──> │  2. PILIH SYIF   │ ──> │ 3. TENGOK METER  │ ──> │  4. TAIP NOMBOR   │ ──> │ 5. SIGN & HANTAR │
│ Buka sistem AIO │     │ Pagi atau Malam  │     │ Jarum di mesin   │     │ Hijau=OK/Merah=CCP│     │ Pad e-tandatangan│
└─────────────────┘     └──────────────────┘     └──────────────────┘     └───────────────────┘     └──────────────────┘
```

### Langkah 1: Buka Sistem
- Buka tablet atau komputer kilang.
- Pergi ke menu **Forms > GMP** (atau terus ke `/forms/maintenance`).
- Klik kad **SGMP/19/FUV - Hazard and Process Control Records** di bawah bahagian **PRODUCTION**.

### Langkah 2: Pilih Tarikh & Syif
- **Syif Pagi (Day Shift):** Waktu rondaan 7.30 am, 9.30 am, 11.30 am, 1.30 pm, 3.30 pm, 5.30 pm.
- **Syif Malam (Night Shift):** Waktu rondaan 7.30 pm, 9.30 pm, 11.30 pm, 1.30 am, 3.30 am, 5.30 am.
- *Petua Syif Malam:* Pilih tarikh hari anda masuk kerja malam tersebut!

### Langkah 3: Baca Meter & Taip Nombor
- Setiap 2 jam, bawa tablet ke loji rawatan air (WTP).
- Lihat nombor meter dan taip dalam kotak berkenaan.

### Langkah 4: Perhatikan Warna Skrin (Lampu Isyarat)
- 🟢 **HIJAU (Normal):** Teruskan, bacaan selamat!
- 🟡 **KUNING (Awas):** Bacaan menghampiri had, perhatikan dengan teliti.
- 🔴 **MERAH BERKELIP (Bahaya Titik Kritikal CCP):** Tolok penapis PG02 > 3 Bar, PG05 > 2 Bar, atau lampu UV < 80%.
  - **WAJIB:** Tulis tindakan pembetulan dalam kotak **Catatan / Remarks**.
  - Panggil Leader / Supervisor / QC datang periksa mesin serta-merta!

### Langkah 5: Tandatangan & Hantar
- Di bawah borang, turunkan tandatangan anda menggunakan jari atau stylus pen.
- Tekan butang hijau **Hantar Rekod**. Selesai!

---

## 3.0 JADUAL PENGENALAN 5 KUMPULAN METER MESIN

| Kumpulan | Kod Meter | Nama Alat & Bahagian | Had Selamat | Apa Tindakan Anda? |
|:---:|:---:|:---|:---|:---|
| **1** | **VFD01, VFD02** | Pam Air Mentah & Booster Pump | Max 25 Hz | Taip nombor Hz (cth: 22.5). Jika lebih 25 Hz, sel jadi kuning. |
| **2** | **SP01, SP02, SP03** | Kualiti Air (Air Mentah, Pasir, Karbon) | pH 6.5 - 7.5 & Jernih | Taip nombor pH (cth: 7.2). Status air lalai "Clear / No Colour". |
| **3** | **PG02 (CCP1)** | Tekanan Penapis Pasir & Karbon | **Max 3.0 Bar** | **TITIK KRITIKAL!** Jika jarum lebih 3 Bar, penapis tersumbat. Buat backwash segera. |
| **4** | **PG04, PT03** | Tekanan Saluran Masuk UF | Max 9.0 Bar | Taip nombor bacaan tekanan. |
| **4** | **PG05 (CCP1)** | Tekanan Saluran Keluar UF | **Max 2.0 Bar** | **TITIK KRITIKAL!** Jika lebih 2 Bar, bahaya tekanan balik. |
| **4** | **CS01, CS02** | Konduktiviti Saluran Air | 50 - 270 µS/cm | CS01 mesti sama atau kurang dari CS02. |
| **4** | **FM02** | Kadar Aliran Salur Buang UF | 1.2 - 1.8 m3/Hr | Pastikan air buangan mengalir dalam julat ini. |
| **5** | **UV INTENSITY (CCP2)** | Keamatan Lampu Pembunuh Kuman | **80% - 99%** | **TITIK KRITIKAL!** Jika bawah 80% atau 0% (lampu padam), kuman tak mati! Hentikan pembotolan & panggil QC! |
| **5** | **OPERATING HOUR** | Jam Hayat Lampu UV | Had 9000 Jam | Rekod jam operasi kumulatif. |

---

## 4.0 SOALAN LAZIM (FAQ) OPERATOR

**S: Mesin rehat atau tengah cuci (backwash), macam mana nak isi?**  
J: Tandakan kotak semak **"OFF / Downtime"** bagi jam tersebut. Semua kotak bertukar '-' dan sistem tidak akan menaikkan amaran merah.

**S: Kenapa butang Hantar Rekod tak boleh tekan?**  
J: Semak jika ada sel merah berkelip (CCP). Jika ada, anda wajib menulis penerangan tindakan pembetulan di ruangan **Catatan / Remarks** dan pastikan pad tandatangan telah ditandatangani.

**S: Saya tersalah taip, boleh edit balik ke?**  
J: Boleh, selagi rekod belum disahkan dan dikunci oleh Penyelia. Buka semula borang, betulkan bacaan, dan tekan **Kemaskini Rekod**.

---
*Bubbles O2 Sdn Bhd | Kompleks Al-Ammar, Kg Kanchong, Rantau, N. Sembilan*
