import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { unit: true, branch: true }
        })

        if (!user || !user.password) {
          // Synthetic delay to thwart timing attacks and brute force
          await new Promise(r => setTimeout(r, 2000))
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          // Synthetic delay to thwart timing attacks and brute force
          await new Promise(r => setTimeout(r, 2000))
          return null
        }
        
        // Grant elevated access if part of IT
        const isIT = user.unit?.name === "Information Technology"
        const effectiveRole = isIT ? "SUPERADMIN" : user.role

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: effectiveRole,
          trueRole: user.role,
          unitId: user.unitId,
          branchId: user.branchId,
          branchName: user.branch?.name,
          unitName: user.unit?.name,
          modules: user.modules,
          signatureUrl: user.signatureUrl,
        }
      }
    })
  ],
})
