import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_admin/admin' as any)({
  component: AdminPathWrapper,
})

function AdminPathWrapper() {
  return <Outlet />
}
