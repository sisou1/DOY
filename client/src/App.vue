<script setup>
import { ref } from 'vue'
import LoginPage from './components/LoginPage.vue'
import GamePage from './components/GamePage.vue'

const currentUser = ref(null)

const onLoginSuccess = (username) => {
  currentUser.value = username
}
</script>

<template>
  <!-- Si on a un user, on affiche le jeu, sinon le login -->
  <GamePage 
    v-if="currentUser" 
    :username="currentUser" 
  />
  
  <LoginPage 
    v-else 
    @login-success="onLoginSuccess" 
  />
</template>
