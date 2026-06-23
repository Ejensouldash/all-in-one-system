import { auth } from "@/auth"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { Chatbot } from "../chat/Chatbot"
import { FloatingTicketModal } from "../tickets/FloatingTicketModal"
import { NoticeBanner } from "./NoticeBanner"
import { MobileLayoutWrapper } from "./MobileLayoutWrapper"
import { getActiveNotices } from "@/app/actions/notice"
import { prisma } from "@/lib/prisma"

export async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) {
    return <>{children}</>
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { unitId: true }})
  const activeNotices = await getActiveNotices(user?.unitId)

  return (
    <MobileLayoutWrapper
      role={session.user.role}
      user={session.user}
      notices={activeNotices.length > 0 ? <NoticeBanner notices={activeNotices} /> : null}
      modals={
        <>
          <Chatbot />
          <FloatingTicketModal />
        </>
      }
    >
      {children}
    </MobileLayoutWrapper>
  )
}
