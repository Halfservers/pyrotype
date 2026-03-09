import { describe, it, expect, beforeEach, vi } from 'vitest';

import { createServerStore } from '../server';
import type { Server, ServerDatabase, Subuser, Schedule } from '../server';

// ---------------------------------------------------------------- fixtures --

function makeServer(overrides: Partial<Server> = {}): Server {
  return {
    id: 'srv-1',
    internalId: 1,
    uuid: 'uuid-1',
    name: 'Test Server',
    node: 'node-1',
    isNodeUnderMaintenance: false,
    status: null,
    sftpDetails: { ip: '127.0.0.1', port: 2022 },
    invocation: 'java -jar server.jar',
    dockerImage: 'ghcr.io/image:latest',
    description: 'A test server',
    limits: { memory: 1024, swap: 0, disk: 5120, io: 500, cpu: 100, threads: null },
    eggFeatures: [],
    featureLimits: { databases: 5, allocations: 5, backups: 2 },
    isTransferring: false,
    variables: [],
    allocations: [],
    egg: 'minecraft',
    daemonType: 'wings',
    ...overrides,
  };
}

function makeDatabase(overrides: Partial<ServerDatabase> = {}): ServerDatabase {
  return {
    id: 'db-1',
    name: 'test_db',
    username: 'u_test',
    connectionString: 'localhost:3306',
    allowConnectionsFrom: '%',
    maxConnections: 0,
    ...overrides,
  };
}

function makeSubuser(overrides: Partial<Subuser> = {}): Subuser {
  return {
    uuid: 'sub-1',
    username: 'testuser',
    email: 'test@example.com',
    image: 'https://gravatar.com/avatar/test',
    twoFactorEnabled: false,
    createdAt: new Date('2025-01-01'),
    permissions: ['control.console'],
    ...overrides,
  };
}

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 1,
    name: 'Daily Restart',
    isActive: true,
    isProcessing: false,
    onlyWhenOnline: false,
    lastRunAt: null,
    nextRunAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    cron: { dayOfWeek: '*', month: '*', dayOfMonth: '*', hour: '0', minute: '0' },
    tasks: [],
    ...overrides,
  };
}

// ------------------------------------------------------------------ tests --

describe('ServerStore', () => {
  let store: ReturnType<typeof createServerStore>;

  beforeEach(() => {
    store = createServerStore();
  });

  describe('initial state', () => {
    it('server is undefined', () => {
      expect(store.getState().server).toBeUndefined();
    });

    it('serverPermissions is an empty array', () => {
      expect(store.getState().serverPermissions).toEqual([]);
    });

    it('status is null', () => {
      expect(store.getState().status).toBeNull();
    });

    it('databases is an empty array', () => {
      expect(store.getState().databases).toEqual([]);
    });

    it('fileDirectory is /', () => {
      expect(store.getState().fileDirectory).toBe('/');
    });

    it('selectedFiles is an empty array', () => {
      expect(store.getState().selectedFiles).toEqual([]);
    });

    it('subusers is an empty array', () => {
      expect(store.getState().subusers).toEqual([]);
    });

    it('schedules is an empty array', () => {
      expect(store.getState().schedules).toEqual([]);
    });

    it('socketInstance is null', () => {
      expect(store.getState().socketInstance).toBeNull();
    });

    it('socketConnected is false', () => {
      expect(store.getState().socketConnected).toBe(false);
    });
  });

  describe('setServer', () => {
    it('sets the server', () => {
      const server = makeServer();
      store.getState().setServer(server);
      expect(store.getState().server).toEqual(server);
    });

    it('does not update if server is deeply equal', () => {
      const server = makeServer();
      store.getState().setServer(server);

      const listener = vi.fn();
      store.subscribe(listener);

      // Set the same server again (deep equal copy)
      store.getState().setServer(makeServer());
      expect(listener).not.toHaveBeenCalled();
    });

    it('updates when server has different values', () => {
      const server = makeServer();
      store.getState().setServer(server);

      const listener = vi.fn();
      store.subscribe(listener);

      store.getState().setServer(makeServer({ name: 'Changed' }));
      expect(listener).toHaveBeenCalled();
      expect(store.getState().server?.name).toBe('Changed');
    });
  });

  describe('setServerFromState', () => {
    it('transforms server using the provided function', () => {
      store.getState().setServer(makeServer({ name: 'Original' }));
      store.getState().setServerFromState((s) => ({ ...s, name: 'Updated' }));
      expect(store.getState().server?.name).toBe('Updated');
    });

    it('does nothing when server is undefined', () => {
      const listener = vi.fn();
      store.subscribe(listener);

      store.getState().setServerFromState((s) => ({ ...s, name: 'nope' }));
      expect(listener).not.toHaveBeenCalled();
    });

    it('does not update if result is deeply equal', () => {
      store.getState().setServer(makeServer());

      const listener = vi.fn();
      store.subscribe(listener);

      store.getState().setServerFromState((s) => ({ ...s }));
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('setPermissions', () => {
    it('sets permissions', () => {
      store.getState().setPermissions(['control.console', 'file.read']);
      expect(store.getState().serverPermissions).toEqual(['control.console', 'file.read']);
    });

    it('does not update if permissions are deeply equal', () => {
      store.getState().setPermissions(['control.console']);

      const listener = vi.fn();
      store.subscribe(listener);

      store.getState().setPermissions(['control.console']);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('setStatus', () => {
    it('sets the status', () => {
      store.getState().setStatus('running');
      expect(store.getState().status).toBe('running');
    });
  });

  describe('database actions', () => {
    it('setDatabases replaces all databases', () => {
      const dbs = [makeDatabase({ id: 'db-1' }), makeDatabase({ id: 'db-2' })];
      store.getState().setDatabases(dbs);
      expect(store.getState().databases).toEqual(dbs);
    });

    it('appendDatabase adds a new database', () => {
      store.getState().setDatabases([makeDatabase({ id: 'db-1' })]);
      store.getState().appendDatabase(makeDatabase({ id: 'db-2', name: 'second' }));

      expect(store.getState().databases).toHaveLength(2);
      expect(store.getState().databases[1].id).toBe('db-2');
    });

    it('appendDatabase updates an existing database by id', () => {
      store.getState().setDatabases([makeDatabase({ id: 'db-1', name: 'original' })]);
      store.getState().appendDatabase(makeDatabase({ id: 'db-1', name: 'updated' }));

      expect(store.getState().databases).toHaveLength(1);
      expect(store.getState().databases[0].name).toBe('updated');
    });

    it('removeDatabase removes by id', () => {
      store.getState().setDatabases([
        makeDatabase({ id: 'db-1' }),
        makeDatabase({ id: 'db-2' }),
      ]);
      store.getState().removeDatabase('db-1');

      expect(store.getState().databases).toHaveLength(1);
      expect(store.getState().databases[0].id).toBe('db-2');
    });

    it('removeDatabase is a no-op for non-existent id', () => {
      store.getState().setDatabases([makeDatabase({ id: 'db-1' })]);
      store.getState().removeDatabase('db-999');
      expect(store.getState().databases).toHaveLength(1);
    });
  });

  describe('file directory', () => {
    it('setFileDirectory normalizes empty string to /', () => {
      store.getState().setFileDirectory('');
      expect(store.getState().fileDirectory).toBe('/');
    });

    it('setFileDirectory normalizes double slashes', () => {
      store.getState().setFileDirectory('//');
      expect(store.getState().fileDirectory).toBe('/');
    });

    it('setFileDirectory normalizes path with multiple slashes', () => {
      store.getState().setFileDirectory('/home//user///files');
      expect(store.getState().fileDirectory).toBe('/home/user/files');
    });

    it('setFileDirectory keeps valid paths unchanged', () => {
      store.getState().setFileDirectory('/home/user');
      expect(store.getState().fileDirectory).toBe('/home/user');
    });
  });

  describe('selected files', () => {
    it('setSelectedFiles replaces the selection', () => {
      store.getState().setSelectedFiles(['a.txt', 'b.txt']);
      expect(store.getState().selectedFiles).toEqual(['a.txt', 'b.txt']);
    });

    it('appendSelectedFile adds a file', () => {
      store.getState().setSelectedFiles(['a.txt']);
      store.getState().appendSelectedFile('b.txt');
      expect(store.getState().selectedFiles).toEqual(['a.txt', 'b.txt']);
    });

    it('appendSelectedFile does not duplicate', () => {
      store.getState().setSelectedFiles(['a.txt', 'b.txt']);
      store.getState().appendSelectedFile('a.txt');
      expect(store.getState().selectedFiles).toEqual(['b.txt', 'a.txt']);
    });

    it('removeSelectedFile removes a specific file', () => {
      store.getState().setSelectedFiles(['a.txt', 'b.txt', 'c.txt']);
      store.getState().removeSelectedFile('b.txt');
      expect(store.getState().selectedFiles).toEqual(['a.txt', 'c.txt']);
    });

    it('removeSelectedFile is a no-op for non-existent file', () => {
      store.getState().setSelectedFiles(['a.txt']);
      store.getState().removeSelectedFile('z.txt');
      expect(store.getState().selectedFiles).toEqual(['a.txt']);
    });
  });

  describe('subuser actions', () => {
    it('setSubusers replaces all subusers', () => {
      const subs = [makeSubuser({ uuid: 'sub-1' }), makeSubuser({ uuid: 'sub-2' })];
      store.getState().setSubusers(subs);
      expect(store.getState().subusers).toEqual(subs);
    });

    it('appendSubuser adds a new subuser', () => {
      store.getState().setSubusers([makeSubuser({ uuid: 'sub-1' })]);
      store.getState().appendSubuser(makeSubuser({ uuid: 'sub-2', username: 'newuser' }));

      expect(store.getState().subusers).toHaveLength(2);
      expect(store.getState().subusers[1].uuid).toBe('sub-2');
    });

    it('appendSubuser updates an existing subuser by uuid', () => {
      store.getState().setSubusers([makeSubuser({ uuid: 'sub-1', username: 'original' })]);
      store.getState().appendSubuser(makeSubuser({ uuid: 'sub-1', username: 'updated' }));

      expect(store.getState().subusers).toHaveLength(1);
      expect(store.getState().subusers[0].username).toBe('updated');
    });

    it('removeSubuser removes by uuid', () => {
      store.getState().setSubusers([
        makeSubuser({ uuid: 'sub-1' }),
        makeSubuser({ uuid: 'sub-2' }),
      ]);
      store.getState().removeSubuser('sub-1');

      expect(store.getState().subusers).toHaveLength(1);
      expect(store.getState().subusers[0].uuid).toBe('sub-2');
    });
  });

  describe('schedule actions', () => {
    it('setSchedules replaces all schedules', () => {
      const schedules = [makeSchedule({ id: 1 }), makeSchedule({ id: 2 })];
      store.getState().setSchedules(schedules);
      expect(store.getState().schedules).toEqual(schedules);
    });

    it('appendSchedule adds a new schedule', () => {
      store.getState().setSchedules([makeSchedule({ id: 1 })]);
      store.getState().appendSchedule(makeSchedule({ id: 2, name: 'Weekly' }));

      expect(store.getState().schedules).toHaveLength(2);
      expect(store.getState().schedules[1].id).toBe(2);
    });

    it('appendSchedule updates an existing schedule by id', () => {
      store.getState().setSchedules([makeSchedule({ id: 1, name: 'Original' })]);
      store.getState().appendSchedule(makeSchedule({ id: 1, name: 'Updated' }));

      expect(store.getState().schedules).toHaveLength(1);
      expect(store.getState().schedules[0].name).toBe('Updated');
    });

    it('removeSchedule removes by id', () => {
      store.getState().setSchedules([
        makeSchedule({ id: 1 }),
        makeSchedule({ id: 2 }),
      ]);
      store.getState().removeSchedule(1);

      expect(store.getState().schedules).toHaveLength(1);
      expect(store.getState().schedules[0].id).toBe(2);
    });
  });

  describe('clearServerState', () => {
    it('resets all state to initial values', () => {
      // Populate the store
      store.getState().setServer(makeServer());
      store.getState().setPermissions(['control.console']);
      store.getState().setStatus('running');
      store.getState().setDatabases([makeDatabase()]);
      store.getState().setFileDirectory('/home/user');
      store.getState().setSelectedFiles(['a.txt']);
      store.getState().setSubusers([makeSubuser()]);
      store.getState().setSchedules([makeSchedule()]);

      store.getState().clearServerState();

      const state = store.getState();
      expect(state.server).toBeUndefined();
      expect(state.serverPermissions).toEqual([]);
      expect(state.status).toBeNull();
      expect(state.databases).toEqual([]);
      expect(state.fileDirectory).toBe('/');
      expect(state.selectedFiles).toEqual([]);
      expect(state.subusers).toEqual([]);
      expect(state.schedules).toEqual([]);
      expect(state.socketInstance).toBeNull();
      expect(state.socketConnected).toBe(false);
    });

    it('closes and removes listeners from socket if present', () => {
      const mockSocket = {
        removeAllListeners: vi.fn(),
        close: vi.fn(),
      };

      store.getState().setSocket(mockSocket as never);
      store.getState().clearServerState();

      expect(mockSocket.removeAllListeners).toHaveBeenCalledOnce();
      expect(mockSocket.close).toHaveBeenCalledOnce();
    });
  });
});
