# Panduan Penuh: Penyediaan E-Invoice (Corporate) Google Form & Integrasi Webhook AIO System

Panduan ini menerangkan cara menyediakan **Google Form** untuk **E-Invoice Details - Customer (Direct Delivery)** dan cara memasang skrip **Google Apps Script** supaya setiap kali pelanggan mengisi borang, data pesanan dan maklumat e-invois dihantar secara automatik ke dalam **BubblesO2 All-in-One (AIO) System** di bawah tab **Documents**.

---

## 1. STRUKTUR SOALAN GOOGLE FORM

Sila buka Google Form anda di Google Drive (atau buka pautan borang sedia ada):  
`E-Invoice (Corporate) Form`

Cipta soalan-soalan berikut mengikut urutan dan jenis soalan (*Question Type*) yang ditetapkan:

| No | Tajuk Soalan (Question Title) | Jenis Soalan (Type) | Wajib (Required)? | Nota Tambahan |
|---|---|---|:---:|---|
| **1** | `Nama penuh (seperti dalam IC)` | Short answer | **Ya (Required)** | Nama rasmi individu/pemilik seperti dalam MyKad. |
| **2** | `No. Telefon (Active)` | Short answer | **Ya (Required)** | Contoh: `0123456789` |
| **3** | `Alamat Penuh (berserta poskod, bandar & negeri)` | Paragraph | **Ya (Required)** | Alamat lengkap premis penghantaran terus (*Direct Delivery*). |
| **4** | `Email (Active)` | Short answer | **Ya (Required)** | Emel aktif untuk penghantaran e-Invois LHDN. |
| **5** | `No. IC (wajib isi)` | Short answer | **Ya (Required)** | Nombor kad pengenalan (cth: `900101015555` atau `900101-01-5555`). |
| **6** | `Order Item (Product SKU)` | Dropdown / Multiple Choice | **Ya (Required)** | Masukkan 3 pilihan SKU berikut:<br>1. `BUBBLES O2 425ML (24 BOTTLE / CARTON) [B2O2-425-24]`<br>2. `BUBBLES O2 800ML (20 BOTTLE / CARTON) [B2O2-800-20]`<br>3. `BUBBLES O2 800ML (12 BOTTLE / CARTON) [B2O2-800-12]` |
| **7** | `Quantity (Carton)` | Short answer | **Ya (Required)** | Tetapkan pengesahan nombor (*Response validation: Number > 0*). |
| **8** | `Catatan Tambahan (Remarks)` | Paragraph | Tidak (Optional) | Sebarang arahan khas penghantaran atau maklumat pesanan. |

---

## 2. CARA MEMBUKA GOOGLE APPS SCRIPT EDITOR

1. Pada halaman editor Google Form anda, klik pada butang menu **Tiga Titik (⋮)** di penjuru kanan sebelah atas (bersebelahan butang *Send/Publish*).
2. Pilih dan klik **`< > Script editor`** (atau *Editor Skrip*).
3. Tab baru Google Apps Script akan dibuka.
4. Namakan projek di bahagian atas sebagai: `BubblesO2 E-Invoice Webhook`.
5. Padamkan semua kod contoh sedia ada di dalam fail `Code.gs`.

---

## 3. SKRIP GOOGLE APPS SCRIPT (`Code.gs`)

Salin (*copy*) kod lengkap di bawah dan tampal (*paste*) ke dalam fail `Code.gs` anda:

```javascript
/**
 * BubblesO2 All-in-One (AIO) System - E-Invoice Corporate Form Webhook
 * Automated trigger on form submission to push customer & order details into AIO Documents Queue.
 */

// Konfigurasi URL Webhook Sistem BubblesO2 AIO
const WEBHOOK_URL = "https://bubbleso2-aio.vercel.app/api/webhooks/e-invoice-form";

// Kunci Rahsia (Webhook Secret) - sepadan dengan GOOGLE_FORM_WEBHOOK_SECRET di Vercel
const WEBHOOK_SECRET = "bubbleso2_gform_secret_2026";

/**
 * Fungsi utama yang dipanggil secara automatik apabila borang dihantar
 */
function onFormSubmit(e) {
  try {
    if (!e || !e.response) {
      Logger.log("Ralat: Tiada event object response dikesan.");
      return;
    }

    const itemResponses = e.response.getItemResponses();
    const payload = {
      formResponseId: e.response.getId(),
      submissionTimestamp: e.response.getTimestamp().toISOString(),
      deliveryMode: "Direct Delivery", // Tetapan tetap direct delivery
    };

    // Baca setiap jawapan yang diisi oleh responden
    for (var i = 0; i < itemResponses.length; i++) {
      var itemResponse = itemResponses[i];
      var title = itemResponse.getItem().getTitle().trim();
      var answer = itemResponse.getResponse();

      if (title.indexOf("Nama penuh") !== -1) {
        payload.fullName = String(answer).trim();
      } else if (title.indexOf("No. Telefon") !== -1 || title.indexOf("Telefon") !== -1) {
        payload.phone = String(answer).trim();
      } else if (title.indexOf("Alamat Penuh") !== -1 || title.indexOf("Alamat") !== -1) {
        payload.address = String(answer).trim();
      } else if (title.indexOf("Email") !== -1 || title.indexOf("Emel") !== -1) {
        payload.email = String(answer).trim();
      } else if (title.indexOf("No. IC") !== -1 || title.indexOf("IC") !== -1) {
        payload.icNumber = String(answer).trim();
      } else if (title.indexOf("Order Item") !== -1 || title.indexOf("SKU") !== -1) {
        payload.orderItem = String(answer).trim();
      } else if (title.indexOf("Quantity") !== -1 || title.indexOf("Kuantiti") !== -1) {
        payload.quantity = Number(answer) || 1;
      } else if (title.indexOf("Catatan") !== -1 || title.indexOf("Remarks") !== -1) {
        payload.remarks = String(answer).trim();
      }
    }

    Logger.log("Payload yang akan dihantar: " + JSON.stringify(payload));

    // Hantar data ke AIO System melalui HTTP POST
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "x-google-form-secret": WEBHOOK_SECRET,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    Logger.log("HTTP Response Code: " + responseCode);
    Logger.log("HTTP Response Body: " + responseBody);

    if (responseCode >= 200 && responseCode < 300) {
      Logger.log("BERJAYA: Data E-Invoice telah masuk ke AIO Documents Queue!");
    } else {
      Logger.log("AMARAN: Webhook gagal diproses dengan status " + responseCode);
    }
  } catch (error) {
    Logger.log("Ralat semasa menjalankan onFormSubmit: " + error.toString());
  }
}
```

6. Tekan ikon **Simpan (Save / 💾)** di bar alat atas.

---

## 4. CARA MEMASANG TRIGGER (PENCETUS AUTOMATIK)

Untuk memastikan skrip berjalan setiap kali borang dihantar oleh responden:

1. Pada menu bar sebelah kiri Google Apps Script editor, klik pada ikon **Jam (Triggers / Pencetus)**.
2. Klik butang biru di penjuru bawah kanan: **`+ Add Trigger`** (atau *Tambah Pencetus*).
3. Buat tetapan berikut pada tetingkap konfigurasi:
   - **Choose which function to run:** Pilih `onFormSubmit`
   - **Choose which deployment should run:** Pilih `Head`
   - **Select event source:** Pilih `From form` (*Daripada borang*)
   - **Select event type:** Pilih `On form submit` (*Semasa menghantar borang*)
   - **Failure notification settings:** Pilih `Notify me immediately` (Pilihan)
4. Klik **Save** (Simpan).
5. Tetingkap Google akan meminta kebenaran akaun (*Authorization*):
   - Pilih akaun Google anda.
   - Jika keluar amaran *"Google hasn't verified this app"*, klik **Advanced** di bahagian bawah kiri.
   - Klik pautan **Go to BubblesO2 E-Invoice Webhook (unsafe)**.
   - Klik **Allow** untuk membenarkan kebenaran sambungan internet (*UrlFetch*).

---

## 5. UJIAN & PENGESAHAN DALAM AIO SYSTEM

1. Buka pautan paparan responden Google Form anda (*Preview Mode* / ikon mata 👁️).
2. Isi borang percubaan dengan maklumat ujian:
   - **Nama penuh:** `Ahmad Fakhrul Bin Hassan`
   - **No. Telefon:** `0139876543`
   - **Alamat Penuh:** `No. 12, Jalan Perdana 4, Taman Perdana, 43000 Kajang, Selangor`
   - **Email:** `fakhrul@example.com`
   - **No. IC:** `880512-10-5431`
   - **Order Item:** `BUBBLES O2 425ML (24 BOTTLE / CARTON) [B2O2-425-24]`
   - **Quantity:** `10`
3. Klik **Submit** (Hantar).
4. Sekarang, buka portal AIO System anda di pelayar web:  
   `https://aio.bubbleso2.com/forms/sales-ordering/documents` (atau menu **Documents**).
5. **Keputusan Dalam Sistem:**
   - Rekod pesanan baru akan muncul secara serta-merta di dalam tab **Documents**.
   - Dilabelkan dengan badge berwarna ungu: `E-Invoice Form` dan label biru: `Direct Delivery`.
   - Memaparkan nombor IC dan jumlah nilai ringgit yang dikira secara automatik mengikut harga rasmi BubblesO2 (cth: RM 360.00 untuk 10 CTN 425ml).
   - Pasukan SOD hanya perlu klik **Review** untuk menyemak dan menekan butang **Approve & Create Sales Order**!
