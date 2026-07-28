import { redirect } from "next/navigation"

// The Pedas Batch QR generator moved out of Production into its own KBP module.
// Kept as a redirect so existing bookmarks and printed links still land somewhere.
export default function OriginBatchRedirect() {
  redirect("/kbp/batch")
}
