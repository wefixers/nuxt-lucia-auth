<script setup lang="ts">
definePageMeta({
  auth: {
    navigateAuthenticatedTo: '/',
  },
})

const route = useRoute()
const hasCredentialsError = computed(() => route.query.error === 'credentials')
</script>

<template>
  <div>
    <h1>Sign in</h1>

    <form method="post" action="/api/login">
      <label for="username">Username</label>
      <input id="username" name="username">
      <br>
      <label for="password">Password</label>
      <input id="password" type="password" name="password">
      <br>
      <button>Continue</button>
      <p v-if="hasCredentialsError" style="background: orange; color: white; padding: 6px; border-radius: 4px;">
        Invalid username or password
      </p>
    </form>

    <form action="/api/oauth/google">
      <button>Sign in with Google</button>
    </form>

    <NuxtLink to="/signup">
      Create an account
    </NuxtLink>
  </div>
</template>
