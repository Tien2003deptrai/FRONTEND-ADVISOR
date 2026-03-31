import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  ChatIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PlugInIcon,
  UserIcon,
} from '../icons'
import { useSidebar } from '../context/SidebarContext'
import useAuthStore from '../stores/authStore'

type NavItem = {
  name: string
  icon: React.ReactNode
  path?: string
  subItems?: { name: string; path: string }[]
}

const mainNav: NavItem[] = [
  {
    icon: <GridIcon />,
    name: 'Dashboard',
    path: '/student',
  },
  {
    icon: <ListIcon />,
    name: 'Học tập',
    path: '/student/academic',
  },
  {
    icon: <ChatIcon />,
    name: 'Phản hồi',
    path: '/student/feedback',
  }
]

const othersNav: NavItem[] = [
  {
    icon: <UserIcon />,
    name: 'Tài khoản',
    subItems: [{ name: 'Hồ sơ', path: '/student/profile' }],
  },
]

const AppSidebarStudent: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore(s => s.logout)

  const [openSubmenu, setOpenSubmenu] = useState<{ type: 'others'; index: number } | null>(null)
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({})
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const isActive = useCallback(
    (path: string) => {
      const p = location.pathname.replace(/\/$/, '') || '/'
      const t = path.replace(/\/$/, '') || '/'
      if (t === '/student') return p === '/student'
      return p === t || p.startsWith(`${t}/`)
    },
    [location.pathname]
  )

  useEffect(() => {
    let matched = false
    othersNav.forEach((nav, index) => {
      nav.subItems?.forEach(sub => {
        if (isActive(sub.path)) {
          setOpenSubmenu({ type: 'others', index })
          matched = true
        }
      })
    })
    if (!matched) setOpenSubmenu(null)
  }, [location.pathname, isActive])

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `others-${openSubmenu.index}`
      if (subMenuRefs.current[key]) {
        setSubMenuHeight(prev => ({
          ...prev,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }))
      }
    }
  }, [openSubmenu])

  const handleSubmenuToggle = (index: number) => {
    setOpenSubmenu(prev => (prev && prev.index === index ? null : { type: 'others', index }))
  }

  const handleSignOut = () => {
    logout()
    navigate('/signin', { replace: true })
  }

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

  const renderOthers = (items: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <>
              <button
                type="button"
                onClick={() => handleSubmenuToggle(index)}
                className={`menu-item group w-full cursor-pointer ${openSubmenu?.index === index ? 'menu-item-active' : 'menu-item-inactive'} ${!isExpanded && !isHovered ? 'lg:justify-center' : 'lg:justify-start'}`}
              >
                <span
                  className={`menu-item-icon-size ${openSubmenu?.index === index ? 'menu-item-icon-active' : 'menu-item-icon-inactive'}`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
                {(isExpanded || isHovered || isMobileOpen) && (
                  <ChevronDownIcon
                    className={`ml-auto h-5 w-5 transition-transform duration-200 ${openSubmenu?.index === index ? 'rotate-180 text-brand-500' : ''}`}
                  />
                )}
              </button>
              {(isExpanded || isHovered || isMobileOpen) && (
                <div
                  ref={el => {
                    subMenuRefs.current[`others-${index}`] = el
                  }}
                  className="overflow-hidden transition-all duration-300"
                  style={{
                    height:
                      openSubmenu?.index === index
                        ? `${subMenuHeight[`others-${index}`] ?? 0}px`
                        : '0px',
                  }}
                >
                  <ul className="ml-9 mt-2 space-y-1">
                    {nav.subItems.map(sub => (
                      <li key={sub.path}>
                        <Link
                          to={sub.path}
                          className={`menu-dropdown-item ${isActive(sub.path) ? 'menu-dropdown-item-active' : 'menu-dropdown-item-inactive'}`}
                        >
                          {sub.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
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
        <Link to="/student">
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex items-center gap-3">
              <img
                className="dark:hidden"
                src="/images/logo/logo-icon.svg"
                alt=""
                width={40}
                height={40}
              />
              <span className="text-xl font-semibold text-blue-600">Advisor — SV</span>
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
                  'Sinh viên'
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMain(mainNav)}
            </div>
            <div>
              <h2
                className={`mb-4 flex text-xs uppercase leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start'}`}
              >
                {isExpanded || isHovered || isMobileOpen ? 'Khác' : <HorizontaLDots />}
              </h2>
              {renderOthers(othersNav)}
              <button
                type="button"
                onClick={handleSignOut}
                className={`menu-item group menu-item-inactive mt-2 w-full cursor-pointer ${!isExpanded && !isHovered ? 'lg:justify-center' : ''}`}
              >
                <span className="menu-item-icon-size menu-item-icon-inactive">
                  <PlugInIcon className="size-6" />
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">Đăng xuất</span>
                )}
              </button>
            </div>
          </div>
        </nav>
      </div>
    </aside>
  )
}

export default AppSidebarStudent
