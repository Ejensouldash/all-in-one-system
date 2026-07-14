import { redirect } from "next/navigation"
import { getAccessInfo, hasAnyModule, FORM_MODULES } from "@/lib/access"

export default async function FormsLayout({ children }: { children: React.ReactNode }) {
  const access = await getAccessInfo()
  if (!access) redirect("/login")

  if (!hasAnyModule(access, FORM_MODULES)) {
    redirect("/dashboard")
  }

  return <>{children}</>
}
