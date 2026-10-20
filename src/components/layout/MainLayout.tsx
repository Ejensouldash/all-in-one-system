import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { Chatbot } from "../chat/ChatbotLoader"
import { FloatingTicketModal } from "../tickets/FloatingTicketModal"
import { NoticeBanner } from "./NoticeBanner"
import { MobileLayoutWrapper } from "./MobileLayoutWrapper"
import { getActiveNotices } from "@/app/actions/notice"
import { getSession, getAccessInfo } from "@/lib/access"

export async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) {
    return <>{children}</>
  }

  const access = await getAccessInfo()
  const activeNotices = await getActiveNotices(access?.unitId)

  const isViewOnly = session.user.email === "viewonly@bubbleso2.com"

  const freshUser = {
    ...session.user,
    modules: access?.modules || [],
    role: access?.role || session.user.role,
    trueRole: access?.role || (session.user as any).trueRole
  }

  const hasProductionAccess = access?.isSuperAdmin || access?.modules.includes("CHATBOT_PRODUCTION")

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
            <Chatbot hasProductionAccess={Boolean(hasProductionAccess)}/>
            <FloatingTicketModal />
          </>
        }
      >
        {children}
      </MobileLayoutWrapper>
    </>
  )
}

