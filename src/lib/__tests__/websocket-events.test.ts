import { describe, it, expect } from 'vitest';

import { SocketEvent, SocketRequest } from '../websocket/events';

describe('SocketEvent', () => {
  it('has correct DAEMON_MESSAGE value', () => {
    expect(SocketEvent.DAEMON_MESSAGE).toBe('daemon message');
  });

  it('has correct DAEMON_ERROR value', () => {
    expect(SocketEvent.DAEMON_ERROR).toBe('daemon error');
  });

  it('has correct INSTALL_OUTPUT value', () => {
    expect(SocketEvent.INSTALL_OUTPUT).toBe('install output');
  });

  it('has correct INSTALL_STARTED value', () => {
    expect(SocketEvent.INSTALL_STARTED).toBe('install started');
  });

  it('has correct INSTALL_COMPLETED value', () => {
    expect(SocketEvent.INSTALL_COMPLETED).toBe('install completed');
  });

  it('has correct CONSOLE_OUTPUT value', () => {
    expect(SocketEvent.CONSOLE_OUTPUT).toBe('console output');
  });

  it('has correct STATUS value', () => {
    expect(SocketEvent.STATUS).toBe('status');
  });

  it('has correct STATS value', () => {
    expect(SocketEvent.STATS).toBe('stats');
  });

  it('has correct TRANSFER_LOGS value', () => {
    expect(SocketEvent.TRANSFER_LOGS).toBe('transfer logs');
  });

  it('has correct TRANSFER_STATUS value', () => {
    expect(SocketEvent.TRANSFER_STATUS).toBe('transfer status');
  });

  it('has correct BACKUP_COMPLETED value', () => {
    expect(SocketEvent.BACKUP_COMPLETED).toBe('backup completed');
  });

  it('has correct BACKUP_STATUS value', () => {
    expect(SocketEvent.BACKUP_STATUS).toBe('backup.status');
  });

  it('has correct BACKUP_RESTORE_COMPLETED value', () => {
    expect(SocketEvent.BACKUP_RESTORE_COMPLETED).toBe('backup restore completed');
  });

  it('has exactly 13 event types', () => {
    const values = Object.values(SocketEvent);
    expect(values).toHaveLength(13);
  });
});

describe('SocketRequest', () => {
  it('has correct SEND_LOGS value', () => {
    expect(SocketRequest.SEND_LOGS).toBe('send logs');
  });

  it('has correct SEND_STATS value', () => {
    expect(SocketRequest.SEND_STATS).toBe('send stats');
  });

  it('has correct SET_STATE value', () => {
    expect(SocketRequest.SET_STATE).toBe('set state');
  });

  it('has exactly 3 request types', () => {
    const values = Object.values(SocketRequest);
    expect(values).toHaveLength(3);
  });
});
