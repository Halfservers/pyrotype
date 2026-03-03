import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { fractalList, fractalItem } from '../../../../utils/response'
import { NotFoundError } from '../../../../utils/errors'
import { getWingsClient } from '../../../../services/wings/client'
import { createDaemonToken } from '../../../../services/auth/daemonToken'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

async function resolveServer(c: AppContext): Promise<any> {
  const serverId = c.req.param('server')
  const prisma = c.var.prisma
  const server = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    include: { node: true },
  })
  if (!server) throw new NotFoundError('Server not found')
  return server
}

export async function directory(c: AppContext) {
  const server = await resolveServer(c)
  const dir = c.req.query('directory') ?? '/'
  const wings = getWingsClient(server.node!)
  const files = await wings.listDirectory(server.uuid, dir)

  return c.json(fractalList('file_object', files))
}

export async function contents(c: AppContext) {
  const server = await resolveServer(c)
  const file = c.req.query('file') as string
  const wings = getWingsClient(server.node!)
  const content = await wings.getFileContents(server.uuid, file)

  return c.text(content)
}

export async function download(c: AppContext) {
  const user = c.var.user!
  const server = await resolveServer(c)
  const file = c.req.query('file') as string

  const token = await createDaemonToken(server.node!, user, {
    file_path: decodeURIComponent(file),
    server_uuid: server.uuid,
  })

  const node = server.node!
  const url = `${node.scheme}://${node.fqdn}:${node.daemonListen}/download/file?token=${token}`

  return c.json({
    object: 'signed_url',
    attributes: { url },
  })
}

export async function write(c: AppContext) {
  const server = await resolveServer(c)
  const file = c.req.query('file') as string
  const wings = getWingsClient(server.node!)
  const body = await c.req.json()
  await wings.writeFile(server.uuid, file, body)

  return c.body(null, 204)
}

export async function create(c: AppContext) {
  const server = await resolveServer(c)
  const { name, root } = await c.req.json()
  const wings = getWingsClient(server.node!)
  await wings.createDirectory(server.uuid, root ?? '/', name)

  return c.body(null, 204)
}

export async function rename(c: AppContext) {
  const server = await resolveServer(c)
  const { root, files } = await c.req.json()
  const wings = getWingsClient(server.node!)
  await wings.renameFiles(server.uuid, root, files)

  return c.body(null, 204)
}

export async function copy(c: AppContext) {
  const server = await resolveServer(c)
  const { location } = await c.req.json()
  const wings = getWingsClient(server.node!)
  await wings.copyFile(server.uuid, location)

  return c.body(null, 204)
}

export async function compress(c: AppContext) {
  const server = await resolveServer(c)
  const { root, files } = await c.req.json()
  const wings = getWingsClient(server.node!)
  const file = await wings.compressFiles(server.uuid, root, files)

  return c.json(fractalItem('file_object', file))
}

export async function decompress(c: AppContext) {
  const server = await resolveServer(c)
  const { root, file } = await c.req.json()
  const wings = getWingsClient(server.node!)
  await wings.decompressFile(server.uuid, root, file)

  return c.body(null, 204)
}

export async function deleteFn(c: AppContext) {
  const server = await resolveServer(c)
  const { root, files } = await c.req.json()
  const wings = getWingsClient(server.node!)
  await wings.deleteFiles(server.uuid, root, files)

  return c.body(null, 204)
}

export async function chmod(c: AppContext) {
  const server = await resolveServer(c)
  const { root, files } = await c.req.json()
  const wings = getWingsClient(server.node!)
  await wings.chmodFiles(server.uuid, root, files)

  return c.body(null, 204)
}

export async function pull(c: AppContext) {
  const server = await resolveServer(c)
  const { url, directory: dir } = await c.req.json()
  const wings = getWingsClient(server.node!)
  await wings.pullFile(server.uuid, url, dir)

  return c.body(null, 204)
}

export async function upload(c: AppContext) {
  const user = c.var.user!
  const server = await resolveServer(c)
  const node = server.node!

  const token = await createDaemonToken(node, user, {
    server_uuid: server.uuid,
  })

  const url = `${node.scheme}://${node.fqdn}:${node.daemonListen}/upload/file?token=${token}`

  return c.json({
    object: 'signed_url',
    attributes: { url },
  })
}
