export const COMPANY_OPTIONS = [
  "BOSB",
  "BODG",
  "NRHO",
  "BOMSB",
]

export const BRANCH_OPTIONS = [
  "All Branches",
  "Gambang",
  "Rantau",
  "Pedas",
] as const

export const DEPARTMENT_OPTIONS = [
  "ELEKTRIK (ELEKTRIK)",
  "QC-KILANG AIR (QUALITY CONTROL-KILANG AIR)",
  "KA (KILANG AIR)",
  "KB (KILANG BOTOL)",
  "HSE (HEALTH, SAFETY & ENVIRONMENT)",
  "GAMBANG (GAMBANG)",
  "MAIN & FACI (MAINTENANCE & FACILITIES)",
  "QA (QUALITY ASSURANCE)",
  "SECU (SECURITY)",
  "WARE-KILANG AIR (WAREHOUSE-KILANG AIR)",
  "BDS (BUSINESS DEVELOPMENT & SALES)",
  "CORP (CORPORATE)",
  "FIN (FINANCE)",
  "HOUSEKEEPING (HOUSEKEEPING)",
  "HR (HUMAN RESOURCES)",
  "IT (INFORMATION TECHNOLOGY)",
  "LEGAL (LEGAL)",
  "LGSTC & WARE (LOGISTIC & WAREHOUSE)",
  "MRKTG: ACTV (MARKETING - ACTIVATION)",
  "ONLINE SALES (ONLINE SALES)",
  "PERSONAL DRIVER (PERSONAL DRIVER)",
  "PME (PETROL MART ENGAGEMENT)",
  "RECEPTION (RECEPTION)",
]

export const PAYMENT_TERMS_CONFIG: Record<string, { label: string; days: number }> = {
  TERM_7_DAYS: { label: "7 Days", days: 7 },
  TERM_30_DAYS: { label: "30 Days", days: 30 },
  TERM_60_DAYS: { label: "60 Days", days: 60 },
  COD: { label: "COD", days: 0 },
  CASH_BEFORE_DELIVERY: { label: "Cash Before Delivery", days: 0 },
  CASH: { label: "Cash", days: 0 },
  MONTHLY_SUBSCRIPTION: { label: "Monthly Subscription", days: 30 },
}

export const ATTACHMENT_TAG_OPTIONS = [
  "1st Payment",
  "2nd Payment",
  "Balance",
  "Invoice / DO",
] as const

export const INVOICE_CATEGORY_CONFIG: Record<string, { label: string; short: string; badgeClass: string }> = {
  STANDARD_TERMS: {
    label: "Document for Payment (Standard)",
    short: "Standard Terms",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  DEPOSIT_PAYMENT: {
    label: "Deposit Payment",
    short: "Deposit Payment",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  MONTHLY_SUBSCRIPTION: {
    label: "Deposit Payment",
    short: "Deposit Payment",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  CASH_PREPAYMENT: {
    label: "Cash Payment (Pay Before Delivery)",
    short: "Cash (Pay Before Delivery)",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 font-semibold",
  },
}

export const INVOICE_STATUS_CONFIG: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  DRAFT: {
    label: "Draft",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
  },
  PENDING_FINANCE: {
    label: "Pending Finance",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
  IN_REVIEW: {
    label: "In Review",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    dotClass: "bg-sky-500",
  },
  PAID: {
    label: "Paid",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  REJECTED: {
    label: "Rejected",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
  },
}
