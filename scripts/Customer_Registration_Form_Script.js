/**
 * GOOGLE APPS SCRIPT FOR CUSTOMER REGISTRATION FORM
 * ------------------------------------------------
 * Arahan Pemasangan:
 * 1. Buka Google Form Customer Registration anda.
 * 2. Klik ikon 3 titik di atas kanan -> Pilih "Extensions" (Sambungan) -> "Apps Script".
 * 3. Padamkan semua kod sedia ada dan tampal (paste) kod di bawah ini.
 * 4. Gantikan WEBHOOK_URL di bawah dengan URL domain sistem AIO anda:
 *    contoh: "https://all-in-one-system.vercel.app/api/webhooks/customer-registration"
 * 5. Klik "Save" (Ikon Disket).
 * 6. Di menu sebelah kiri, klik "Triggers" (Ikon Jam) -> Klik "Add Trigger":
 *    - Choose which function to run: "onFormSubmit"
 *    - Select event source: "From form"
 *    - Select event type: "On form submit"
 * 7. Klik "Save" dan luluskan kebenaran (Authorize permissions).
 */

const WEBHOOK_URL = "https://all-in-one-system.vercel.app/api/webhooks/customer-registration"; // Tukar mengikut domain anda
const WEBHOOK_SECRET = "bubbleso2-secret-key"; // Opsional

function onFormSubmit(e) {
  try {
    const formResponse = e.response;
    const itemResponses = formResponse.getItemResponses();

    const payload = {
      submittedAt: formResponse.getTimestamp().toISOString(),
      respondentEmail: formResponse.getRespondentEmail() || "",
      supportingDocuments: [],
      tradeReferences: [],
      directors: [],
      guarantors: []
    };

    // Itrate item responses
    itemResponses.forEach(function(itemResponse) {
      const title = itemResponse.getItem().getTitle().trim();
      const itemType = itemResponse.getItem().getType();
      const response = itemResponse.getResponse();

      // Handle File Upload fields
      if (itemType === FormApp.ItemType.FILE_UPLOAD && response) {
        const fileIds = Array.isArray(response) ? response : [response];
        fileIds.forEach(function(fileId) {
          try {
            const file = DriveApp.getFileById(fileId);
            payload.supportingDocuments.push({
              docType: title,
              fileName: file.getName(),
              driveUrl: file.getUrl(),
              fileId: fileId
            });
          } catch (err) {
            payload.supportingDocuments.push({
              docType: title,
              fileId: fileId,
              driveUrl: "https://drive.google.com/file/d/" + fileId + "/view"
            });
          }
        });
        return;
      }

      // Map question titles to keys
      const lowerTitle = title.toLowerCase();
      
      if (lowerTitle.includes("company name") || lowerTitle.includes("nama syarikat")) {
        payload.companyName = response;
      } else if (lowerTitle.includes("new reg") || lowerTitle.includes("no. pendaftaran (new)")) {
        payload.companyRegNoNew = response;
      } else if (lowerTitle.includes("old reg") || lowerTitle.includes("no. pendaftaran (old)")) {
        payload.companyRegNoOld = response;
      } else if (lowerTitle.includes("tin")) {
        payload.tinNo = response;
      } else if (lowerTitle.includes("sst")) {
        payload.sstNo = response;
      } else if (lowerTitle.includes("business type") || lowerTitle.includes("jenis perniagaan")) {
        payload.businessType = response;
      } else if (lowerTitle.includes("nature of business") || lowerTitle.includes("sektor")) {
        payload.natureOfBusiness = response;
      } else if (lowerTitle.includes("business address") || lowerTitle.includes("alamat perniagaan")) {
        payload.businessAddress = response;
      } else if (lowerTitle.includes("registered address") || lowerTitle.includes("alamat berdaftar")) {
        payload.registeredAddress = response;
      } else if (lowerTitle.includes("commencement") || lowerTitle.includes("mula perniagaan")) {
        payload.businessCommencementDate = response;
      } else if (lowerTitle.includes("turnover") || lowerTitle.includes("jualan tahunan")) {
        payload.annualTurnover = response;
      } else if (lowerTitle.includes("paid up") || lowerTitle.includes("modal berbayar")) {
        payload.paidUpCapital = response;
      } else if (lowerTitle.includes("contact number") || lowerTitle.includes("office") || lowerTitle.includes("no. pejabat")) {
        payload.contactOffice = response;
      } else if (lowerTitle.includes("fax")) {
        payload.contactFax = response;
      } else if (lowerTitle.includes("email address") || lowerTitle.includes("e-invoice")) {
        payload.emailInvoice = response;
      } else if (lowerTitle.includes("msic")) {
        payload.msicCode = response;
      } else if (lowerTitle.includes("account department name") || lowerTitle.includes("nama akaun")) {
        payload.contactAccountName = response;
      } else if (lowerTitle.includes("account department email") || lowerTitle.includes("email akaun")) {
        payload.contactAccountEmail = response;
      } else if (lowerTitle.includes("account department contact") || lowerTitle.includes("tel akaun")) {
        payload.contactAccountPhone = response;
      } else if (lowerTitle.includes("purchasing department name") || lowerTitle.includes("nama pembeli")) {
        payload.contactPurchaseName = response;
      } else if (lowerTitle.includes("purchasing department email") || lowerTitle.includes("email pembeli")) {
        payload.contactPurchaseEmail = response;
      } else if (lowerTitle.includes("purchasing department contact") || lowerTitle.includes("tel pembeli")) {
        payload.contactPurchasePhone = response;
      } else if (lowerTitle.includes("bank name") || lowerTitle.includes("nama bank")) {
        payload.bankName = response;
      } else if (lowerTitle.includes("account no") || lowerTitle.includes("no. akaun bank")) {
        payload.bankAccountNo = response;
      } else if (lowerTitle.includes("bank address") || lowerTitle.includes("alamat bank")) {
        payload.bankAddress = response;
      } else if (lowerTitle.includes("swift")) {
        payload.swiftCode = response;
      } else {
        // Generic fallback mapping
        payload[title] = response;
      }
    });

    Logger.log("Payload to send: " + JSON.stringify(payload));

    // Send HTTP POST Request
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "x-google-form-secret": WEBHOOK_SECRET
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    Logger.log("Response Code: " + response.getResponseCode());
    Logger.log("Response Body: " + response.getContentText());

  } catch (error) {
    Logger.log("Error in onFormSubmit: " + error.toString());
  }
}
