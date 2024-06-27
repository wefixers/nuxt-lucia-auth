import type { Session, User } from '@prisma/client'
import { PrismaAdapter } from '@lucia-auth/adapter-prisma'
import { Lucia, TimeSpan } from 'lucia'
import { prisma } from './db'

const adapter = new PrismaAdapter(prisma.session, prisma.user)

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    name: '__session',
    attributes: {
      secure: !import.meta.dev,
    },
  },
  sessionExpiresIn: new TimeSpan(3, 'w'), // 3 weeks
  getUserAttributes(attributes) {
    return {
      name: attributes.name,
    }
  },
  getSessionAttributes(attributes) {
    return {
      actorId: attributes.actorId,
    }
  },
})

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia
    DatabaseUserAttributes: Pick<User, 'name'>
    DatabaseSessionAttributes: Partial<Pick<Session, 'actorId'>>
  }
}
