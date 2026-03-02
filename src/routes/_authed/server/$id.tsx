import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import getServer from '@/lib/api/server/get-server'
import { httpErrorToHuman } from '@/lib/api/http'
import { ServerStoreProvider } from '@/store/ServerStoreProvider'
import { useServerStore } from '@/store/server'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/server/$id' as any)({
  component: ServerLayout,
})

const serverNavItems = [
  { label: 'Console', path: '', permission: null, end: true },
  { label: 'Files', path: 'files', permission: 'file.*' },
  { label: 'Databases', path: 'databases', permission: 'database.*', featureLimit: 'databases' as const },
  { label: 'Backups', path: 'backups', permission: 'backup.*', featureLimit: 'backups' as const },
  { label: 'Network', path: 'network', permission: 'allocation.*' },
  { label: 'Users', path: 'users', permission: 'user.*' },
  { label: 'Schedules', path: 'schedules', permission: 'schedule.*' },
  { label: 'Startup', path: 'startup', permission: ['startup.read', 'startup.update', 'startup.docker-image'] },
  { label: 'Settings', path: 'settings', permission: ['settings.*', 'file.sftp'] },
  { label: 'Activity', path: 'activity', permission: 'activity.*' },
  { label: 'Software', path: 'shell', permission: 'startup.software' },
] as const

function ServerLayout() {
  return (
    <ServerStoreProvider>
      <ServerLayoutInner />
    </ServerStoreProvider>
  )
}

function ServerLayoutInner() {
  const { id } = Route.useParams()
  const location = useLocation()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const server = useServerStore((s) => s.server)
  const setServer = useServerStore((s) => s.setServer)
  const setPermissions = useServerStore((s) => s.setPermissions)
  const clearServerState = useServerStore((s) => s.clearServerState)

  useEffect(() => {
    setError('')
    setLoading(true)

    getServer(id)
      .then(([serverData, permissions]) => {
        setServer(serverData as any)
        setPermissions(permissions)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setError(httpErrorToHuman(err))
        setLoading(false)
      })

    return () => {
      clearServerState()
    }
  }, [id])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="text-zinc-400">{error}</p>
          <Link
            to="/"
            className="mt-4 inline-block text-sm text-brand hover:underline"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (loading || !server) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    )
  }

  return (
    <div className="flex flex-row w-full min-h-screen bg-[#0a0a0a]">
      <aside className="hidden lg:flex lg:shrink-0 w-[260px] bg-[#1a1a1a] flex-col h-screen sticky top-0 p-6">
        <Link to="/" className="flex shrink-0 h-8 w-fit mb-4">
          <span className="text-xl font-bold text-white tracking-tight">Pyrotype</span>
        </Link>

        <div aria-hidden className="mt-4 mb-4 bg-[#ffffff33] min-h-[1px] w-6" />

        <nav className="flex-grow overflow-y-auto">
          <ul className="space-y-1">
            {serverNavItems.map((item) => {
              const basePath = `/server/${id}`
              const fullPath = item.path
                ? `${basePath}/${item.path}`
                : basePath
              const isActive = ('end' in item && item.end)
                ? location.pathname === fullPath ||
                  location.pathname === `${fullPath}/`
                : location.pathname.startsWith(fullPath)

              return (
                <li key={item.label}>
                  <Link
                    to={fullPath as any}
                    className={cn(
                      'block px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[#ffffff11] text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-[#ffffff09]',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="shrink-0 mt-4">
          <div aria-hidden className="mb-4 bg-[#ffffff33] min-h-[1px] w-full" />
          <div className="p-4 bg-[#ffffff09] border border-[#ffffff11] shadow-xs rounded-xl text-center text-sm text-zinc-300">
            {server.name}
          </div>
        </div>
      </aside>

      <main className="flex-1 w-full overflow-y-auto overflow-x-hidden rounded-md bg-[#08080875]">
        <Outlet />
      </main>
    </div>
  )
}
