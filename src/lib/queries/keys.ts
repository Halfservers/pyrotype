export const queryKeys = {
  servers: {
    all: ['servers'] as const,
    list: (params?: any) => [...queryKeys.servers.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.servers.all, id] as const,
    backups: (id: string) => [...queryKeys.servers.detail(id), 'backups'] as const,
    databases: (id: string) => [...queryKeys.servers.detail(id), 'databases'] as const,
    files: (id: string, dir: string) =>
      [...queryKeys.servers.detail(id), 'files', dir] as const,
    schedules: (id: string) => [...queryKeys.servers.detail(id), 'schedules'] as const,
    startup: (id: string) => [...queryKeys.servers.detail(id), 'startup'] as const,
    allocations: (id: string) => [...queryKeys.servers.detail(id), 'allocations'] as const,
    subusers: (id: string) => [...queryKeys.servers.detail(id), 'subusers'] as const,
    activity: (id: string) => [...queryKeys.servers.detail(id), 'activity'] as const,
  },
  account: {
    all: ['account'] as const,
    activity: () => [...queryKeys.account.all, 'activity'] as const,
    apiKeys: () => [...queryKeys.account.all, 'apiKeys'] as const,
    sshKeys: () => [...queryKeys.account.all, 'sshKeys'] as const,
  },
} as const;
