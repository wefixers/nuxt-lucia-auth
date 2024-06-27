import type { H3Event } from 'h3'
import { appendHeader, assertMethod, createError, defineEventHandler, getHeader, isError, sendRedirect } from 'h3'
import type { Lucia, UserId } from 'lucia'
import { withQuery } from 'ufo'

type Nullish<T extends NonNullable<unknown>> = T | null | undefined | false

export interface PasswordSignInConfig {
  authorize: (
    event: H3Event,
    data: {
      lucia: Lucia

    }
  ) => Promise<Nullish<{
    userId: UserId
    redirect?: string
  }>>
}

export function PasswordSignInProvider(config: PasswordSignInConfig) {
  return defineEventHandler(async (event) => {
    assertMethod(event, 'POST')

    if (!event.context.$auth) {
      if (import.meta.dev) {
        console.error(
          '[Nuxt-Lucia]: PasswordSignInProvider requires the auth middleware to be enabled, this error will not be thrown in production.',
        )

        throw createError({
          statusCode: 500,
          message: 'PasswordSignInProvider requires the auth middleware to be enabled, this error will not be thrown in production.',
        })
      }

      throw createError({
        statusCode: 400,
      })
    }

    // Get the lucia instance from the context
    const { lucia } = event.context.$auth

    // Redirect the user back by default
    const defaultRedirect = getHeader(event, 'referer') || '/'

    let authorized

    try {
      authorized = await config.authorize(event, {
        lucia,
      })
    }
    catch (error) {
      return handleError(event, error, defaultRedirect)
    }

    if (!authorized) {
      return invalidCredentials(event, defaultRedirect)
    }

    const session = await lucia.createSession(authorized.userId, {})
    appendHeader(event, 'Set-Cookie', lucia.createSessionCookie(session.id).serialize())

    return sendRedirect(event, authorized.redirect || defaultRedirect)
  })
}

export interface PasswordSignUpConfig {
  authorize: (
    event: H3Event,
    data: {
      lucia: Lucia
    }
  ) => Promise<Nullish<{
    userId: UserId
    redirect?: string
  }>>
}

export function PasswordSignUpProvider(config: PasswordSignUpConfig) {
  return defineEventHandler(async (event) => {
    assertMethod(event, 'POST')

    if (!event.context.$auth) {
      throw createError({
        statusCode: 400,
      })
    }

    // Get the lucia instance from the context
    const { lucia } = event.context.$auth

    // Redirect the user back by default
    const defaultRedirect = getHeader(event, 'referer') || '/'

    let authorized

    try {
      authorized = await config.authorize(event, {
        lucia,
      })
    }
    catch (error) {
      return handleError(event, error, defaultRedirect)
    }

    if (!authorized) {
      return invalidCredentials(event, defaultRedirect)
    }

    const session = await lucia.createSession(authorized.userId, {})
    appendHeader(event, 'Set-Cookie', lucia.createSessionCookie(session.id).serialize())

    return sendRedirect(event, authorized.redirect || defaultRedirect)
  })
}

/**
 * Redirect or throw an error indicating that the credentials are invalid.
 */
function invalidCredentials(event: H3Event, baseUrl: string) {
  const isFormSubmit = getHeader(event, 'content-type')?.startsWith('application/x-www-form-urlencoded') === true

  if (isFormSubmit) {
    return sendRedirect(event, withQuery(baseUrl, {
      error: 'credentials',
    }))
  }

  throw createError({
    statusCode: 400,
  })
}

function handleError(event: H3Event, error: unknown, baseUrl: string) {
  const isFormSubmit = getHeader(event, 'content-type')?.startsWith('application/x-www-form-urlencoded') === true

  if (isFormSubmit) {
    return sendRedirect(event, withQuery(baseUrl, {
      error: 'credentials',
    }))
  }

  if (isError(error)) {
    throw error
  }

  throw createError({
    statusCode: 400,
  })
}
