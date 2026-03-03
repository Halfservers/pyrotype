import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { NotFoundError, AppError } from '../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function getRusticConfig(c: AppContext) {
  const prisma = c.var.prisma
  const uuid = c.req.param('uuid')
  const type = c.req.query('type') ?? 'local'

  if (!['local', 's3'].includes(type)) {
    throw new AppError('Invalid backup type', 400, 'BadRequest')
  }

  const server = await prisma.server.findFirst({
    where: { uuid },
  })

  if (!server) {
    throw new NotFoundError('Server not found.')
  }

  // Generate a deterministic repository password from server UUID + app key
  const encoder = new TextEncoder()
  const data = encoder.encode(server.uuid + c.env.APP_KEY)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const repositoryPassword = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const result: Record<string, unknown> = {
    backup_type: type,
    repository_password: repositoryPassword,
    repository_path: type === 'local'
      ? `/var/lib/pterodactyl/rustic-repos/${server.uuid}`
      : `rustic-repos/${server.uuid}`,
  }

  // S3 credentials would come from environment/config in production
  if (type === 's3') {
    result.s3_credentials = {
      access_key_id: '',
      secret_access_key: '',
      session_token: '',
      region: 'us-east-1',
      bucket: '',
      endpoint: '',
      force_path_style: false,
      disable_ssl: false,
      ca_cert_path: '',
    }
  }

  return c.json(result)
}
