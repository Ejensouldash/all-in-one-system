import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const plainTextPassword = "adminpassword123";
    const hashedPassword = await bcrypt.hash(plainTextPassword, 10);

    // Check if an admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "SUPERADMIN" }
    });

    if (existingAdmin) {
      // Update the existing admin's password to a proper hash
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { password: hashedPassword }
      });

      return NextResponse.json({ 
        message: "Existing admin password has been successfully updated to a securely hashed format!", 
        loginDetails: {
          email: existingAdmin.email,
          password: plainTextPassword,
          role: existingAdmin.role
        },
        instruction: "Please log in using these credentials at /login, then you can delete this API route."
      });
    }

    // Create a new admin user if none exists
    const admin = await prisma.user.create({
      data: {
        name: "Super Admin",
        email: "admin@itsm.local",
        password: hashedPassword,
        role: "SUPERADMIN"
      }
    });

    return NextResponse.json({ 
      message: "Admin created successfully!", 
      loginDetails: {
        email: admin.email,
        password: plainTextPassword,
        role: admin.role
      },
      instruction: "Please log in using these credentials at /login, then you can delete this API route."
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
