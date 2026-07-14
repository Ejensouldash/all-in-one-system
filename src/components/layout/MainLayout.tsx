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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { unitId: true, modules: true, role: true }
  })
  const activeNotices = await getActiveNotices(user?.unitId)
  
  const isViewOnly = session.user.email === "viewonly@bubbleso2.com"

  const freshUser = {
    ...session.user,
    modules: user?.modules || [],
    role: user?.role || session.user.role,
    trueRole: user?.role || (session.user as any).trueRole
  }

  return (
    <>
      {isViewOnly && (
        <div className="bg-red-600 text-white p-2 text-center text-sm font-bold uppercase tracking-widest z-50 relative print:hidden">
          VIEW ONLY MODE: Anda tidak boleh mengubah atau menghantar sebarang data.
        </div>
      )}
      <MobileLayoutWrapper
        role={freshUser.role}
        user={freshUser}
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
    </>
  )
}

