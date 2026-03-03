import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/account' as any)({
  component: AccountLayout,
})

function AccountLayout() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Outlet />
    </div>
  )
}
