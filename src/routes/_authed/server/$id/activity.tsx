import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ServerContentBlock } from '@/components/layout/page-header'
import ActivityLogEntry from '@/components/elements/activity/activity-log-entry'
import { Button } from '@/components/ui/button'
import { useServerStore } from '@/store/server'
import { useServerActivityQuery } from '@/lib/queries'

export const Route = createFileRoute('/_authed/server/$id/activity' as any)({
  component: ServerActivityPage,
})

function ServerActivityPage() {
  const serverId = useServerStore((state) => state.server!.id)
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useServerActivityQuery(serverId, { page })

  return (
    <ServerContentBlock title='Activity Log'>
      {isLoading ? (
        <div className='flex items-center justify-center py-12'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-brand' />
        </div>
      ) : isError ? (
        <div className='rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400'>
          Failed to load activity log.
        </div>
      ) : !data?.items?.length ? (
        <div className='text-center py-12'>
          <p className='text-zinc-400'>No activity recorded yet.</p>
        </div>
      ) : (
        <div className='space-y-1'>
          <div className='bg-[#ffffff05] border border-[#ffffff12] rounded-xl overflow-hidden'>
            {data.items.map((item: any) => (
              <ActivityLogEntry key={item.id} activity={item} />
            ))}
          </div>

          {data.pagination && data.pagination.totalPages > 1 && (
            <div className='flex items-center justify-center gap-2 pt-4'>
              <Button
                variant='outline'
                size='sm'
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className='text-sm text-zinc-400'>
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button
                variant='outline'
                size='sm'
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </ServerContentBlock>
  )
}
