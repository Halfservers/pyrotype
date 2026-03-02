import { createFileRoute, Link } from '@tanstack/react-router'

import { useServerListQuery } from '@/lib/queries'
import { useAppStore } from '@/store'
import { usePersistedState } from '@/lib/hooks/usePersistedState'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const Route = createFileRoute('/_authed/' as any)({
  component: DashboardPage,
})

function DashboardPage() {
  const userData = useAppStore((s) => s.userData)
  const uuid = userData?.uuid ?? ''
  const rootAdmin = userData?.rootAdmin ?? false

  const page = 1
  const [serverViewMode, setServerViewMode] = usePersistedState<
    'owner' | 'admin-all' | 'all'
  >(`${uuid}:server_view_mode`, 'owner')
  const [displayOption, setDisplayOption] = usePersistedState(
    `${uuid}:dashboard_display_option`,
    'list',
  )

  const getApiType = (): string | undefined => {
    if (serverViewMode === 'owner') return 'owner'
    if (serverViewMode === 'admin-all') return 'admin-all'
    if (serverViewMode === 'all') return 'all'
    return undefined
  }

  const getTitle = () => {
    if (serverViewMode === 'admin-all') return 'All Servers (Admin)'
    if (serverViewMode === 'all') return 'All Accessible Servers'
    return 'Your Servers'
  }

  const { data: servers, isLoading } = useServerListQuery({
    page,
    type: getApiType(),
  })

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs
          defaultValue={displayOption}
          onValueChange={(value) => setDisplayOption(value)}
          className="w-full"
        >
          <div className="mb-3 sm:mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold">{getTitle()}</h1>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-9 bg-[#ffffff11] px-3 py-1.5 text-sm text-[#ffffff88] hover:bg-[#ffffff23] hover:text-white"
                    >
                      {getTitle()}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent sideOffset={8}>
                    <DropdownMenuItem
                      onSelect={() => setServerViewMode('owner')}
                      className={serverViewMode === 'owner' ? 'bg-accent/20' : ''}
                    >
                      Your Servers Only
                    </DropdownMenuItem>
                    {rootAdmin && (
                      <DropdownMenuItem
                        onSelect={() => setServerViewMode('admin-all')}
                        className={serverViewMode === 'admin-all' ? 'bg-accent/20' : ''}
                      >
                        All Servers (Admin)
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onSelect={() => setServerViewMode('all')}
                      className={serverViewMode === 'all' ? 'bg-accent/20' : ''}
                    >
                      All Servers
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <TabsList>
                <TabsTrigger value="list" aria-label="View servers in a list layout.">
                  List
                </TabsTrigger>
                <TabsTrigger value="grid" aria-label="View servers in a grid layout.">
                  Grid
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
            </div>
          ) : !servers?.items.length ? (
            <EmptyState serverViewMode={serverViewMode ?? 'owner'} />
          ) : (
            <>
              <TabsContent value="list">
                <div className="space-y-2">
                  {servers.items.map((server) => (
                    <ServerCard key={server.uuid} server={server} layout="list" />
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="grid">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {servers.items.map((server) => (
                    <ServerCard key={server.uuid} server={server} layout="grid" />
                  ))}
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  )
}

function EmptyState({ serverViewMode }: { serverViewMode: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#ffffff11] flex items-center justify-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-zinc-200 mb-2">
          {serverViewMode === 'admin-all'
            ? 'No other servers found'
            : 'No servers found'}
        </h3>
        <p className="text-sm text-zinc-400 max-w-sm">
          {serverViewMode === 'admin-all'
            ? 'There are no other servers to display.'
            : 'There are no servers associated with your account.'}
        </p>
      </div>
    </div>
  )
}

function ServerCard({
  server,
  layout,
}: {
  server: any
  layout: 'list' | 'grid'
}) {
  const defaultAllocation = server.allocations?.find((a: any) => a.isDefault)

  return (
    <Link
      to="/server/$id"
      params={{ id: server.id }}
      className={`block bg-[#ffffff11] border border-[#ffffff12] rounded-xl p-6 hover:border-[#ffffff19] hover:bg-[#ffffff19] transition-all duration-250 ${
        layout === 'grid' ? 'flex-col' : 'flex items-center justify-between'
      }`}
    >
      <div className="flex items-center">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <p className="text-xl tracking-tight font-bold break-words">{server.name}</p>
            <div className="w-3 h-3 rounded-full bg-zinc-600" />
          </div>
          {defaultAllocation && (
            <p className="text-sm text-[#ffffff66]">
              {defaultAllocation.alias || defaultAllocation.ip}:
              {defaultAllocation.port}
            </p>
          )}
        </div>
      </div>
      <div className="hidden sm:flex items-center justify-center border border-[#ffffff12] shadow-md rounded-lg px-4 py-2 text-sm gap-4 bg-gradient-to-b from-[#242424] to-[#141414]">
        <div className="flex justify-center gap-2">
          <p className="text-xs text-zinc-400 font-medium">CPU</p>
          <p className="text-xs font-bold">--</p>
        </div>
        <div className="flex justify-center gap-2">
          <p className="text-xs text-zinc-400 font-medium">RAM</p>
          <p className="text-xs font-bold">--</p>
        </div>
        <div className="flex justify-center gap-2">
          <p className="text-xs text-zinc-400 font-medium">Storage</p>
          <p className="text-xs font-bold">--</p>
        </div>
      </div>
    </Link>
  )
}
