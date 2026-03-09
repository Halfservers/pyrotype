import { Outlet, Link, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Shield, LayoutDashboard, Users, Server, HardDrive, MapPin,
  Package, Globe, Database, Settings, Code, FolderOpen,
  ArrowLeft, LogOut, ChevronsUpDown, ScrollText,
} from 'lucide-react'

import { useAppStore } from '@/store'
import { api } from '@/lib/http'
import { motion, AnimatePresence } from '@/components/motion'
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export const Route = createFileRoute('/_admin' as any)({
  component: AdminLayout,
})

const adminNavGroups = [
  {
    label: 'Administration',
    items: [
      { label: 'Overview', path: '/admin', icon: LayoutDashboard, match: (p: string) => p === '/admin' || p === '/admin/' },
      { label: 'Settings', path: '/admin/settings', icon: Settings },
      { label: 'Activity', path: '/admin/activity', icon: ScrollText },
      { label: 'API', path: '/admin/api', icon: Code },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Servers', path: '/admin/servers', icon: Server },
      { label: 'Users', path: '/admin/users', icon: Users },
      { label: 'Nodes', path: '/admin/nodes', icon: HardDrive },
      { label: 'Locations', path: '/admin/locations', icon: MapPin },
      { label: 'Databases', path: '/admin/databases', icon: Database },
      { label: 'Allocations', path: '/admin/allocations', icon: Globe },
    ],
  },
  {
    label: 'Service Management',
    items: [
      { label: 'Nests', path: '/admin/nests', icon: Package },
      { label: 'Mounts', path: '/admin/mounts', icon: FolderOpen },
    ],
  },
] as const

function AdminLayout() {
  const userData = useAppStore((s) => s.userData)
  const setUserData = useAppStore((s) => s.setUserData)
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

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout')
    } catch {
      // ignore
    }
    setUserData(undefined as any)
    navigate({ to: '/auth/login' })
  }

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
          {adminNavGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map((item) => {
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
          ))}
        </SidebarContent>

        <SidebarFooter className="p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-white/[0.06] data-[state=open]:text-white"
                  >
                    <Avatar className="size-7 rounded-full">
                      <AvatarFallback className="bg-rose-500/20 text-rose-400 text-[10px] font-bold rounded-full">
                        {userData!.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium text-zinc-200">{userData!.username}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 text-zinc-500" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 glass rounded-xl"
                  side="top"
                  align="start"
                  sideOffset={8}
                >
                  <DropdownMenuItem
                    onClick={() => navigate({ to: '/' })}
                    className="gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="size-4 text-zinc-400" />
                    <span>Back to Panel</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/[0.08]" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="gap-2 cursor-pointer text-red-400 focus:text-red-400"
                  >
                    <LogOut className="size-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-[#0a0a0a]">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.06] px-4 md:hidden">
          <SidebarTrigger className="text-zinc-400 hover:text-white" />
          <Separator orientation="vertical" className="mr-2 h-4 bg-white/[0.06]" />
          <span className="text-sm font-medium text-zinc-300">Admin Panel</span>
        </header>
        <header className="hidden md:flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.06] px-4">
          <SidebarTrigger className="text-zinc-400 hover:text-white" />
          <Separator orientation="vertical" className="mr-2 h-4 bg-white/[0.06]" />
          <BreadcrumbNav />
        </header>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </SidebarInset>
    </SidebarProvider>
  )
}
