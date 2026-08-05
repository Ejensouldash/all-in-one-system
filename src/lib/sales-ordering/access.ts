import { getAccessInfo, hasAnyModule, type AccessInfo } from "@/lib/access"

// The main Sales Ordering module is deliberately separate from Customer Master
// administration. Assign the first to BD/SOD users; add the second only to staff
// who are allowed to replace or update the Sage X3 customer reference data.
export const SALES_ORDERING_MODULES = ["SALES_ORDERING"]
export const SALES_ORDERING_CUSTOMER_MODULES = ["SALES_ORDERING_CUSTOMERS"]

export async function getSalesOrderingAccess() {
  const access = await getAccessInfo()
  if (!access || !hasAnyModule(access, SALES_ORDERING_MODULES)) return null
  return access
}

export function canManageSalesOrderingCustomers(access: AccessInfo) {
  return hasAnyModule(access, SALES_ORDERING_CUSTOMER_MODULES)
}
