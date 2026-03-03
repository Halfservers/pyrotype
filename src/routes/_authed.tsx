import { Outlet, Link, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  User, Shield, LogOut, Flame, LayoutDashboard,
  Key, Terminal, Activity,
} from 'lucide-react'

import { useAppStore } from '@/store'
import { api } from '@/lib/http'
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/_authed' as any)({
  component: AuthedLayout,
})

function AuthedLayout() {
  const userData = useAppStore((s) => s.userData)
  const setUserData = useAppStore((s) => s.setUserData)
  const navigate = useNavigate()
  const [checked, setChecked] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

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
      await api.post('/api/auth/logout')
    } catch {
      // ignore
    }
    setUserData(undefined as any)
    navigate({ to: '/auth/login' })
  }

  // Server pages provide their own sidebar
  if (pathname.startsWith('/server/')) {
    return <Outlet />
  }

  return (
    <SidebarProvider>
      <AppSidebar userData={userData!} onLogout={handleLogout} pathname={pathname} />
      <SidebarInset className="bg-[#0a0a0a]">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.06] px-4 md:hidden">
          <SidebarTrigger className="text-zinc-400 hover:text-white" />
          <Separator orientation="vertical" className="mr-2 h-4 bg-white/[0.06]" />
          <span className="text-sm font-medium text-zinc-300">Pyrotype</span>
        </header>
        <div className="flex-1">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

const accountItems = [
  { label: 'Profile', path: '/account', icon: User, match: (p: string) => p === '/account' || p === '/account/' },
  { label: 'API Keys', path: '/account/api', icon: Key },
  { label: 'SSH Keys', path: '/account/ssh', icon: Terminal },
  { label: 'Activity', path: '/account/activity', icon: Activity },
] as const

function AppSidebar({
  userData,
  onLogout,
  pathname,
}: {
  userData: { username: string; email: string; rootAdmin: boolean }
  onLogout: () => void
  pathname: string
}) {
  const isActive = (item: { path: string; match?: (p: string) => boolean }) => {
    if (item.match) return item.match(pathname)
    return pathname.startsWith(item.path)
  }

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-3">
        <Link to="/" className="flex items-center gap-2 px-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/20">
            <Flame className="size-4 text-brand" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight group-data-[collapsible=icon]:hidden">
            Pyrotype
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/' || pathname === ''} tooltip="Dashboard">
                <Link to="/">
                  <LayoutDashboard className="size-4" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarMenu>
            {accountItems.map((item) => {
              const Icon = item.icon
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={isActive(item)} tooltip={item.label}>
                    <Link to={item.path as any}>
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        {userData.rootAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/admin')} tooltip="Admin Panel">
                  <Link to="/admin">
                    <Shield className="size-4" />
                    <span>Admin Panel</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:bg-transparent">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/20">
            <span className="text-[10px] font-bold text-brand">{userData.username[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium text-zinc-200 truncate">{userData.username}</p>
            <p className="text-xs text-zinc-500 truncate">{userData.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="shrink-0 text-zinc-500 hover:text-red-400 transition-colors group-data-[collapsible=icon]:hidden"
            aria-label="Logout"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
