import { describe, it, expect } from 'vitest';

import { queryKeys } from '../queries/keys';

describe('queryKeys', () => {
  describe('servers', () => {
    it('all returns ["servers"]', () => {
      expect(queryKeys.servers.all).toEqual(['servers']);
    });

    it('list returns ["servers", "list", params]', () => {
      const params = { page: 1 };
      expect(queryKeys.servers.list(params)).toEqual(['servers', 'list', params]);
    });

    it('list with no params returns ["servers", "list", undefined]', () => {
      expect(queryKeys.servers.list()).toEqual(['servers', 'list', undefined]);
    });

    it('detail returns ["servers", id]', () => {
      expect(queryKeys.servers.detail('abc')).toEqual(['servers', 'abc']);
    });

    it('backups returns ["servers", id, "backups"]', () => {
      expect(queryKeys.servers.backups('abc')).toEqual(['servers', 'abc', 'backups']);
    });

    it('databases returns ["servers", id, "databases"]', () => {
      expect(queryKeys.servers.databases('abc')).toEqual(['servers', 'abc', 'databases']);
    });

    it('files returns ["servers", id, "files", dir]', () => {
      expect(queryKeys.servers.files('abc', '/home')).toEqual(['servers', 'abc', 'files', '/home']);
    });

    it('schedules returns ["servers", id, "schedules"]', () => {
      expect(queryKeys.servers.schedules('abc')).toEqual(['servers', 'abc', 'schedules']);
    });

    it('startup returns ["servers", id, "startup"]', () => {
      expect(queryKeys.servers.startup('abc')).toEqual(['servers', 'abc', 'startup']);
    });

    it('allocations returns ["servers", id, "allocations"]', () => {
      expect(queryKeys.servers.allocations('abc')).toEqual(['servers', 'abc', 'allocations']);
    });

    it('subusers returns ["servers", id, "subusers"]', () => {
      expect(queryKeys.servers.subusers('abc')).toEqual(['servers', 'abc', 'subusers']);
    });

    it('activity returns ["servers", id, "activity"]', () => {
      expect(queryKeys.servers.activity('abc')).toEqual(['servers', 'abc', 'activity']);
    });

    it('all server sub-keys include the server id in hierarchical position', () => {
      const id = 'srv-123';
      const subKeyFns = [
        queryKeys.servers.backups,
        queryKeys.servers.databases,
        queryKeys.servers.schedules,
        queryKeys.servers.startup,
        queryKeys.servers.allocations,
        queryKeys.servers.subusers,
        queryKeys.servers.activity,
      ];

      for (const fn of subKeyFns) {
        const key = fn(id);
        expect(key[0]).toBe('servers');
        expect(key[1]).toBe(id);
        expect(key.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('account', () => {
    it('all returns ["account"]', () => {
      expect(queryKeys.account.all).toEqual(['account']);
    });

    it('activity returns ["account", "activity"]', () => {
      expect(queryKeys.account.activity()).toEqual(['account', 'activity']);
    });

    it('apiKeys returns ["account", "apiKeys"]', () => {
      expect(queryKeys.account.apiKeys()).toEqual(['account', 'apiKeys']);
    });

    it('sshKeys returns ["account", "sshKeys"]', () => {
      expect(queryKeys.account.sshKeys()).toEqual(['account', 'sshKeys']);
    });

    it('all account sub-keys start with "account"', () => {
      const subKeyFns = [
        queryKeys.account.activity,
        queryKeys.account.apiKeys,
        queryKeys.account.sshKeys,
      ];

      for (const fn of subKeyFns) {
        expect(fn()[0]).toBe('account');
      }
    });
  });
});
