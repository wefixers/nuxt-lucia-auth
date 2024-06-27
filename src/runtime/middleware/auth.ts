import { defineNuxtRouteMiddleware, navigateTo, useRuntimeConfig, useUser } from '#imports'

declare module '#app' {
  interface PageMeta {
    /**
     * Configure authentication for this page.
     *
     * - `false` will disable the auth middleware for this page
     * - `true` will use the default configuration
     */
    auth?: boolean | {
      /**
       * Whether to only allow unauthenticated users to access this page.
       *
       * Authenticated users will be redirected to `/` or the route defined in `navigateAuthenticatedTo`
       *
       * @default undefined
       */
      unauthenticatedOnly?: boolean

      /**
       * Where to redirect authenticated users if `unauthenticatedOnly` is set to true
       *
       * @default '/'
       */
      navigateAuthenticatedTo?: string

      /**
       * Where to redirect unauthenticated users if this page is protected
       *
       * @default `useRuntimeConfig().public.auth.login`
       */
      navigateUnauthenticatedTo?: string
    }
  }
}

export default defineNuxtRouteMiddleware((to) => {
  const metaAuth = typeof to.meta.auth === 'object'
    ? {
        unauthenticatedOnly: true,
        ...to.meta.auth,
      }
    : to.meta.auth

  // shortcut, user have explicitly disabled the auth middleware
  if (metaAuth === false) {
    return
  }

  const authConfig = useRuntimeConfig().public.auth
  const user = useUser()

  const isGuestMode = typeof metaAuth === 'object' && metaAuth.unauthenticatedOnly

  if (isGuestMode && !user.value) {
    return
  }

  if (typeof metaAuth === 'object' && !metaAuth.unauthenticatedOnly) {
    return
  }

  if (user.value) {
    if (isGuestMode) {
      return navigateTo(metaAuth.navigateAuthenticatedTo || '/')
    }

    return
  }

  if (authConfig.allow404WithoutAuth) {
    const matchedRoute = to.matched.length > 0
    if (!matchedRoute) {
      return
    }
  }

  let redirectTo: string

  if (typeof metaAuth === 'object' && metaAuth.navigateUnauthenticatedTo) {
    redirectTo = metaAuth.navigateUnauthenticatedTo
  }
  else {
    redirectTo = authConfig.login
  }

  // prevent infinite redirect loop
  if (to.path === redirectTo) {
    if (import.meta.dev) {
      console.warn(`[Lucia-Auth]: '${to.fullPath}' is protected, to avoid this warning, use 'auth: false' in the page meta.`)
    }

    return
  }

  if (import.meta.dev) {
    console.warn(`[Lucia-Auth]: Guest users cannot access: '${to.fullPath}'`)
  }

  return navigateTo(
    redirectTo,
  )
})
