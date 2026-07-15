import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

export const dynamic = "force-dynamic"

export async function GET() {
  const email = process.env.SMTP_EMAIL
  const password = process.env.SMTP_PASSWORD

  if (!email || !password) {
    return NextResponse.json({
      error: "SMTP credentials not configured in environment",
      email: !!email,
      password: !!password
    })
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: email,
        pass: password,
      },
    })

    // Verify connection configuration
    await transporter.verify()

    // Try sending a simple mail
    const info = await transporter.sendMail({
      from: `"Test SMTP" <${email}>`,
      to: email,
      subject: "Test SMTP Connection",
      text: "If you see this, SMTP is working!",
    })

    return NextResponse.json({ success: true, info })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack
    })
  }
}
