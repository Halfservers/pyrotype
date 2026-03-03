import { Outlet, Link, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Shield, LayoutDashboard, Users, Server, HardDrive, MapPin, ArrowLeft,
} from 'lucide-react'

import { useAppStore } from '@/store'
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

export const Route = createFileRoute('/_admin' as any)({
  component: AdminLayout,
})

const adminNavItems = [
  { label: 'Overview', path: '/admin', icon: LayoutDashboard, match: (p: string) => p === '/admin' || p === '/admin/' },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Servers', path: '/admin/servers', icon: Server },
  { label: 'Nodes', path: '/admin/nodes', icon: HardDrive },
  { label: 'Locations', path: '/admin/locations', icon: MapPin },
] as const

function AdminLayout() {
  const userData = useAppStore((s) => s.userData)
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!userData?.uuid) {
      navigate({ to: '/auth/login' })
    } else if (!userData.rootAdmin) {
      navigate({ to: '/' })
    } else {
      setChecked(true)
    }
  }, [userData, navigate])

  if (!checked) return null

  const isActive = (item: { path: string; match?: (p: string) => boolean }) => {
    if (item.match) return item.match(pathname)
    return pathname.startsWith(item.path)
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon" className="border-r-0">
        <SidebarHeader className="p-3">
          <div className="flex items-center gap-2 px-1">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/20">
              <Shield className="size-4 text-rose-400" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight group-data-[collapsible=icon]:hidden">
              Admin Panel
            </span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarMenu>
              {adminNavItems.map((item) => {
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

          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Back to Panel">
                  <Link to="/">
                    <ArrowLeft className="size-4" />
                    <span>Back to Panel</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-3">
          <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:bg-transparent">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-500/20">
              <span className="text-[10px] font-bold text-rose-400">{userData!.username[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-medium text-zinc-200 truncate">{userData!.username}</p>
            </div>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-[#0a0a0a]">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.06] px-4 md:hidden">
          <SidebarTrigger className="text-zinc-400 hover:text-white" />
          <Separator orientation="vertical" className="mr-2 h-4 bg-white/[0.06]" />
          <span className="text-sm font-medium text-zinc-300">Admin Panel</span>
        </header>
        <div className="flex-1">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
