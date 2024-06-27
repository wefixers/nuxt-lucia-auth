import type { NitroApp } from 'nitropack'
import type { Lucia, Session, User } from 'lucia'
import type { H3Event } from 'h3'
import { createError } from 'h3'

declare module 'h3' {
  interface H3EventContext {
    $auth?: {
      lucia: Lucia
      user: User | null
      session: Session | null
    }
  }
}

/**
 * Install the Lucia auth plugin to the {@link NitroApp}.
 */
export function useLuciaAuth(nitroApp: NitroApp, lucia: Lucia) {
  // Internally we just expose the Lucia instance to the event context
  // We do this so most of internal function can access the lucia instance easily
  // There are other ways to access the Lucia instance, however they all require a nitro plugin of some sort
  // therefore, this helper provide a (more or less) universal way to initialize a plugin
  nitroApp.hooks.hook('request', async (event) => {
    event.context.$auth = {
      lucia,
      user: null,
      session: null,
    }
  })
}

/**
 * Get the user and session from the event context.
 *
 * ### Note: Be careful exposing the `session` object to the client.
 */
export function getAuthSession(event: H3Event): { user: User, session: Session } | { user: null, session: null } {
  const auth = event.context.$auth

  // TODO: This check is an implementation details
  // Lucia uses an empty object to indicate a session, and null to indicate no session
  // So if user is set, session must be set as well
  // This is guaranteed as long as no other libraries mess things up
  // and Lucia doesn't change its behavior
  // (assuming there are no bugs somewhere in our implementation)
  return (auth && auth.session) ? { user: auth.user!, session: auth.session } : { user: null, session: null }
}

/**
 * Require the user and session to be set in the event context.
 *
 * If the user is not set, it will throw an error.
 *
 * ### Note: Be careful exposing the `session` object to the client.
 */
export function requireAuthSession(event: H3Event, opts: { statusCode?: number, message?: string } = {}): { user: User, session: Session } {
  const { user, session } = getAuthSession(event)

  // Here we only check the session object
  // This check is the result of the implementation details above
  // We only check the session object, so here we need to ONLY check the session again
  if (!session) {
    throw createError({
      statusCode: opts?.statusCode || 401,
      message: opts?.message || 'Unauthorized',
    })
  }

  return {
    user,
    session,
  }
}
