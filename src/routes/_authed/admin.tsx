import { createFileRoute, Link, Outlet, useNavigate, useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/admin' as any)({
  component: AdminLayout,
})

const adminTabs = [
  { label: 'Overview', path: '/admin' },
  { label: 'Users', path: '/admin/users' },
  { label: 'Servers', path: '/admin/servers' },
  { label: 'Nodes', path: '/admin/nodes' },
  { label: 'Locations', path: '/admin/locations' },
] as const

function AdminLayout() {
  const userData = useAppStore((s) => s.userData)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!userData?.rootAdmin) {
      navigate({ to: '/' })
    }
  }, [userData, navigate])

  if (!userData?.rootAdmin) return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-1 mb-6 border-b border-white/[0.08] pb-4 overflow-x-auto">
        {adminTabs.map((tab) => {
          const isActive =
            tab.path === '/admin'
              ? location.pathname === '/admin' || location.pathname === '/admin/'
              : location.pathname.startsWith(tab.path)
          return (
            <Link
              key={tab.path}
              to={tab.path as any}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5',
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
      <Outlet />
    </div>
  )
}
