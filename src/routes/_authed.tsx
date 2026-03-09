import { Outlet, Link, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  User, Shield, LogOut, Flame, LayoutDashboard,
  Key, Terminal, Activity, ChevronsUpDown,
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

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
  const navigate = useNavigate()

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
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-white/[0.06] data-[state=open]:text-white"
                >
                  <Avatar className="size-7 rounded-full">
                    <AvatarFallback className="bg-brand/20 text-brand text-[10px] font-bold rounded-full">
                      {userData.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium text-zinc-200">{userData.username}</span>
                    <span className="truncate text-xs text-zinc-500">{userData.email}</span>
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
                <DropdownMenuGroup>
                  {accountItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <DropdownMenuItem
                        key={item.path}
                        onClick={() => navigate({ to: item.path as any })}
                        className="gap-2 cursor-pointer"
                      >
                        <Icon className="size-4 text-zinc-400" />
                        <span>{item.label}</span>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-white/[0.08]" />
                <DropdownMenuItem
                  onClick={onLogout}
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
  )
}
