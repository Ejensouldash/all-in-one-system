import { redirect } from "next/navigation"

export const metadata = {
  title: "Purchase Requisitions | BubblesO2 Facilities Maintenance",
}

export default async function PurchaseRequestsPage() {
  redirect("/forms/maintenance/tickets")
}
