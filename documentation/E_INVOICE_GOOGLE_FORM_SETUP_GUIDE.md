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
| **2** | `Nama Company (Jika Ada)` | Short answer | Tidak (Optional) | Nama syarikat / perniagaan untuk pendaftaran korporat. |
| **3** | `Sijil SSM (Jika Ada)` | File upload / Short answer | Tidak (Optional) | Salinan sijil SSM (PDF/Imej) atau No. Pendaftaran SSM. |
| **4** | `No. Telefon (Active)` | Short answer | **Ya (Required)** | Contoh: `0123456789` |
| **5** | `No Telefon PIC (Jika Ada)` | Short answer | Tidak (Optional) | No. telefon individu yang boleh dihubungi (Person-in-Charge). |
| **6** | `Alamat Penuh (berserta poskod, bandar & negeri)` | Paragraph | **Ya (Required)** | Alamat lengkap premis penghantaran terus (*Direct Delivery*). |
| **7** | `Email (Active)` | Short answer | **Ya (Required)** | Emel aktif untuk penghantaran e-Invois LHDN. |
| **8** | `No. IC (wajib isi)` | Short answer | **Ya (Required)** | Nombor kad pengenalan (cth: `900101015555` atau `900101-01-5555`). |
| **9** | `Catatan Tambahan (Remarks)` | Paragraph | Tidak (Optional) | Sebarang arahan khas penghantaran atau maklumat pesanan. |

---

## 2. CARA MEMBUKA GOOGLE APPS SCRIPT EDITOR

1. Pada halaman editor Google Form anda, klik pada butang menu **Tiga Titik (⋮)** di penjuru kanan sebelah atas (bersebelahan butang *Send/Publish*).
2. Pilih dan klik **`< > Script editor`** (atau *Editor Skrip*).
3. Tab baru Google Apps Script akan dibuka.
4. Namakan projek di bahagian atas sebagai: `BubblesO2 E-Invoice Webhook`.
5. Padamkan semua kod contoh sedia ada di dalam fail `Code.gs`.

---

## 3. SKRIP GOOGLE APPS SCRIPT (`Code.gs`)

Salin (*copy*) kod lengkap yang telah dikemaskini di bawah dan tampal (*paste*) ke dalam fail `Code.gs` anda:

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
      var titleLower = title.toLowerCase();
      var answer = itemResponse.getResponse();

      if (!answer) continue;

      // 1. Semak maklumat korporat & PIC dahulu bagi mengelakkan pertindihan
      if (titleLower.indexOf("company") !== -1 || titleLower.indexOf("syarikat") !== -1) {
        payload.companyName = String(answer).trim();
      } else if (titleLower.indexOf("ssm") !== -1) {
        // Jika soalan jenis File Upload (mengandungi ID fail Google Drive)
        function processDriveFile(fileId) {
          try {
            var file = DriveApp.getFileById(fileId);
            // Tetapkan kebenaran supaya sesiapa yang mempunyai pautan boleh melihat sijil SSM
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            return "https://drive.google.com/file/d/" + fileId + "/preview";
          } catch (err) {
            Logger.log("Ralat menetapkan kebenaran fail Drive " + fileId + ": " + err.toString());
            return "https://drive.google.com/file/d/" + fileId + "/preview";
          }
        }

        if (Array.isArray(answer)) {
          payload.ssmCert = answer.map(function(id) { 
            return processDriveFile(id); 
          }).join(", ");
        } else if (typeof answer === "string" && answer.length > 20 && answer.indexOf(" ") === -1 && answer.indexOf("/") === -1) {
          payload.ssmCert = processDriveFile(answer);
        } else {
          payload.ssmCert = String(answer).trim();
        }
      } else if (titleLower.indexOf("pic") !== -1) {
        payload.picPhone = String(answer).trim();
      } 
      // 2. Maklumat peribadi & perhubungan
      else if (titleLower.indexOf("nama penuh") !== -1 || titleLower.indexOf("nama") !== -1) {
        payload.fullName = String(answer).trim();
      } else if (titleLower.indexOf("telefon") !== -1) {
        payload.phone = String(answer).trim();
      } else if (titleLower.indexOf("alamat") !== -1) {
        payload.address = String(answer).trim();
      } else if (titleLower.indexOf("email") !== -1 || titleLower.indexOf("emel") !== -1) {
        payload.email = String(answer).trim();
      } else if (titleLower.indexOf("ic") !== -1 || titleLower.indexOf("kad pengenalan") !== -1) {
        payload.icNumber = String(answer).trim();
      } else if (titleLower.indexOf("catatan") !== -1 || titleLower.indexOf("remarks") !== -1) {
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
   - Klik **Allow** untuk membenarkan kebenaran sambungan internet (*UrlFetch*) dan pengurusan fail Google Drive (*DriveApp*) supaya sistem boleh memberikan akses pratonton kepada dokumen SSM yang dimuat naik.

---

## 5. UJIAN & PENGESAHAN DALAM AIO SYSTEM

1. Buka pautan paparan responden Google Form anda (*Preview Mode* / ikon mata 👁️).
2. Isi borang percubaan dengan maklumat ujian:
   - **Nama penuh:** `Ahmad Fakhrul Bin Hassan`
   - **No. Telefon:** `0139876543`
   - **Alamat Penuh:** `No. 12, Jalan Perdana 4, Taman Perdana, 43000 Kajang, Selangor`
   - **Email:** `fakhrul@example.com`
   - **No. IC:** `880512-10-5431`
   - **Nama Company (Jika Ada):** `Fakhrul Enterprise`
   - **No Telefon PIC (Jika Ada):** `0191234567`
3. Klik **Submit** (Hantar).
4. Sekarang, buka portal AIO System anda di pelayar web:  
   `https://bubbleso2-aio.vercel.app/forms/sales-ordering/documents` (atau menu **Documents**).
5. **Keputusan Dalam Sistem:**
   - Rekod pendaftaran e-Invois baharu akan muncul serta-merta di dalam tab **Documents**.
   - Dilabelkan dengan badge berwarna ungu: `E-Invoice Form` dan label biru: `Direct Delivery`.
   - Menyenaraikan Nama Syarikat / Pelanggan, No. IC, dan maklumat perhubungan.
   - Pasukan SOD hanya perlu klik **Review** untuk menyemak maklumat, menambah barangan sekiranya perlu melalui butang `+ Add item`, dan menekan butang **Approve E-Invoice**!
