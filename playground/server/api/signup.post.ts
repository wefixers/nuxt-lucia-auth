import * as z from 'zod'
import { Argon2id } from 'oslo/password'
import { generateId } from 'lucia'
import { PasswordSignUpProvider } from '#auth/credentials'

const SignUpSchema = z.object({
  username: z.string(),
  password: z.string(),
})

export default PasswordSignUpProvider({
  async authorize(event) {
    const { username, password } = await readValidatedBody(event, SignUpSchema.parse)

    const userId = generateId(15)
    const hashedPassword = await new Argon2id().hash(password)

    const user = await prisma.user.create({
      select: {
        id: true,
      },
      data: {
        id: userId,
        username,
        credentials: {
          create: {
            password: hashedPassword,
          },
        },
      },
    })

    return {
      userId: user.id,
    }
  },
})
