import type { H3Event } from 'h3'
import { appendHeader, createError, defineEventHandler, getCookie, getQuery, getRequestURL, sendRedirect, setCookie } from 'h3'
import type { GoogleTokens } from 'arctic'
import { Google, generateCodeVerifier, generateState } from 'arctic'
import { withQuery } from 'ufo'
import type { Lucia, UserId } from 'lucia'
import { useRuntimeConfig } from '#imports'

const STATE_COOKIE_NAME = 'state'
const CODE_VERIFIER_COOKIE_NAME = 'code_verifier'

export interface GoogleProfile extends Record<string, any> {
  sub: string
  name: string
  given_name?: string
  family_name?: string
  picture: string
  email: string
  email_verified: boolean
  locale?: string

  aud?: string
  azp?: string
  exp?: number
  hd?: string
  iat?: number
  iss?: string
  jti?: string
  nbf?: number
}

export interface OAuthGoogleConfig {
  /**
   * Google OAuth Client ID
   * @default process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID
   */
  clientId?: string

  /**
   * Google OAuth Client Secret
   * @default process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * Google OAuth Scope
   * @default ['profile', 'email']
   * @see https://developers.google.com/identity/protocols/oauth2/scopes#google-sign-in
   * @example ['email', 'openid', 'profile']
   */
  scopes?: string[]

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://developers.google.com/identity/protocols/oauth2/web-server#httprest_3
   * @example { access_type: 'offline' }
   */
  authorizationParams?: Record<string, string>

  authorize: (
    data: {
      profile: GoogleProfile
      account: {
        type: string
        providerId: string
        providerAccountId: string
        accessToken: GoogleTokens['accessToken']
        refreshToken: GoogleTokens['refreshToken']
        accessTokenExpiresAt: GoogleTokens['accessTokenExpiresAt']
        idToken: GoogleTokens['idToken']
        scope: string
        sessionState: string
      }
      tokens: GoogleTokens
      google: Google
      lucia: Lucia
      event: H3Event
    }
  ) => Promise<{
    userId: UserId
  }>
}

export function GoogleProvider(config: OAuthGoogleConfig) {
  return defineEventHandler(async (event) => {
    if (!event.context.$auth) {
      throw createError({
        statusCode: 400,
      })
    }

    // Get the lucia instance from the context
    const { lucia } = event.context.$auth

    // Redirect on this exact endpoint
    const redirectUrl = getRequestURL(event).href

    const runtimeConfig = useRuntimeConfig(event)
    const clientId = config?.clientId ?? runtimeConfig.oauth.google.clientId
    const clientSecret = config?.clientSecret ?? runtimeConfig.oauth.google.clientSecret

    const google = new Google(clientId, clientSecret, redirectUrl)

    const query = getQuery(event)
    const code = query.code?.toString() ?? null

    const scopes = config?.scopes ?? ['profile', 'email']

    if (!code) {
      const state = generateState()
      const codeVerifier = generateCodeVerifier()

      // Create the authorization URL
      const authorizationURL = await google.createAuthorizationURL(state, codeVerifier, {
        scopes,
      })

      // Add extra authorization parameters
      const url = withQuery(authorizationURL.href, {
        ...config?.authorizationParams,
      })

      setCookie(event, STATE_COOKIE_NAME, state, {
        secure: !import.meta.dev,
        path: '/',
        httpOnly: true,
        maxAge: 60 * 10,
        sameSite: 'lax',
      })

      setCookie(event, CODE_VERIFIER_COOKIE_NAME, codeVerifier, {
        secure: !import.meta.dev,
        path: '/',
        httpOnly: true,
        maxAge: 60 * 10,
      })

      return sendRedirect(event, url.toString())
    }
    else {
      const state = query.state?.toString() ?? null
      const storedState = getCookie(event, STATE_COOKIE_NAME) ?? null
      const storedCodeVerifier = getCookie(event, CODE_VERIFIER_COOKIE_NAME) ?? null

      if (!state || !storedState || !storedCodeVerifier || state !== storedState) {
        throw createError({
          status: 400,
        })
      }

      const tokens = await google.validateAuthorizationCode(code, storedCodeVerifier)

      const profile = await $fetch<GoogleProfile>('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      })

      const account = {
        type: 'oidc',
        providerId: 'google',
        providerAccountId: profile.sub,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        idToken: tokens.idToken,
        scope: scopes.join(' '),
        sessionState: storedState,
      }

      const authorized = await config.authorize({
        profile,
        account,
        tokens,
        google,
        lucia,
        event,
      })

      if (authorized) {
        const session = await lucia.createSession(authorized.userId, {})
        appendHeader(event, 'Set-Cookie', lucia.createSessionCookie(session.id).serialize())
        return sendRedirect(event, '/')
      }

      return sendRedirect(event, '/')
    }
  })
}
