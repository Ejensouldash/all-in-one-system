import { getAccessInfo, hasAnyModule, type AccessInfo } from "@/lib/access"

export const SALES_ORDERING_LEGACY_MODULE = "SALES_ORDERING"

export const SALES_ORDERING_TAB_MODULES = {
  dashboard: "SALES_ORDERING_DASHBOARD",
  intake: "SALES_ORDERING_INTAKE",
  orders: "SALES_ORDERING_ORDERS",
  customers: "SALES_ORDERING_CUSTOMERS",
} as const

export const SALES_ORDERING_CUSTOMER_MANAGE_MODULE = "SALES_ORDERING_CUSTOMERS_MANAGE"
export const SALES_ORDERING_DOCUMENT_MANAGE_MODULE = "SALES_ORDERING_DOCUMENT_MANAGE"

export type SalesOrderingTab = keyof typeof SALES_ORDERING_TAB_MODULES

const SALES_ORDERING_MODULES = [
  SALES_ORDERING_LEGACY_MODULE,
  ...Object.values(SALES_ORDERING_TAB_MODULES),
  SALES_ORDERING_CUSTOMER_MANAGE_MODULE,
  SALES_ORDERING_DOCUMENT_MANAGE_MODULE,
]

export async function getSalesOrderingAccess() {
  const access = await getAccessInfo()
  if (!access || !hasAnyModule(access, SALES_ORDERING_MODULES)) return null
  return access
}

export function canAccessSalesOrderingTab(access: AccessInfo, tab: SalesOrderingTab) {
  return access.isSuperAdmin || access.modules.includes(SALES_ORDERING_LEGACY_MODULE) || access.modules.includes(SALES_ORDERING_TAB_MODULES[tab])
}

export function canManageSalesOrderingCustomers(access: AccessInfo) {
  return access.isSuperAdmin || access.modules.includes(SALES_ORDERING_LEGACY_MODULE) || access.modules.includes(SALES_ORDERING_CUSTOMER_MANAGE_MODULE)
}

export function canManageSalesOrderingDocuments(access: AccessInfo) {
  return access.isSuperAdmin || access.modules.includes(SALES_ORDERING_LEGACY_MODULE) || access.modules.includes(SALES_ORDERING_DOCUMENT_MANAGE_MODULE)
}

export function firstSalesOrderingPath(access: AccessInfo) {
  if (canAccessSalesOrderingTab(access, "dashboard")) return "/forms/sales-ordering"
  if (canAccessSalesOrderingTab(access, "intake")) return "/forms/sales-ordering/intake"
  if (canAccessSalesOrderingTab(access, "orders")) return "/forms/sales-ordering/orders"
  if (canAccessSalesOrderingTab(access, "customers")) return "/forms/sales-ordering/customers"
  return "/dashboard"
}
