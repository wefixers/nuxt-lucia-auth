import { generateId } from 'lucia'
import { GoogleProvider } from '#auth/google'

export default GoogleProvider({
  async authorize({ profile, account }) {
    const user = await prisma.user.upsert({
      where: {
        username: profile.email,
      },
      create: {
        id: generateId(15),
        username: profile.email,
        accounts: {
          create: account,
        },
      },
      update: {
        accounts: {
          create: account,
        },
      },
      select: {
        id: true,
      },
    })

    return {
      userId: user.id,
    }
  },
})
