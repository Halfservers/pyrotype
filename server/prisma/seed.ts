import { PrismaClient } from '../src/generated/prisma'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function hashPassword(password: string): Promise<string> {
  // Use bcryptjs if available, otherwise simple hash for dev seed
  try {
    const bcrypt = await import('bcryptjs')
    return bcrypt.hash(password, 10)
  } catch {
    // Fallback — not secure, dev only
    return `$dev$${crypto.createHash('sha256').update(password).digest('hex')}`
  }
}

async function main() {
  // ── Settings ────────────────────────────────────────────────────────────
  const defaultSettings = [
    { key: 'app:name', value: 'Pyrotype' },
    { key: 'app:locale', value: 'en' },
    { key: 'app:analytics', value: 'true' },
    { key: 'pterodactyl:captcha:provider', value: 'none' },
    { key: 'pterodactyl:auth:2fa_required', value: '0' },
    { key: 'settings::mail:host', value: 'smtp.example.com' },
    { key: 'settings::mail:port', value: '587' },
    { key: 'settings::mail:encryption', value: 'tls' },
    { key: 'settings::mail:username', value: '' },
    { key: 'settings::mail:from:address', value: 'no-reply@pyrotype.local' },
    { key: 'settings::mail:from:name', value: 'Pyrotype Panel' },
  ]

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    })
  }
  console.log(`Seeded ${defaultSettings.length} settings`)

  // ── Location ────────────────────────────────────────────────────────────
  const location = await prisma.location.upsert({
    where: { short: 'default' },
    update: {},
    create: { short: 'default', long: 'Default Location' },
  })
  console.log(`Seeded location: ${location.short}`)

  // ── Admin User ──────────────────────────────────────────────────────────
  const existingAdmin = await prisma.user.findFirst({ where: { email: 'admin@pyrotype.local' } })
  if (!existingAdmin) {
    const password = await hashPassword('password')
    await prisma.user.create({
      data: {
        uuid: crypto.randomUUID(),
        username: 'admin',
        email: 'admin@pyrotype.local',
        nameFirst: 'Admin',
        nameLast: 'User',
        password,
        language: 'en',
        rootAdmin: true,
        useTotp: false,
        gravatar: false,
      },
    })
    console.log('Seeded dev user: admin@pyrotype.local (password: "password")')
  } else {
    console.log('Dev user already exists, skipping.')
  }

  // ── Nests ───────────────────────────────────────────────────────────────
  const nests = [
    { name: 'Minecraft', description: 'Minecraft Java and Bedrock servers', author: 'support@pterodactyl.io' },
    { name: 'Source Engine', description: 'Source Engine based game servers', author: 'support@pterodactyl.io' },
    { name: 'Voice Servers', description: 'Voice communication servers including Mumble and TeamSpeak', author: 'support@pterodactyl.io' },
    { name: 'Rust', description: 'Rust game servers', author: 'support@pterodactyl.io' },
  ]

  const createdNests: Record<string, number> = {}

  for (const nest of nests) {
    const existing = await prisma.nest.findFirst({ where: { name: nest.name } })
    if (existing) {
      createdNests[nest.name] = existing.id
      continue
    }
    const created = await prisma.nest.create({
      data: {
        uuid: crypto.randomUUID(),
        ...nest,
      },
    })
    createdNests[nest.name] = created.id
  }
  console.log(`Seeded ${nests.length} nests`)

  // ── Eggs ────────────────────────────────────────────────────────────────
  const minecraftNestId = createdNests['Minecraft']
  if (minecraftNestId) {
    const vanillaExists = await prisma.egg.findFirst({
      where: { nestId: minecraftNestId, name: 'Vanilla Minecraft' },
    })

    if (!vanillaExists) {
      const egg = await prisma.egg.create({
        data: {
          uuid: crypto.randomUUID(),
          nestId: minecraftNestId,
          author: 'support@pterodactyl.io',
          name: 'Vanilla Minecraft',
          description: 'Vanilla Minecraft server using the official Mojang jar.',
          dockerImages: JSON.stringify({ 'Java 21': 'ghcr.io/pterodactyl/yolks:java_21' }),
          startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
          configStop: 'stop',
          configStartup: JSON.stringify({ done: ')! For help, type ' }),
          configFiles: JSON.stringify({ 'server.properties': { parser: 'properties', find: { 'server-ip': '0.0.0.0', 'server-port': '{{server.build.default.port}}', 'query.port': '{{server.build.default.port}}' } } }),
          scriptContainer: 'ghcr.io/pterodactyl/installers:alpine',
          scriptEntry: 'ash',
        },
      })

      // Egg variables
      await prisma.eggVariable.createMany({
        data: [
          {
            eggId: egg.id,
            name: 'Server Jar File',
            description: 'The name of the server jarfile to run the server with.',
            envVariable: 'SERVER_JARFILE',
            defaultValue: 'server.jar',
            userViewable: true,
            userEditable: true,
            rules: 'required|regex:/^([\\w\\d._-]+)(\\.jar)$/',
            sort: 1,
          },
          {
            eggId: egg.id,
            name: 'Minecraft Version',
            description: 'The version of Minecraft Vanilla to install. Use "latest" for latest version.',
            envVariable: 'VANILLA_VERSION',
            defaultValue: 'latest',
            userViewable: true,
            userEditable: true,
            rules: 'required|string|max:20',
            sort: 2,
          },
        ],
      })

      console.log('Seeded Vanilla Minecraft egg with 2 variables')
    }

    // Paper egg
    const paperExists = await prisma.egg.findFirst({
      where: { nestId: minecraftNestId, name: 'Paper' },
    })

    if (!paperExists) {
      const egg = await prisma.egg.create({
        data: {
          uuid: crypto.randomUUID(),
          nestId: minecraftNestId,
          author: 'support@pterodactyl.io',
          name: 'Paper',
          description: 'High performance Spigot fork that aims to fix gameplay and mechanics inconsistencies.',
          dockerImages: JSON.stringify({ 'Java 21': 'ghcr.io/pterodactyl/yolks:java_21' }),
          startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
          configStop: 'stop',
          configStartup: JSON.stringify({ done: ')! For help, type ' }),
          configFiles: JSON.stringify({ 'server.properties': { parser: 'properties', find: { 'server-ip': '0.0.0.0', 'server-port': '{{server.build.default.port}}', 'query.port': '{{server.build.default.port}}' } } }),
          scriptContainer: 'ghcr.io/pterodactyl/installers:alpine',
          scriptEntry: 'ash',
        },
      })

      await prisma.eggVariable.createMany({
        data: [
          {
            eggId: egg.id,
            name: 'Server Jar File',
            envVariable: 'SERVER_JARFILE',
            defaultValue: 'server.jar',
            userViewable: true,
            userEditable: true,
            rules: 'required|regex:/^([\\w\\d._-]+)(\\.jar)$/',
            sort: 1,
          },
          {
            eggId: egg.id,
            name: 'Paper Build',
            description: 'The Paper build number to use. Use "latest" for the latest build.',
            envVariable: 'BUILD_NUMBER',
            defaultValue: 'latest',
            userViewable: true,
            userEditable: true,
            rules: 'required|string|max:20',
            sort: 2,
          },
          {
            eggId: egg.id,
            name: 'Minecraft Version',
            envVariable: 'MINECRAFT_VERSION',
            defaultValue: 'latest',
            userViewable: true,
            userEditable: true,
            rules: 'required|string|max:20',
            sort: 3,
          },
        ],
      })

      console.log('Seeded Paper egg with 3 variables')
    }
  }

  const rustNestId = createdNests['Rust']
  if (rustNestId) {
    const rustExists = await prisma.egg.findFirst({
      where: { nestId: rustNestId, name: 'Rust' },
    })

    if (!rustExists) {
      await prisma.egg.create({
        data: {
          uuid: crypto.randomUUID(),
          nestId: rustNestId,
          author: 'support@pterodactyl.io',
          name: 'Rust',
          description: 'The only aim in Rust is to survive. Everything wants you to die.',
          dockerImages: JSON.stringify({ 'Rust': 'ghcr.io/pterodactyl/games:rust' }),
          startup: './RustDedicated -batchmode +server.port {{SERVER_PORT}} +server.identity "rust" +rcon.port {{RCON_PORT}} +rcon.web true +server.hostname "{{HOSTNAME}}" +server.level "{{LEVEL}}" +server.description "{{DESCRIPTION}}" +server.maxplayers {{MAX_PLAYERS}} +rcon.password "{{RCON_PASS}}" +server.worldsize {{WORLD_SIZE}} +server.seed {{WORLD_SEED}} +server.saveinterval {{SAVEINTERVAL}}',
          configStop: 'quit',
          configStartup: JSON.stringify({ done: 'Server startup complete' }),
          scriptContainer: 'ghcr.io/pterodactyl/installers:debian',
          scriptEntry: 'bash',
        },
      })
      console.log('Seeded Rust egg')
    }
  }

  console.log('Seed complete.')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
