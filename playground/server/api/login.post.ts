import * as z from 'zod'
import { Argon2id } from 'oslo/password'
import { PasswordSignInProvider } from '#auth/credentials'

const SignInSchema = z.object({
  username: z.string(),
  password: z.string(),
})

export default PasswordSignInProvider({
  async authorize(event) {
    const { username, password } = await readValidatedBody(event, SignInSchema.parse)

    const user = await prisma.user.findUniqueOrThrow({
      where: {
        username,
      },
      select: {
        id: true,
        credentials: {
          select: {
            password: true,
          },
        },
      },
    })

    if (!user.credentials) {
      return null
    }

    const validPassword = await new Argon2id().verify(
      user.credentials.password,
      password,
    )

    if (!validPassword) {
      return null
    }

    return {
      userId: user.id,
    }
  },
})
