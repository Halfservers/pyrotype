import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'

import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/account' as any)({
  component: AccountLayout,
})

const accountTabs = [
  { label: 'Account', path: '/account' },
  { label: 'API Keys', path: '/account/api' },
  { label: 'SSH Keys', path: '/account/ssh' },
  { label: 'Activity', path: '/account/activity' },
] as const

function AccountLayout() {
  const location = useLocation()

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <nav className="w-full md:w-48 shrink-0">
            <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
              {accountTabs.map((tab) => {
                const isActive =
                  tab.path === '/account'
                    ? location.pathname === '/account' || location.pathname === '/account/'
                    : location.pathname.startsWith(tab.path)
                return (
                  <li key={tab.path}>
                    <Link
                      to={tab.path as any}
                      className={cn(
                        'block px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                        isActive
                          ? 'bg-[#ffffff11] text-white'
                          : 'text-zinc-400 hover:text-white hover:bg-[#ffffff09]',
                      )}
                    >
                      {tab.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
