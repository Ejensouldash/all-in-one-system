/**
 * GOOGLE APPS SCRIPT FOR CUSTOMER REGISTRATION FORM (AIO SYSTEM)
 * ==============================================================
 *
 * ARAHAN SET UP / INSTALLATION INSTRUCTIONS:
 * 1. Buka Google Form Customer Registration anda.
 * 2. Klik menu 3-titik di bahagian atas kanan -> "Extensions" (Sambungan) -> "Apps Script".
 * 3. Padamkan semua kod laluan sedia ada dan tampal (paste) keseluruhan kod di bawah.
 * 4. Tetapkan Script Properties (Tetapan Pembolehubah Persekitaran):
 *    - Di menu kiri Apps Script, klik "Project Settings" (Ikon Gear).
 *    - Skrol ke bawah ke bahagian "Script Properties" -> Klik "Add script property":
 *        Key: AIO_WEBHOOK_URL
 *        Value: https://domain-sistem-aio.vercel.app/api/webhooks/customer-registration
 *        
 *        Key: AIO_WEBHOOK_SECRET
 *        Value: rahsia_webhook_pilihan_anda (contoh: bubbleso2-secret-key)
 *
 * 5. Tetapkan Installable Trigger (Pencetus Automatik):
 *    - Di menu kiri Apps Script, klik "Triggers" (Ikon Jam) -> Klik "Add Trigger" (Butang bawah kanan).
 *    - Choose which function to run: `onFormSubmit`
 *    - Choose which deployment should run: `Head`
 *    - Select event source: `From form`
 *    - Select event type: `On form submit`
 *    - Klik "Save" dan luluskan kebenaran OAuth (Authorize Permissions).
 */

// Field Mapping Table: Maps Google Form question titles to AIO System fields
const QUESTION_MAPPING = {
  // A. Company Details
  "Company Name": "companyName",
  "Nama Syarikat": "companyName",
  "A. COMPANY DETAILS": "companyName", // Section header or short answer title
  
  "Company Registration No. (New)": "companyRegNoNew",
  "Company Registration No. (Old)": "companyRegNoOld",
  "No. Pendaftaran Syarikat (Baru)": "companyRegNoNew",
  "No. Pendaftaran Syarikat (Lama)": "companyRegNoOld",

  "Tax Identification No. (TIN)": "tinNo",
  "TIN No": "tinNo",

  "SST Registration No. (IF ANY)": "sstNo",
  "SST Registration No": "sstNo",
  "No. SST": "sstNo",

  "Business Type": "businessType",
  "Jenis Perniagaan": "businessType",

  "Payment Terms": "paymentTermsRequested",
  "Terma Pembayaran": "paymentTermsRequested",
  "Terma Pembayaran Dipohon": "paymentTermsRequested",

  "Nature of Business": "natureOfBusiness",
  "Sektor Perniagaan": "natureOfBusiness",

  "Business Address": "businessAddress",
  "Alamat Perniagaan": "businessAddress",

  "Office Operating Hours (eg :- Monday - Friday)": "officeOperatingHours",
  "Office Operating Hours": "officeOperatingHours",
  "Waktu Operasi Pejabat": "officeOperatingHours",

  "Preferred Delivery Time": "preferredDeliveryTime",
  "Waktu Penghantaran Pilihan": "preferredDeliveryTime",

  "Registered Address": "registeredAddress",
  "Alamat Berdaftar": "registeredAddress",

  "Business Commencement Date": "businessCommencementDate",
  "Tarikh Mula Perniagaan": "businessCommencementDate",

  "Annual Turnover Rate": "annualTurnover",
  "Kadar Jualan Tahunan": "annualTurnover",

  "Paid Up Capital": "paidUpCapital",
  "Modal Berbayar": "paidUpCapital",

  "Contact Number (Office)": "contactOffice",
  "No. Telefon (Pejabat)": "contactOffice",

  "Contact Number (Fax)": "contactFax",
  "No. Faks": "contactFax",

  "Email Address (for e-Invoice)": "emailInvoice",
  "Email e-Invoice": "emailInvoice",

  "MSIC Code": "msicCode",
  "Kod MSIC": "msicCode",

  // B. Contact Person Details - Account
  "Account Department - Name": "contactAccountName",
  "Jabatan Akaun - Nama": "contactAccountName",
  "Account Department - Email": "contactAccountEmail",
  "Jabatan Akaun - Email": "contactAccountEmail",
  "Account Department - Phone": "contactAccountPhone",
  "Jabatan Akaun - No. Telefon": "contactAccountPhone",

  // B. Contact Person Details - Purchasing
  "Purchasing Department - Name": "contactPurchaseName",
  "Jabatan Pembelian - Nama": "contactPurchaseName",
  "Purchasing Department - Email": "contactPurchaseEmail",
  "Jabatan Pembelian - Email": "contactPurchaseEmail",
  "Purchasing Department - Phone": "contactPurchasePhone",
  "Jabatan Pembelian - No. Telefon": "contactPurchasePhone",

  // C. Financial Information
  "Bank Name": "bankName",
  "Nama Bank": "bankName",
  "Account No.": "bankAccountNo",
  "Account No": "bankAccountNo",
  "No. Akaun Bank": "bankAccountNo",
  "Bank Address": "bankAddress",
  "Alamat Bank": "bankAddress",
  "Bank Type": "bankType",
  "Jenis Akaun Bank": "bankType",
  "SWIFT Code": "swiftCode",
  "Kod SWIFT": "swiftCode"
};

/**
 * Main Form Submit Trigger Function
 */
function onFormSubmit(e) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const webhookUrl = scriptProperties.getProperty("AIO_WEBHOOK_URL") || "https://all-in-one-system.vercel.app/api/webhooks/customer-registration";
  const webhookSecret = scriptProperties.getProperty("AIO_WEBHOOK_SECRET") || "bubbleso2-secret-key";

  Logger.log("--- START CUSTOMER REGISTRATION FORM SUBMISSION ---");
  Logger.log("Target Webhook URL: " + webhookUrl);

  try {
    if (!e || !e.response) {
      Logger.log("ERROR: Event object or response missing. Make sure this function runs via Form Submit Trigger.");
      return;
    }

    const formResponse = e.response;
    const formResponseId = formResponse.getId();
    const timestamp = formResponse.getTimestamp().toISOString();
    const respondentEmail = formResponse.getRespondentEmail() || "";

    const payload = {
      formResponseId: formResponseId,
      submittedAt: timestamp,
      respondentEmail: respondentEmail,
      companyName: "",
      companyRegNoNew: "",
      companyRegNoOld: "",
      tinNo: "",
      sstNo: "",
      businessType: "",
      natureOfBusiness: "",
      businessAddress: "",
      registeredAddress: "",
      businessCommencementDate: "",
      annualTurnover: "",
      paidUpCapital: "",
      contactOffice: "",
      contactFax: "",
      emailInvoice: "",
      msicCode: "",
      contactAccountName: "",
      contactAccountEmail: "",
      contactAccountPhone: "",
      contactPurchaseName: "",
      contactPurchaseEmail: "",
      contactPurchasePhone: "",
      bankName: "",
      bankAccountNo: "",
      bankAddress: "",
      bankType: "",
      swiftCode: "",
      supportingDocuments: [],
      tradeReferences: [],
      directors: [],
      guarantors: [],
      rawUnmappedFields: {}
    };

    const itemResponses = formResponse.getItemResponses();

    itemResponses.forEach(function(itemResponse) {
      const item = itemResponse.getItem();
      const questionTitle = item.getTitle().trim();
      const itemType = item.getType();
      const rawResponse = itemResponse.getResponse();

      // Handle File Upload Questions (supports single & multiple file uploads per question)
      if (itemType === FormApp.ItemType.FILE_UPLOAD && rawResponse) {
        const fileIds = Array.isArray(rawResponse) ? rawResponse : [rawResponse];
        
        fileIds.forEach(function(fileId) {
          try {
            const file = DriveApp.getFileById(fileId);
            payload.supportingDocuments.push({
              docType: questionTitle,
              fileName: file.getName(),
              fileId: fileId,
              driveUrl: file.getUrl(),
              previewUrl: "https://drive.google.com/file/d/" + fileId + "/preview",
              mimeType: file.getMimeType(),
              fileSize: file.getSize()
            });
          } catch (fileErr) {
            Logger.log("Warning: Could not fetch Drive metadata for file ID: " + fileId + " - " + fileErr.toString());
            payload.supportingDocuments.push({
              docType: questionTitle,
              fileName: "File (" + fileId + ")",
              fileId: fileId,
              driveUrl: "https://drive.google.com/file/d/" + fileId + "/view",
              previewUrl: "https://drive.google.com/file/d/" + fileId + "/preview",
              mimeType: "application/pdf"
            });
          }
        });
        return;
      }

      // Handle Text / Choice / Date Questions using Mapping Lookup Table
      const mappedKey = QUESTION_MAPPING[questionTitle];

      if (mappedKey) {
        payload[mappedKey] = String(rawResponse || "").trim();
      } else {
        // Fallback for unmapped question titles (fuzzy check or raw log)
        const lowerTitle = questionTitle.toLowerCase();
        if (lowerTitle.includes("company name") || lowerTitle.includes("nama syarikat")) {
          payload.companyName = String(rawResponse).trim();
        } else {
          payload.rawUnmappedFields[questionTitle] = rawResponse;
        }
      }
    });

    // Ensure companyName fallback if missing
    if (!payload.companyName) {
      const keys = Object.keys(payload.rawUnmappedFields);
      if (keys.length > 0) {
        payload.companyName = String(payload.rawUnmappedFields[keys[0]] || "Form Submission (" + formResponseId.slice(0, 8) + ")");
      }
    }

    Logger.log("Payload prepared for Company: " + payload.companyName + " (Docs count: " + payload.supportingDocuments.length + ")");

    // Execute HTTP POST Request to AIO Webhook
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "x-google-form-secret": webhookSecret
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(webhookUrl, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (statusCode >= 200 && statusCode < 300) {
      Logger.log("SUCCESS [" + statusCode + "]: " + responseText);
    } else {
      Logger.log("WEBHOOK FAILED WITH STATUS [" + statusCode + "]: " + responseText);
    }

  } catch (err) {
    Logger.log("FATAL SCRIPT ERROR: " + err.toString());
  }
}
