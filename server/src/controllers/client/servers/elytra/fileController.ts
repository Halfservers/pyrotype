import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { AppError } from '../../../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

// All file operations proxy to the Elytra daemon through the node's connection address.
// In production, each handler would make an HTTP request to the daemon.

export async function listDirectory(c: AppContext) {
  const server = c.var.server!
  const directory = c.req.query('directory') ?? '/'

  // TODO: Proxy to daemon: GET /api/servers/{uuid}/files/list?directory={directory}
  return c.json({ object: 'list', data: [] })
}

export async function getContents(c: AppContext) {
  const server = c.var.server!
  const file = c.req.query('file')

  if (!file) {
    throw new AppError('A file path must be provided.', 422, 'ValidationError')
  }

  // TODO: Proxy to daemon: GET /api/servers/{uuid}/files/contents?file={file}
  // TODO: Activity log: server:file.read
  return c.text('')
}

export async function downloadFile(c: AppContext) {
  const server = c.var.server!
  const file = c.req.query('file')

  if (!file) {
    throw new AppError('A file path must be provided.', 422, 'ValidationError')
  }

  // Generate a signed download token for the daemon
  // TODO: Activity log: server:file.download
  return c.json({
    object: 'signed_url',
    attributes: {
      url: '', // placeholder: would be a signed URL to the daemon
    },
  })
}

export async function writeFile(c: AppContext) {
  const server = c.var.server!
  const file = c.req.query('file')

  // TODO: Proxy to daemon: POST /api/servers/{uuid}/files/write?file={file}
  // TODO: Activity log: server:file.write
  return c.body(null, 204)
}

export async function createFolder(c: AppContext) {
  const server = c.var.server!
  const { name, root } = await c.req.json()

  // TODO: Proxy to daemon: POST /api/servers/{uuid}/files/create-directory
  // TODO: Activity log: server:file.create-directory
  return c.body(null, 204)
}

export async function renameFile(c: AppContext) {
  const server = c.var.server!

  // TODO: Proxy to daemon: PUT /api/servers/{uuid}/files/rename
  // TODO: Activity log: server:file.rename
  return c.body(null, 204)
}

export async function copyFile(c: AppContext) {
  const server = c.var.server!

  // TODO: Proxy to daemon: POST /api/servers/{uuid}/files/copy
  // TODO: Activity log: server:file.copy
  return c.body(null, 204)
}

export async function compressFiles(c: AppContext) {
  const server = c.var.server!

  // TODO: Proxy to daemon: POST /api/servers/{uuid}/files/compress
  // TODO: Activity log: server:file.compress
  return c.json({ object: 'file_object', attributes: {} })
}

export async function decompressFiles(c: AppContext) {
  const server = c.var.server!

  // TODO: Proxy to daemon: POST /api/servers/{uuid}/files/decompress
  // TODO: Activity log: server:file.decompress
  return c.body(null, 204)
}

export async function deleteFiles(c: AppContext) {
  const server = c.var.server!

  // TODO: Proxy to daemon: POST /api/servers/{uuid}/files/delete
  // TODO: Activity log: server:file.delete
  return c.body(null, 204)
}

export async function chmodFiles(c: AppContext) {
  const server = c.var.server!

  // TODO: Proxy to daemon: POST /api/servers/{uuid}/files/chmod
  return c.body(null, 204)
}

export async function pullFile(c: AppContext) {
  const server = c.var.server!

  // TODO: Proxy to daemon: POST /api/servers/{uuid}/files/pull
  // TODO: Activity log: server:file.pull
  return c.body(null, 204)
}
