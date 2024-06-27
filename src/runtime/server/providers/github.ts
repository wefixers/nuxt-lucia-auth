import type { H3Event } from 'h3'
import { appendHeader, createError, defineEventHandler, getCookie, getQuery, getRequestURL, sendRedirect, setCookie } from 'h3'
import type { GitHubTokens } from 'arctic'
import { GitHub, generateState } from 'arctic'
import { withQuery } from 'ufo'
import type { Lucia, UserId } from 'lucia'
import { useRuntimeConfig } from '#imports'

const STATE_COOKIE_NAME = 'state'

export interface GitHubProfile extends Record<string, any> {
  id: string
  login: string
}

export interface OAuthGitHubConfig {
  /**
   * GitHub OAuth Client ID
   * @default process.env.NUXT_OAUTH_GITHUB_CLIENT_ID
   */
  clientId?: string

  /**
   * GitHub OAuth Client Secret
   * @default process.env.NUXT_OAUTH_GITHUB_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * GitHub OAuth Scope
   * @default ['profile', 'email']
   * @see https://developers.github.com/identity/protocols/oauth2/scopes#github-sign-in
   * @example ['email', 'openid', 'profile']
   */
  scopes?: string[]

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://developers.github.com/identity/protocols/oauth2/web-server#httprest_3
   * @example { access_type: 'offline' }
   */
  authorizationParams?: Record<string, string>

  authorize?: (
    data: {
      profile: GitHubProfile
      account: {
        type: string
        providerId: string
        providerAccountId: string
        accessToken: GitHubTokens['accessToken']
        refreshToken: null
        accessTokenExpiresAt: null
        idToken: null
        scope: string
        sessionState: null
      }
      tokens: GitHubTokens
      github: GitHub
      lucia: Lucia
      event: H3Event
    }
  ) => Promise<{
    userId: UserId
  }>
}

export function GitHubProvider(config?: OAuthGitHubConfig) {
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
    const clientId = config?.clientId ?? runtimeConfig.oauth.github.clientId
    const clientSecret = config?.clientSecret ?? runtimeConfig.oauth.github.clientSecret

    const github = new GitHub(clientId, clientSecret, {
      redirectURI: redirectUrl,
    })

    const query = getQuery(event)
    const code = query.code?.toString() ?? null

    const scopes = config?.scopes ?? ['profile', 'email']

    if (!code) {
      const state = generateState()

      // Create the authorization URL
      const authorizationURL = await github.createAuthorizationURL(state, {
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

      return sendRedirect(event, url.toString())
    }
    else {
      const state = query.state?.toString() ?? null
      const storedState = getCookie(event, STATE_COOKIE_NAME) ?? null

      if (!state || !storedState || state !== storedState) {
        throw createError({
          status: 400,
        })
      }

      const tokens = await github.validateAuthorizationCode(code)

      const profile = await $fetch<GitHubProfile>('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      })

      const account = {
        type: 'oidc',
        providerId: 'github',
        providerAccountId: profile.id,
        accessToken: tokens.accessToken,
        refreshToken: null,
        accessTokenExpiresAt: null,
        idToken: null,
        scope: scopes.join(' '),
        sessionState: null,
      }

      const authorized = await config?.authorize?.({
        profile,
        account,
        tokens,
        github,
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
