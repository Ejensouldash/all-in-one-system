/**
 * HTML Email Template for SGMP/19/FUV (Hazard and Process Control Records) 10-minute inspection alerts.
 */

export interface FUVInspectionEmailOptions {
  slotTime: string
  shift: "DAY" | "NIGHT"
  dateStr: string
  formUrl: string
  targetMinute: string
}

export function buildFUVInspectionEmailHtml({
  slotTime,
  shift,
  dateStr,
  formUrl,
  targetMinute,
}: FUVInspectionEmailOptions): { subject: string; html: string } {
  const shiftLabel = shift === "DAY" ? "Day Shift (07:30 AM - 05:30 PM)" : "Night Shift (07:30 PM - 05:30 AM)"
  const subject = `⏰ [Peringatan FUV] Slot Pemeriksaan ${slotTime} bermula dalam 10 minit (${dateStr})`

  const html = `<!DOCTYPE html>
<html lang="ms">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0e7490 0%, #0f172a 100%); padding: 30px 25px; text-align: center;">
              <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); color: #a5f3fc; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.2);">
                BUBBLES O2 • GMP PRODUCTION
              </span>
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase;">
                Peringatan Pemeriksaan Berkala
              </h1>
              <p style="color: #e0f2fe; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">
                SGMP/19/FUV • Hazard and Process Control Records
              </p>
            </td>
          </tr>

          <!-- Slot Alert Hero Box -->
          <tr>
            <td style="padding: 25px 25px 15px 25px;">
              <table role="presentation" width="100%" style="background-color: #ecfeff; border: 1px solid #a5f3fc; border-radius: 12px; padding: 18px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0891b2; letter-spacing: 1px;">
                      SLOT PEMERIKSAAN SETERUSNYA:
                    </div>
                    <div style="font-size: 28px; font-weight: 900; color: #0f172a; margin: 4px 0;">
                      ${slotTime}
                    </div>
                    <div style="font-size: 13px; color: #0369a1; font-weight: 600;">
                      ⏳ Waktu semasa: ${targetMinute} (Baki 10 minit sebelum slot bermula)
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
                      📅 Tarikh: <strong>${dateStr}</strong> &bull; Syif: <strong>${shiftLabel}</strong>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Instructions & Checklist -->
          <tr>
            <td style="padding: 10px 25px 20px 25px;">
              <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
                Salam sejahtera Operator bertugas. Sila bersiap sedia untuk mengambil bacaan instrumen loji rawatan air bagi slot <strong>${slotTime}</strong> dan rekodkannya ke dalam sistem AIO:
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; font-size: 12px;">
                <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                  <th style="padding: 10px 12px; text-align: left; color: #475569; font-weight: 700;">Zon Peralatan</th>
                  <th style="padding: 10px 12px; text-align: left; color: #475569; font-weight: 700;">Parameter Utama</th>
                  <th style="padding: 10px 12px; text-align: left; color: #475569; font-weight: 700;">Had Piawai</th>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 9px 12px; color: #1e293b; font-weight: 600;">Zon 1: Pump Station</td>
                  <td style="padding: 9px 12px; color: #64748b;">VFD01 & VFD02 Frequency</td>
                  <td style="padding: 9px 12px; color: #0891b2; font-weight: 700;">Max 25 Hz</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 9px 12px; color: #1e293b; font-weight: 600;">Zon 2: Source Water</td>
                  <td style="padding: 9px 12px; color: #64748b;">SP01 pH, CS02 Conductivity, PG01, PT01</td>
                  <td style="padding: 9px 12px; color: #0891b2; font-weight: 700;">pH 6.5-7.5 / 50-270 µS</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9; background-color: #fffbeb;">
                  <td style="padding: 9px 12px; color: #92400e; font-weight: 700;">Zon 3: Sand + Carbon</td>
                  <td style="padding: 9px 12px; color: #92400e;">PG02 Differential Pressure</td>
                  <td style="padding: 9px 12px; color: #b45309; font-weight: 800;">🚨 CCP1: Max 3.0 Bar</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9; background-color: #fffbeb;">
                  <td style="padding: 9px 12px; color: #92400e; font-weight: 700;">Zon 5: UF Membrane</td>
                  <td style="padding: 9px 12px; color: #92400e;">PG05 Outlet Pressure</td>
                  <td style="padding: 9px 12px; color: #b45309; font-weight: 800;">🚨 CCP1: Max 2.0 Bar</td>
                </tr>
                <tr style="background-color: #fff1f2;">
                  <td style="padding: 9px 12px; color: #9f1239; font-weight: 700;">Zon 6: UV System</td>
                  <td style="padding: 9px 12px; color: #9f1239;">UV Intensity Sensor</td>
                  <td style="padding: 9px 12px; color: #be123c; font-weight: 800;">🚨 CCP2: 80% – 99%</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Direct CTA Button -->
          <tr>
            <td style="padding: 10px 25px 30px 25px; text-align: center;">
              <a href="${formUrl}" target="_blank" style="display: inline-block; background-color: #0891b2; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(8, 145, 178, 0.35);">
                📝 Buka Borang Pemeriksaan (Slot ${slotTime})
              </a>
              <p style="color: #94a3b8; font-size: 11px; margin: 12px 0 0 0;">
                Pautan terus: <a href="${formUrl}" style="color: #0891b2; text-decoration: underline;">${formUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 25px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5;">
                Notifikasi automatik daripada <strong>BubblesO2 All-in-One SuperApp System</strong>.<br>
                Sekiranya terdapat sebarang pertanyaan atau sisihan CCP, sila hubungi Penyelia / QC bertugas dengan segera.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, html }
}

