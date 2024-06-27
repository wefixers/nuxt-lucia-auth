import type { User } from 'lucia'
import { computed, createError, unref, useRequestFetch, useState } from '#imports'

// HACK: undefined is used to indicate session has never been fetched
const useUserState = () => useState<User | null>('auth-user', () => undefined as unknown as null)

export function useUser() {
  const user = useUserState()
  return user
}

export function useAuthenticatedUser() {
  const user = useUserState()
  return computed(() => {
    const userValue = unref(user)

    if (!userValue) {
      throw createError('useAuthenticatedUser() can only be used in protected pages')
    }

    return userValue
  })
}

export function useAuth() {
  return {
    fetch,
  }
}

async function fetch() {
  const user = useUserState()

  let data: User | null | undefined

  try {
    data = await useRequestFetch()('/api/auth/session', {
      retry: false,
      headers: {
        Accept: 'application/json',
      },
    })
  }
  catch (e) {
    if (import.meta.dev) {
      console.error('[Lucia-Nuxt]: ', e)
    }
  }

  if (data) {
    user.value = data
  }
}
