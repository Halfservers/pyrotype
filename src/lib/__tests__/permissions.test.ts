import { describe, it, expect } from 'vitest';

import permissions from '../permissions';

const expectedCategories = [
  'control',
  'user',
  'file',
  'backup',
  'allocation',
  'startup',
  'database',
  'schedule',
  'settings',
  'activity',
  'websocket',
] as const;

describe('permissions', () => {
  it('has all expected top-level categories', () => {
    for (const category of expectedCategories) {
      expect(permissions).toHaveProperty(category);
    }
  });

  it('does not have unexpected categories', () => {
    const actual = Object.keys(permissions).sort();
    const expected = [...expectedCategories].sort();
    expect(actual).toEqual(expected);
  });

  for (const category of expectedCategories) {
    describe(`${category} category`, () => {
      it('has a description string', () => {
        expect(typeof permissions[category].description).toBe('string');
        expect(permissions[category].description.length).toBeGreaterThan(0);
      });

      it('has a non-empty keys object', () => {
        expect(typeof permissions[category].keys).toBe('object');
        expect(Object.keys(permissions[category].keys).length).toBeGreaterThan(0);
      });

      it('has string values for all keys', () => {
        for (const value of Object.values(permissions[category].keys)) {
          expect(typeof value).toBe('string');
          expect((value as string).length).toBeGreaterThan(0);
        }
      });
    });
  }

  describe('specific permission keys', () => {
    it('control has console key', () => {
      expect(permissions.control.keys).toHaveProperty('console');
    });

    it('control has start, stop, restart keys', () => {
      expect(permissions.control.keys).toHaveProperty('start');
      expect(permissions.control.keys).toHaveProperty('stop');
      expect(permissions.control.keys).toHaveProperty('restart');
    });

    it('file has sftp key', () => {
      expect(permissions.file.keys).toHaveProperty('sftp');
    });

    it('file has read-content key', () => {
      expect(permissions.file.keys).toHaveProperty('read-content');
    });

    it('backup has restore key', () => {
      expect(permissions.backup.keys).toHaveProperty('restore');
    });

    it('database has view_password key', () => {
      expect(permissions.database.keys).toHaveProperty('view_password');
    });

    it('websocket has connect key', () => {
      expect(permissions.websocket.keys).toHaveProperty('connect');
    });

    it('settings has rename and reinstall keys', () => {
      expect(permissions.settings.keys).toHaveProperty('rename');
      expect(permissions.settings.keys).toHaveProperty('reinstall');
    });

    it('startup has docker-image key', () => {
      expect(permissions.startup.keys).toHaveProperty('docker-image');
    });
  });
});
