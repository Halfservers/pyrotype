import { logger } from '../../config/logger'

interface DatabaseHostLike {
  host: string
  port: number
  username: string
  password: string
}

function esc(id: string): string {
  return '`' + id.replace(/`/g, '``') + '`'
}

function quote(str: string): string {
  return "'" + str.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
}

/**
 * Attempt to execute SQL statements on a remote MySQL host.
 *
 * Cloudflare Workers cannot open raw TCP sockets to MySQL.
 * This requires either a Hyperdrive binding or an HTTP-based MySQL proxy.
 * When unavailable, the SQL is logged and the operation is skipped gracefully.
 */
async function executeRemoteSql(host: DatabaseHostLike, statements: string[]): Promise<boolean> {
  logger.info('Remote MySQL SQL (not executed — requires Hyperdrive or HTTP MySQL proxy)', {
    host: host.host,
    port: host.port,
    statementCount: statements.length,
  })
  return false
}

export async function createRemoteDatabase(
  host: DatabaseHostLike,
  dbName: string,
  username: string,
  password: string,
  remote: string,
  maxConnections: number,
): Promise<boolean> {
  const statements = [
    `CREATE DATABASE IF NOT EXISTS ${esc(dbName)}`,
    `CREATE USER ${quote(username)}@${quote(remote)} IDENTIFIED BY ${quote(password)}`,
    `GRANT ALL PRIVILEGES ON ${esc(dbName)}.* TO ${quote(username)}@${quote(remote)}`,
    ...(maxConnections > 0
      ? [`ALTER USER ${quote(username)}@${quote(remote)} WITH MAX_USER_CONNECTIONS ${maxConnections}`]
      : []),
    'FLUSH PRIVILEGES',
  ]
  return executeRemoteSql(host, statements)
}

export async function deleteRemoteDatabase(
  host: DatabaseHostLike,
  dbName: string,
  username: string,
  remote: string,
): Promise<boolean> {
  const statements = [
    `DROP USER IF EXISTS ${quote(username)}@${quote(remote)}`,
    `DROP DATABASE IF EXISTS ${esc(dbName)}`,
    'FLUSH PRIVILEGES',
  ]
  return executeRemoteSql(host, statements)
}

export async function resetRemoteDatabasePassword(
  host: DatabaseHostLike,
  dbName: string,
  username: string,
  newPassword: string,
  remote: string,
  maxConnections: number,
): Promise<boolean> {
  const statements = [
    `DROP USER IF EXISTS ${quote(username)}@${quote(remote)}`,
    `CREATE USER ${quote(username)}@${quote(remote)} IDENTIFIED BY ${quote(newPassword)}`,
    `GRANT ALL PRIVILEGES ON ${esc(dbName)}.* TO ${quote(username)}@${quote(remote)}`,
    ...(maxConnections > 0
      ? [`ALTER USER ${quote(username)}@${quote(remote)} WITH MAX_USER_CONNECTIONS ${maxConnections}`]
      : []),
    'FLUSH PRIVILEGES',
  ]
  return executeRemoteSql(host, statements)
}

export async function testDatabaseHostConnection(
  host: DatabaseHostLike,
): Promise<{ success: boolean; error?: string }> {
  return {
    success: false,
    error: 'Raw MySQL connections not supported in Cloudflare Workers. Configure Hyperdrive or an HTTP MySQL proxy.',
  }
}
