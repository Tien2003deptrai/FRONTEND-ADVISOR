import { SidebarProvider, useSidebar } from '../context/SidebarContext'
import { Outlet } from 'react-router'
import AppHeader from './AppHeader'
import Backdrop from './Backdrop'
import AppSideBarAdvisor from './AppSideBarAdvisor'

const AdvisorLayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar()

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <AppSideBarAdvisor />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? 'lg:ml-[290px]' : 'lg:ml-[90px]'
        } ${isMobileOpen ? 'ml-0' : ''}`}
      >
        <AppHeader />
        <div className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

/** Layout cho tài khoản ADVISOR: sidebar nghiệp vụ cố vấn + header */
const AdvisorLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <AdvisorLayoutContent />
    </SidebarProvider>
  )
}

export default AdvisorLayout
