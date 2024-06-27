<script setup lang="ts">
const user = useAuthenticatedUser()

async function logout() {
  await $fetch('/api/auth/session', {
    method: 'DELETE',
  })
  await navigateTo('/login')
}

async function protectedAPIRequest() {
  await $fetch('/api/_protected')
}
async function getSession() {
  await $fetch('/api/auth/session')
}
</script>

<template>
  <div>
    <p>Your user ID is {{ user.id }}.</p>
    <button @click="protectedAPIRequest">
      Make a protected API request
    </button>
    <button @click="getSession">
      getSession
    </button>
    <form @submit.prevent="logout">
      <button>Sign out</button>
    </form>
    <pre>{{ user }}</pre>
  </div>
</template>
