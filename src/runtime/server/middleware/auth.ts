import { appendResponseHeader, createError, defineEventHandler, getCookie, getHeader } from 'h3'
import { verifyRequestOrigin as luciaVerifyRequestOrigin } from 'lucia'

export default defineEventHandler(async (event) => {
  if (!event.context.$auth) {
    return
  }

  const { lucia } = event.context.$auth

  if (event.method !== 'GET') {
    const originHeader = getHeader(event, 'Origin') ?? null
    const hostHeader = getHeader(event, 'Host') ?? null

    if (!originHeader || !hostHeader || !luciaVerifyRequestOrigin(originHeader, [hostHeader])) {
      throw createError({
        statusCode: 403,
      })
    }
  }

  const sessionId = getCookie(event, lucia.sessionCookieName) ?? null

  if (!sessionId) {
    event.context.$auth.session = null
    event.context.$auth.user = null
    return
  }

  const { session, user } = await lucia.validateSession(sessionId)

  if (session && session.fresh) {
    appendResponseHeader(event, 'Set-Cookie', lucia.createSessionCookie(session.id).serialize())
  }

  if (!session) {
    appendResponseHeader(event, 'Set-Cookie', lucia.createBlankSessionCookie().serialize())
  }

  event.context.$auth.session = session
  event.context.$auth.user = user
})
