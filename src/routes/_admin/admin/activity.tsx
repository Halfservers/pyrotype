import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getActivityLogs,
  clearActivityLogs,
  type ActivityLogEntry,
  type PaginatedResponse,
} from '@/lib/api/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { motion, staggerContainer, staggerItem } from '@/components/motion'

export const Route = createFileRoute('/_admin/admin/activity' as any)({
  component: AdminActivityPage,
})

function getEventColor(event: string): string {
  if (event.startsWith('auth:')) return 'bg-blue-500/15 text-blue-300 border-blue-500/20'
  if (event.startsWith('server:')) return 'bg-green-500/15 text-green-300 border-green-500/20'
  if (event.startsWith('admin:')) return 'bg-purple-500/15 text-purple-300 border-purple-500/20'
  if (event.startsWith('user:')) return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20'
  if (event.startsWith('api:')) return 'bg-orange-500/15 text-orange-300 border-orange-500/20'
  if (event.startsWith('security:')) return 'bg-red-500/15 text-red-300 border-red-500/20'
  return 'bg-zinc-500/15 text-zinc-300 border-zinc-500/20'
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function PropertiesCell({ properties }: { properties: Record<string, unknown> | null }) {
  const [expanded, setExpanded] = useState(false)
  if (!properties || Object.keys(properties).length === 0) {
    return <span className="text-zinc-600 text-xs">—</span>
  }
  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-200 transition-colors"
      >
        {expanded ? 'Hide' : 'Show'}
      </button>
      {expanded && (
        <pre className="mt-1 text-[10px] text-zinc-300 bg-white/[0.04] rounded p-2 max-w-xs overflow-auto whitespace-pre-wrap">
          {JSON.stringify(properties, null, 2)}
        </pre>
      )}
    </div>
  )
}

interface Filters {
  event: string
  ip: string
}

function AdminActivityPage() {
  const [data, setData] = useState<PaginatedResponse<ActivityLogEntry> | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const [filters, setFilters] = useState<Filters>({ event: '', ip: '' })
  const [appliedFilters, setAppliedFilters] = useState<Filters>({ event: '', ip: '' })

  const [clearOpen, setClearOpen] = useState(false)
  const [clearDays, setClearDays] = useState('90')
  const [clearing, setClearing] = useState(false)

  const fetchLogs = (p: number, f: Filters) => {
    setLoading(true)
    const apiFilters: { event?: string; ip?: string } = {}
    if (f.event) apiFilters.event = f.event
    if (f.ip) apiFilters.ip = f.ip
    getActivityLogs(p, apiFilters)
      .then(setData)
      .catch(() => toast.error('Failed to load activity logs'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchLogs(page, appliedFilters)
  }, [page, appliedFilters])

  const handleSearch = () => {
    setPage(1)
    setAppliedFilters({ ...filters })
  }

  const handleClearLogs = async () => {
    const days = parseInt(clearDays, 10)
    if (isNaN(days) || days < 1) {
      toast.error('Please enter a valid number of days')
      return
    }
    setClearing(true)
    try {
      const result = await clearActivityLogs(days)
      toast.success(`Deleted ${result.deleted} log entries`)
      setClearOpen(false)
      fetchLogs(1, appliedFilters)
      setPage(1)
    } catch {
      toast.error('Failed to clear activity logs')
    } finally {
      setClearing(false)
    }
  }

  const logs = data?.data ?? []
  const pagination = data?.meta?.pagination

  const skeletonCols = 7

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Activity Logs</h1>
        <Button variant="destructive" size="sm" onClick={() => setClearOpen(true)}>
          Clear Old Logs
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-end gap-3 mb-5">
        <div className="grid gap-1.5">
          <Label htmlFor="filter-event" className="text-xs text-zinc-400">
            Event
          </Label>
          <Input
            id="filter-event"
            className="h-8 w-48 text-sm"
            placeholder="e.g. auth:login"
            value={filters.event}
            onChange={(e) => setFilters((f) => ({ ...f, event: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filter-ip" className="text-xs text-zinc-400">
            IP Address
          </Label>
          <Input
            id="filter-ip"
            className="h-8 w-40 text-sm"
            placeholder="e.g. 127.0.0.1"
            value={filters.ip}
            onChange={(e) => setFilters((f) => ({ ...f, ip: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button size="sm" className="h-8" onClick={handleSearch}>
          Search
        </Button>
        {(appliedFilters.event || appliedFilters.ip) && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-zinc-400 hover:text-zinc-200"
            onClick={() => {
              setFilters({ event: '', ip: '' })
              setAppliedFilters({ event: '', ip: '' })
              setPage(1)
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {loading && !data ? (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08]">
                <TableHead>Timestamp</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead>Subjects</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i} className="border-white/[0.08]">
                  {Array.from({ length: skeletonCols }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : logs.length === 0 ? (
        <div className="border border-white/[0.08] rounded-xl flex items-center justify-center py-16">
          <div className="text-center">
            <p className="text-zinc-400 text-sm">No activity logs found.</p>
            {(appliedFilters.event || appliedFilters.ip) && (
              <p className="text-zinc-600 text-xs mt-1">Try adjusting your filters.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08]">
                <TableHead className="whitespace-nowrap">Timestamp</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead>Subjects</TableHead>
              </TableRow>
            </TableHeader>
            <motion.tbody
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              {logs.map((item, index) => {
                const log = item.attributes
                return (
                  <motion.tr
                    key={log.id}
                    variants={staggerItem}
                    custom={index}
                    className="border-b border-white/[0.08] hover:bg-white/[0.03] transition-colors duration-150"
                  >
                    <TableCell className="text-zinc-400 text-xs whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getEventColor(log.event)}`}
                      >
                        {log.event}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-300 text-xs font-mono">
                      {log.ip}
                    </TableCell>
                    <TableCell className="text-zinc-300 text-xs">
                      {log.actor_type === 'user' && log.actor_id ? (
                        <span>
                          <Badge variant="secondary" className="text-[10px]">User</Badge>{' '}
                          <span className="text-zinc-400">#{log.actor_id}</span>
                        </span>
                      ) : log.actor_type === 'api_key' && log.actor_id ? (
                        <span>
                          <Badge variant="outline" className="text-[10px]">API Key</Badge>{' '}
                          <span className="text-zinc-400">#{log.actor_id}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-600">System</span>
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-400 text-xs max-w-xs truncate">
                      {log.description ?? <span className="text-zinc-600">—</span>}
                    </TableCell>
                    <TableCell>
                      <PropertiesCell properties={log.properties} />
                    </TableCell>
                    <TableCell className="text-zinc-400 text-xs">
                      {log.subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {log.subjects.map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex items-center gap-0.5 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-zinc-300"
                            >
                              {s.subject_type}
                              <span className="text-zinc-500">#{s.subject_id}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </TableCell>
                  </motion.tr>
                )
              })}
            </motion.tbody>
          </Table>
        </div>
      )}

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-zinc-400">
            Showing {pagination.count} of {pagination.total} entries
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="flex items-center px-3 text-sm text-zinc-400">
              Page {pagination.current_page} of {pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Clear Logs Dialog */}
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Old Activity Logs</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-zinc-400">
              Permanently delete all activity logs older than the specified number of days. This action cannot be undone.
            </p>
            <div className="grid gap-2">
              <Label htmlFor="clear-days">Delete logs older than (days)</Label>
              <Input
                id="clear-days"
                type="number"
                min="1"
                value={clearDays}
                onChange={(e) => setClearDays(e.target.value)}
                placeholder="90"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearLogs} disabled={clearing}>
              {clearing ? 'Clearing...' : 'Clear Logs'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
