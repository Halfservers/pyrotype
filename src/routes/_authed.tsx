import { Outlet, Link, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { useAppStore } from '@/store'
import http from '@/lib/api/http'

export const Route = createFileRoute('/_authed' as any)({
  component: AuthedLayout,
})

function AuthedLayout() {
  const userData = useAppStore((s) => s.userData)
  const setUserData = useAppStore((s) => s.setUserData)
  const navigate = useNavigate()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!userData?.uuid) {
      navigate({ to: '/auth/login' })
    } else {
      setChecked(true)
    }
  }, [userData, navigate])

  if (!checked) return null

  const handleLogout = async () => {
    try {
      await http.post('/api/auth/logout')
    } catch {
      // ignore
    }
    setUserData(undefined as any)
    navigate({ to: '/auth/login' })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <NavBar userData={userData!} onLogout={handleLogout} />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  )
}

function NavBar({ userData, onLogout }: { userData: { username: string; email: string; rootAdmin: boolean }; onLogout: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const linkClass = (path: string) => {
    const active = pathname === path || (path !== '/' && pathname.startsWith(path))
    return `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
      active
        ? 'bg-white/10 text-white'
        : 'text-zinc-400 hover:text-white hover:bg-white/5'
    }`
  }

  return (
    <nav className="border-b border-white/[0.08] bg-black/40 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1">
            <Link to="/" className="text-lg font-bold text-white mr-6">
              Pyrotype
            </Link>
            <Link to="/" className={linkClass('/')}>
              Servers
            </Link>
            <Link to="/account" className={linkClass('/account')}>
              Account
            </Link>
            {userData.rootAdmin && (
              <Link to="/admin" className={linkClass('/admin')}>
                Admin
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">{userData.username}</span>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
