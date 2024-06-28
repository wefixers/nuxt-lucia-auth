export default defineNuxtConfig({
  modules: ['../src/module'],
  app: {
    head: {
      title: 'Nuxt Auth',
    },
  },
  devtools: {
    enabled: true,
  },
})
