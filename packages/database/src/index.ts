import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../generated/prisma/client.js'

// Re-export the generated types so consumers can do
// `import { Prisma, type Workspace } from '@shiplog/database'`.
export * from '../generated/prisma/client.js'
export type { PrismaClient } from '../generated/prisma/client.js'

// Prisma 7 deprecated the Rust query engine; PrismaClient now requires a
// driver adapter. `@prisma/adapter-pg` wraps node-postgres and reads the
// connection string up front (no lazy env reads).
const createPrismaClient = (): PrismaClient => {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      '[@shiplog/database] DATABASE_URL is not set. Add it to your .env before importing this package.',
    )
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['query', 'info', 'warn', 'error'],
  })
}

// Cache on globalThis so Next.js / NestJS dev reloads don't open a new pool
// on every HMR cycle. In production we always construct fresh.
const globalForPrisma = globalThis as unknown as {
  __shiplogPrisma?: PrismaClient
}

export const prisma: PrismaClient =
  globalForPrisma.__shiplogPrisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__shiplogPrisma = prisma
}

export default prisma
