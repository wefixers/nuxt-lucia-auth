export default defineAppConfig({
  ui: {
    primary: 'green',
    gray: 'slate',
    footer: {
      bottom: {
        left: 'text-sm text-gray-500 dark:text-gray-400',
        wrapper: 'border-t border-gray-200 dark:border-gray-800'
      }
    }
  },
  seo: {
    siteName: 'Nuxt Auth'
  },
  header: {
    logo: {
      alt: '',
      light: '',
      dark: ''
    },
    search: false,
    colorMode: false,
    links: [{
      'icon': 'i-simple-icons-github',
      'to': 'https://github.com/wefixers/nuxt-lucia-auth',
      'target': '_blank',
      'aria-label': 'Docs on GitHub'
    }]
  },
  footer: {
    credits: 'Copyright © 2024',
    colorMode: false,
    links: [{
      'icon': 'i-simple-icons-nuxtdotjs',
      'to': 'https://nuxt.com',
      'target': '_blank',
      'aria-label': 'Nuxt Website'
    }, {
      'icon': 'i-simple-icons-github',
      'to': 'https://github.com/wefixers/nuxt-lucia-auth',
      'target': '_blank',
      'aria-label': 'Nuxt Auth on GitHub'
    }]
  },
  toc: {
    title: 'Table of Contents',
    bottom: {
      title: 'Community',
      edit: 'https://github.com/wefixers/nuxt-lucia-auth/edit/main/docs/content',
      links: [{
        icon: 'i-heroicons-star',
        label: 'Star on GitHub',
        to: 'https://github.com/wefixers/nuxt-lucia-auth',
        target: '_blank'
      }, {
        icon: 'i-heroicons-book-open',
        label: 'Nuxt Auth docs',
        to: 'https://nuxt-auth.fixers.dev',
        target: '_blank'
      }]
    }
  }
})
