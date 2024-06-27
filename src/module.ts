import { addImportsDir, addPlugin, addRouteMiddleware, addServerHandler, addServerImportsDir, createResolver, defineNuxtModule, useLogger } from '@nuxt/kit'
import { defu } from 'defu'
import { name, version } from '../package.json'

export interface ModuleOptions {
  /**
   * @default
   * ```ts
   * {
   *   global: true,
   *   allow404WithoutAuth: !global
   * }
   * ```
   */
  middleware?: {
    /**
     * Whether to enable the route middleware.
     *
     * @default false
     */
    enabled?: boolean

    /**
     * @default true
     */
    global?: boolean

    /**
     * Whether to allow 404 pages to be accessed without authentication.
     *
     * @default false
     */
    allow404WithoutAuth?: boolean
  }

  pages?: {
    /**
     * @default `/login`
     */
    login?: string
  }
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    version,
    configKey: 'auth',
  },
  setup(userOptions, nuxt) {
    const logger = useLogger(name)

    logger.info(`\`${name}\` setup...`)

    const options = defu(userOptions, {
      pages: {
        login: '/login',
      },
      middleware: {
        enabled: true,
        global: true,
        allow404WithoutAuth: false,
      },
    })

    const resolver = createResolver(import.meta.url)

    nuxt.options.alias['#auth/credentials'] = resolver.resolve('./runtime/server/providers/credentials')
    nuxt.options.alias['#auth/google'] = resolver.resolve('./runtime/server/providers/google')
    nuxt.options.alias['#auth/github'] = resolver.resolve('./runtime/server/providers/github')

    if (options.middleware.enabled) {
      addRouteMiddleware({
        global: options.middleware.global,
        name: 'auth',
        path: resolver.resolve('./runtime/middleware/auth'),
      })
    }

    addPlugin(
      resolver.resolve('./runtime/plugins/session'),
    )

    addImportsDir(
      resolver.resolve('./runtime/composables'),
    )

    addImportsDir(
      resolver.resolve('./runtime/utils'),
    )

    addServerHandler({
      middleware: true,
      handler: resolver.resolve('./runtime/server/middleware/auth'),
    })

    addServerHandler({
      method: 'get',
      route: '/api/auth/session',
      handler: resolver.resolve('./runtime/server/api/session.get'),
    })

    addServerHandler({
      method: 'delete',
      route: '/api/auth/session',
      handler: resolver.resolve('./runtime/server/api/session.delete'),
    })

    addServerImportsDir(
      resolver.resolve('./runtime/server/utils'),
    )

    const runtimeConfig = nuxt.options.runtimeConfig

    // Set the module options
    runtimeConfig.auth = defu(runtimeConfig.auth, options)

    // Be explicit on what we set publicly
    runtimeConfig.public.auth = defu(runtimeConfig.public.auth, {
      login: options.pages.login,
      allow404WithoutAuth: options.middleware.allow404WithoutAuth,
    })

    // OAuth settings
    runtimeConfig.oauth = defu(runtimeConfig.oauth, {
      // Google OAuth
      google: { clientId: '', clientSecret: '' },

      // GitHub OAuth
      github: { clientId: '', clientSecret: '' },
    })

    logger.success(`\`${name}\` setup done`)
  },
})
