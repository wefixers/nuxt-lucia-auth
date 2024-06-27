import { appendHeader, assertMethod, createError, defineEventHandler, getHeader, sendRedirect } from 'h3'

export default defineEventHandler(async (event) => {
  // Call assertMethod again, even tho the file is named session.delete.ts
  // This line is unnecessary, it's very handy to have it here for:
  // - copy-paste
  // - clarity
  // - avoiding mistakes
  // - clarity if not for this bloated comment
  assertMethod(event, 'DELETE')

  if (!event.context.$auth || !event.context.$auth.session) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const { lucia, session } = event.context.$auth

  await lucia.invalidateSession(session.id)

  appendHeader(event, 'Set-Cookie', lucia.createBlankSessionCookie().serialize())

  // If this is a form submission, redirect back
  if (getHeader(event, 'content-type')?.startsWith('application/x-www-form-urlencoded') === true) {
    return sendRedirect(event, getHeader(event, 'referer') || '/')
  }

  // Return 204 No Content to indicate the session was deleted successfully
  return null
})
