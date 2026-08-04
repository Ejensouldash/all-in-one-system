import { getAccessInfo, hasAnyModule } from "@/lib/access"

export const SALES_ORDERING_MODULES = ["SALES_ORDERING", "SALES_ORDERING_CUSTOMERS"]

export async function getSalesOrderingAccess() {
  const access = await getAccessInfo()
  if (!access || !hasAnyModule(access, SALES_ORDERING_MODULES)) return null
  return access
}

