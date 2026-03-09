import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_admin/admin/servers' as any)({
  component: () => <Outlet />,
})
