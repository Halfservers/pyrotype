import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Users, Server, HardDrive, MapPin, Package, Globe, Database, ArrowUpRight } from 'lucide-react'
import { getAdminOverview } from '@/lib/api/admin'
import { motion, staggerContainer, staggerItem } from '@/components/motion'

export const Route = createFileRoute('/_admin/admin/' as any)({
  component: AdminDashboard,
})

function AdminDashboard() {
  const [counts, setCounts] = useState<{
    users: number
    servers: number
    nodes: number
    locations: number
    nests: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminOverview()
      .then(setCounts)
      .catch(() => setCounts({ users: 0, servers: 0, nodes: 0, locations: 0, nests: 0 }))
      .finally(() => setLoading(false))
  }, [])

  const sections = [
    {
      title: 'Management',
      cards: [
        {
          title: 'Servers',
          description: 'View & manage all servers',
          count: counts?.servers,
          href: '/admin/servers',
          icon: Server,
          accent: 'from-emerald-500/20 to-emerald-500/0',
          iconColor: 'text-emerald-400 bg-emerald-500/15',
        },
        {
          title: 'Users',
          description: 'Manage accounts & permissions',
          count: counts?.users,
          href: '/admin/users',
          icon: Users,
          accent: 'from-indigo-500/20 to-indigo-500/0',
          iconColor: 'text-indigo-400 bg-indigo-500/15',
        },
        {
          title: 'Nodes',
          description: 'Manage daemon nodes',
          count: counts?.nodes,
          href: '/admin/nodes',
          icon: HardDrive,
          accent: 'from-amber-500/20 to-amber-500/0',
          iconColor: 'text-amber-400 bg-amber-500/15',
        },
        {
          title: 'Locations',
          description: 'Data center locations',
          count: counts?.locations,
          href: '/admin/locations',
          icon: MapPin,
          accent: 'from-rose-500/20 to-rose-500/0',
          iconColor: 'text-rose-400 bg-rose-500/15',
        },
        {
          title: 'Databases',
          description: 'Server database management',
          count: undefined,
          href: '/admin/databases',
          icon: Database,
          accent: 'from-violet-500/20 to-violet-500/0',
          iconColor: 'text-violet-400 bg-violet-500/15',
        },
        {
          title: 'Allocations',
          description: 'Network port allocations',
          count: undefined,
          href: '/admin/allocations',
          icon: Globe,
          accent: 'from-cyan-500/20 to-cyan-500/0',
          iconColor: 'text-cyan-400 bg-cyan-500/15',
        },
      ],
    },
    {
      title: 'Service Management',
      cards: [
        {
          title: 'Nests',
          description: 'Server types & egg configurations',
          count: counts?.nests,
          href: '/admin/nests',
          icon: Package,
          accent: 'from-orange-500/20 to-orange-500/0',
          iconColor: 'text-orange-400 bg-orange-500/15',
        },
      ],
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-2">Administration</h1>
      <p className="text-sm text-zinc-500 mb-8">Manage your panel infrastructure.</p>

      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">{section.title}</h2>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {section.cards.map((card) => {
                const Icon = card.icon
                return (
                  <motion.div key={card.title} variants={staggerItem}>
                    <Link
                      to={card.href as any}
                      className="group relative block bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 hover:border-white/[0.15] transition-all duration-300 overflow-hidden"
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                      />
                      <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-10 h-10 rounded-xl ${card.iconColor} flex items-center justify-center`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                        </div>
                        {card.count !== undefined && (
                          <div className="mb-1">
                            <span className="text-3xl font-bold text-white">
                              {loading ? (
                                <span className="inline-block w-8 h-8 bg-white/5 rounded animate-pulse" />
                              ) : (
                                card.count ?? 0
                              )}
                            </span>
                          </div>
                        )}
                        <h3 className="text-sm font-semibold text-white mb-0.5">{card.title}</h3>
                        <p className="text-xs text-zinc-500">{card.description}</p>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  )
}
