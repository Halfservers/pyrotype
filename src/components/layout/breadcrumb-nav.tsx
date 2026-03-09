import { Link, useRouterState } from '@tanstack/react-router'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'

const labelMap: Record<string, string> = {
  admin: 'Admin',
  users: 'Users',
  servers: 'Servers',
  nodes: 'Nodes',
  locations: 'Locations',
  account: 'Account',
  api: 'API Keys',
  ssh: 'SSH Keys',
  activity: 'Activity',
  server: 'Server',
}

export function BreadcrumbNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((seg, i) => {
          const path = '/' + segments.slice(0, i + 1).join('/')
          const label = labelMap[seg] || seg.charAt(0).toUpperCase() + seg.slice(1)
          const isLast = i === segments.length - 1

          return (
            <BreadcrumbItem key={path}>
              <BreadcrumbSeparator />
              {isLast ? (
                <BreadcrumbPage>{label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={path as any}>{label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
