import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { AppError } from '../../../../utils/errors'
import { daemonRequest } from '../../../../services/daemon/proxy'
import { generateDaemonJWT } from '../../../../services/daemon/jwt'
import { getDaemonBaseUrl } from '../../../../services/daemon/proxy'
import { logActivity } from '../../../../services/activity'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function listDirectory(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const directory = c.req.query('directory') ?? '/'

  const data = await daemonRequest(
    node, 'GET',
    `/api/servers/${server.uuid}/files/list-directory?directory=${encodeURIComponent(directory)}`,
  )

  return c.json({ object: 'list', data })
}

export async function getContents(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!
  const file = c.req.query('file')

  if (!file) {
    throw new AppError('A file path must be provided.', 422, 'ValidationError')
  }

  const contents = await daemonRequest<string>(
    node, 'GET',
    `/api/servers/${server.uuid}/files/contents?file=${encodeURIComponent(file)}`,
  )

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(c.var.prisma, {
    event: 'server:file.read',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { file },
  })

  return c.text(typeof contents === 'string' ? contents : JSON.stringify(contents))
}

export async function downloadFile(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!
  const file = c.req.query('file')

  if (!file) {
    throw new AppError('A file path must be provided.', 422, 'ValidationError')
  }

  const token = await generateDaemonJWT(
    c.env.APP_KEY,
    { server_uuid: server.uuid, user_id: user.id, file_path: file },
    300,
  )

  const url = `${getDaemonBaseUrl(node)}/download/file?token=${token}`

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(c.var.prisma, {
    event: 'server:file.download',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { file },
  })

  return c.json({
    object: 'signed_url',
    attributes: { url },
  })
}

export async function writeFile(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!
  const file = c.req.query('file')

  const rawBody = await c.req.text()

  await daemonRequest(
    node, 'POST',
    `/api/servers/${server.uuid}/files/write?file=${encodeURIComponent(file ?? '')}`,
    rawBody,
    { contentType: 'text/plain' },
  )

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(c.var.prisma, {
    event: 'server:file.write',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { file },
  })

  return c.body(null, 204)
}

export async function createFolder(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!
  const { name, root } = await c.req.json()

  await daemonRequest(
    node, 'POST',
    `/api/servers/${server.uuid}/files/create-directory`,
    { root, name },
  )

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(c.var.prisma, {
    event: 'server:file.create-directory',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { name, root },
  })

  return c.body(null, 204)
}

export async function renameFile(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!
  const { root, files } = await c.req.json()

  await daemonRequest(
    node, 'PUT',
    `/api/servers/${server.uuid}/files/rename`,
    { root, files },
  )

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(c.var.prisma, {
    event: 'server:file.rename',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { root, files },
  })

  return c.body(null, 204)
}

export async function copyFile(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!
  const { location } = await c.req.json()

  await daemonRequest(
    node, 'POST',
    `/api/servers/${server.uuid}/files/copy`,
    { location },
  )

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(c.var.prisma, {
    event: 'server:file.copy',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { location },
  })

  return c.body(null, 204)
}

export async function compressFiles(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!
  const { root, files } = await c.req.json()

  const result = await daemonRequest(
    node, 'POST',
    `/api/servers/${server.uuid}/files/compress`,
    { root, files },
  )

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(c.var.prisma, {
    event: 'server:file.compress',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { root, files },
  })

  return c.json({ object: 'file_object', attributes: result })
}

export async function decompressFiles(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!
  const { root, file } = await c.req.json()

  await daemonRequest(
    node, 'POST',
    `/api/servers/${server.uuid}/files/decompress`,
    { root, file },
  )

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(c.var.prisma, {
    event: 'server:file.decompress',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { root, file },
  })

  return c.body(null, 204)
}

export async function deleteFiles(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!
  const { root, files } = await c.req.json()

  await daemonRequest(
    node, 'POST',
    `/api/servers/${server.uuid}/files/delete`,
    { root, files },
  )

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(c.var.prisma, {
    event: 'server:file.delete',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { root, files },
  })

  return c.body(null, 204)
}

export async function chmodFiles(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!
  const { root, files } = await c.req.json()

  await daemonRequest(
    node, 'POST',
    `/api/servers/${server.uuid}/files/chmod`,
    { root, files },
  )

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(c.var.prisma, {
    event: 'server:file.chmod',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { root, files },
  })

  return c.body(null, 204)
}

export async function pullFile(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!
  const { url, directory } = await c.req.json()

  await daemonRequest(
    node, 'POST',
    `/api/servers/${server.uuid}/files/pull`,
    { url, directory },
  )

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(c.var.prisma, {
    event: 'server:file.pull',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { url, directory },
  })

  return c.body(null, 204)
}
