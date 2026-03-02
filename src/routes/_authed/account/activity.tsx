import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'

import { useAccountActivityQuery } from '@/lib/queries'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export const Route = createFileRoute('/_authed/account/activity' as any)({
  component: AccountActivityPage,
})

function AccountActivityPage() {
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')

  const { data, isLoading } = useAccountActivityQuery({ page, sorts: { timestamp: -1 } })

  const filteredItems = useMemo(() => {
    if (!data?.items) return []
    if (!searchTerm) return data.items

    return data.items.filter(
      (item: any) =>
        item.event?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ip?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [data?.items, searchTerm])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Activity Log</h2>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Search events, IPs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 bg-[#ffffff09] border-[#ffffff12] text-white"
          />
        </div>
      </div>

      <Card className="bg-[#ffffff09] border-[#ffffff12]">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-zinc-200 mb-2">
                {searchTerm ? 'No Matching Activity' : 'No Activity Yet'}
              </h3>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                {searchTerm
                  ? "Try adjusting your search terms to find the activity you're looking for."
                  : 'Activity logs will appear here as you use your account.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/30">
              {filteredItems.map((activity: any) => (
                <div
                  key={activity.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{activity.event}</p>
                    <p className="text-xs text-zinc-400">
                      {activity.ip && <span className="mr-3">IP: {activity.ip}</span>}
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-zinc-400">
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
