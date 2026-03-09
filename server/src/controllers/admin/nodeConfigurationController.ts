import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { NotFoundError } from '../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const node = await prisma.node.findUnique({ where: { id } })
  if (!node) throw new NotFoundError('Node not found')

  const mounts = await prisma.mountNode.findMany({
    where: { nodeId: node.id },
    include: { mount: true },
  })

  const configuration = {
    debug: false,
    uuid: node.uuid,
    token_id: node.daemonTokenId,
    token: node.daemonToken,
    api: {
      host: '0.0.0.0',
      port: node.daemonListen,
      ssl: {
        enabled: node.scheme === 'https',
        cert: '/etc/letsencrypt/live/' + node.fqdn + '/fullchain.pem',
        key: '/etc/letsencrypt/live/' + node.fqdn + '/privkey.pem',
      },
      upload_limit: node.uploadSize,
    },
    system: {
      data: node.daemonBase,
      sftp: {
        bind_port: node.daemonSFTP,
      },
    },
    allowed_mounts: mounts.map((mn: any) => mn.mount.target),
    remote: c.env.APP_URL || `${c.req.url.split('/api/')[0]}`,
  }

  return c.json(configuration)
}
