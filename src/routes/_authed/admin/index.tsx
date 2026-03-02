import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getAdminOverview } from '@/lib/api/admin'

export const Route = createFileRoute('/_authed/admin/' as any)({
  component: AdminDashboard,
})

function AdminDashboard() {
  const [counts, setCounts] = useState<{ users: number; servers: number; nodes: number; locations: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminOverview()
      .then(setCounts)
      .catch(() => setCounts({ users: 0, servers: 0, nodes: 0, locations: 0 }))
      .finally(() => setLoading(false))
  }, [])

  const cards = [
    { title: 'Users', description: 'Manage user accounts and permissions', count: counts?.users, href: '/admin/users' },
    { title: 'Servers', description: 'View and manage all servers', count: counts?.servers, href: '/admin/servers' },
    { title: 'Nodes', description: 'Manage daemon nodes', count: counts?.nodes, href: '/admin/nodes' },
    { title: 'Locations', description: 'Manage data center locations', count: counts?.locations, href: '/admin/locations' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Administration</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.title}
            to={card.href as any}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6 hover:border-white/[0.15] hover:bg-white/[0.06] transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">{card.title}</h3>
              <span className="text-2xl font-bold text-zinc-500">
                {loading ? '...' : card.count ?? 0}
              </span>
            </div>
            <p className="text-sm text-zinc-400">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
