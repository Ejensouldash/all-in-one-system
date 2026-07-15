export interface ReminderActionLink {
  label: string
  url: string
}

export interface ReminderEmailInput {
  title: string
  description?: string | null
  actionLinks?: ReminderActionLink[] | null
  mytHour: number
  frequencyLabel: string
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  )
}

export function greetingForMytHour(hour: number): string {
  if (hour < 12) return "Selamat Pagi"
  if (hour < 15) return "Selamat Tengah Hari"
  if (hour < 19) return "Selamat Petang"
  return "Selamat Malam"
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Dark-themed, table-based responsive HTML reminder email (Gmail-safe,
 * inline styles only). Action links render as full-width gradient buttons;
 * relative URLs are resolved against the deployed app URL.
 */
export function buildReminderEmailHtml({
  title,
  description,
  actionLinks,
  mytHour,
  frequencyLabel,
}: ReminderEmailInput): string {
  const baseUrl = getBaseUrl()
  const logoUrl = `${baseUrl}/assets/BubblesO2_Logo.png`
  const greeting = greetingForMytHour(mytHour)

  const links = (actionLinks || []).filter((l) => l && l.label && l.url)
  const buttonsHtml = links
    .map((link) => {
      const href = link.url.startsWith("/") ? `${baseUrl}${link.url}` : link.url
      return `
        <tr>
          <td style="padding: 6px 0;">
            <a href="${href}" target="_blank"
               style="display: block; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; text-align: center; padding: 14px 20px; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 0.3px; border: 1px solid rgba(255,255,255,0.12);">
              ${escapeHtml(link.label)} &nbsp;&rarr;
            </a>
          </td>
        </tr>`
    })
    .join("")

  return `
    <div style="background-color: #0b1120; padding: 32px 16px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; margin: 0 auto; border-collapse: collapse;">

        <!-- Header banner -->
        <tr>
          <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 20px 20px 0 0; padding: 32px 28px; text-align: center; border: 1px solid #1e293b; border-bottom: none;">
            <img src="${logoUrl}" alt="BubblesO2" style="height: 44px; margin-bottom: 14px;" />
            <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">
              BubblesO2 AIO System
            </h1>
            <p style="color: #38bdf8; margin: 8px 0 0 0; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;">
              Peringatan Berjadual
            </p>
            <div style="height: 3px; width: 72px; margin: 18px auto 0 auto; border-radius: 3px; background: linear-gradient(90deg, #38bdf8, #6366f1);"></div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background-color: #111827; padding: 32px 28px; border-left: 1px solid #1e293b; border-right: 1px solid #1e293b;">
            <p style="color: #e2e8f0; font-size: 16px; font-weight: 600; margin: 0 0 6px 0;">${greeting} 👋</p>
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0 0 24px 0;">
              Ini adalah peringatan automatik daripada Sistem AIO BubblesO2.
            </p>

            <!-- Reminder card -->
            <div style="background-color: #1e293b; border-radius: 16px; padding: 24px; border: 1px solid #334155;">
              <span style="display: inline-block; background-color: rgba(56, 189, 248, 0.12); color: #38bdf8; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 5px 12px; border-radius: 999px; border: 1px solid rgba(56, 189, 248, 0.3); margin-bottom: 14px;">
                ${escapeHtml(frequencyLabel)}
              </span>
              <h2 style="color: #f8fafc; font-size: 20px; font-weight: 800; margin: 0 0 10px 0; line-height: 1.35;">
                ${escapeHtml(title)}
              </h2>
              ${
                description
                  ? `<p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0; white-space: pre-wrap;">${escapeHtml(description)}</p>`
                  : ""
              }
            </div>

            ${
              buttonsHtml
                ? `
            <p style="color: #64748b; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin: 28px 0 10px 0;">
              Tindakan Pantas
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
              ${buttonsHtml}
            </table>`
                : ""
            }

            <div style="margin-top: 28px; background-color: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-left: 4px solid #f59e0b; border-radius: 10px; padding: 14px 16px;">
              <p style="color: #fbbf24; font-size: 12px; line-height: 1.6; margin: 0;">
                <strong>PENTING:</strong> Penyerahan borang dan tugasan yang konsisten amat penting bagi pematuhan piawaian kualiti syarikat.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #0f172a; border-radius: 0 0 20px 20px; padding: 22px 28px; text-align: center; border: 1px solid #1e293b; border-top: 1px solid #1e293b;">
            <p style="color: #64748b; font-size: 11px; margin: 0 0 4px 0;">
              E-mel ini dijana secara automatik oleh <strong style="color: #94a3b8;">Sistem AIO BubblesO2</strong>.
            </p>
            <p style="color: #475569; font-size: 10px; margin: 0;">
              Sila jangan balas e-mel ini.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `
}

/** Human label like "Setiap Hari • 8:00 AM" used in the email badge. */
export function buildFrequencyLabel(
  frequency: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY",
  timeOfDay?: string | null,
  onceAtMyt?: Date | null
): string {
  const fmtTime = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number)
    const suffix = h >= 12 ? "PM" : "AM"
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `${h12}:${String(m).padStart(2, "0")} ${suffix}`
  }

  switch (frequency) {
    case "DAILY":
      return timeOfDay ? `Setiap Hari • ${fmtTime(timeOfDay)}` : "Setiap Hari"
    case "WEEKLY":
      return timeOfDay ? `Mingguan • ${fmtTime(timeOfDay)}` : "Mingguan"
    case "MONTHLY":
      return timeOfDay ? `Bulanan • ${fmtTime(timeOfDay)}` : "Bulanan"
    case "ONCE":
    default: {
      if (onceAtMyt) {
        const h = onceAtMyt.getUTCHours()
        const m = onceAtMyt.getUTCMinutes()
        return `Sekali • ${fmtTime(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)}`
      }
      return "Sekali"
    }
  }
}
