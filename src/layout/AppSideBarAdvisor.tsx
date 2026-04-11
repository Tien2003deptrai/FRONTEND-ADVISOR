import { useCallback } from 'react'
import { Link, useLocation } from 'react-router'
import {
  AlertIcon,
  CalenderIcon,
  ChatIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
} from '../icons'
import { useSidebar } from '../context/SidebarContext'

type NavItem = {
  name: string
  icon: React.ReactNode
  path?: string
  subItems?: { name: string; path: string }[]
}

const mainNav: NavItem[] = [
  { icon: <GridIcon />, name: 'Tổng quan rủi ro', path: '/advisor' },
  { icon: <ListIcon />, name: 'Lớp & thành viên', path: '/advisor/classes' },
  { icon: <CalenderIcon />, name: 'Cuộc họp tư vấn', path: '/advisor/meetings' },
  { icon: <ChatIcon />, name: 'Phản hồi sau họp', path: '/advisor/feedback' },
  { icon: <AlertIcon />, name: 'Thông báo & cảnh báo', path: '/advisor/notifications' },
]


const AppSideBarAdvisor: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar()
  const location = useLocation()

  const isActive = useCallback(
    (path: string) => {
      const p = location.pathname.replace(/\/$/, '') || '/'
      const t = path.replace(/\/$/, '') || '/'
      if (t === '/advisor') return p === '/advisor'
      return p === t || p.startsWith(`${t}/`)
    },
    [location.pathname]
  )


  const renderMain = (items: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {items.map(nav => (
        <li key={nav.name}>
          {nav.path ? (
            <Link
              to={nav.path}
              className={`menu-item group ${isActive(nav.path) ? 'menu-item-active' : 'menu-item-inactive'}`}
            >
              <span
                className={`menu-item-icon-size ${isActive(nav.path) ? 'menu-item-icon-active' : 'menu-item-icon-inactive'}`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  )

  return (
    <aside
      className={`fixed top-0 left-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0
        ${isExpanded || isMobileOpen ? 'w-[290px]' : isHovered ? 'w-[290px]' : 'w-[90px]'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex py-8 ${!isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start'}`}
      >
        <Link to="/advisor">
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex items-center gap-3">
              <img
                className="dark:hidden"
                src="/images/logo/logo-icon.svg"
                alt=""
                width={40}
                height={40}
              />
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-lg font-semibold tracking-tight text-transparent dark:from-brand-400 dark:to-brand-300">
                  Advisor
                </span>
                <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  CVHT
                </span>
              </div>
            </div>
          ) : (
            <img src="/images/logo/logo-icon.svg" alt="" width={32} height={32} />
          )}
        </Link>
      </div>
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 flex text-xs uppercase leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start'}`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  'Cố vấn học tập'
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMain(mainNav)}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  )
}

export default AppSideBarAdvisor
