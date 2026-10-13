import { notFound } from "next/navigation"
import { getNrhoProjectById } from "@/app/actions/nrho-project"
import { ProjectDetailsClient } from "./ProjectDetailsClient"

export const metadata = {
  title: "NRHO Project Hub | BubblesO2",
  description: "Comprehensive management for project Bill of Quantities, Boss Approvals, Planning Timeline, PO/DO/Invoices, and Floor Plans.",
}

export default async function NrhoProjectDetailPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await props.params
  const searchParams = await props.searchParams
  const initialTab = searchParams.tab

  const res = await getNrhoProjectById(id)

  if (!res.success || !res.data) {
    notFound()
  }

  return (
    <div className="p-4 md:p-8">
      <ProjectDetailsClient project={res.data} initialTab={initialTab} />
    </div>
  )
}
