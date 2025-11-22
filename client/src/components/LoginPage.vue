<script setup>
import { ref } from 'vue'

const emit = defineEmits(['login-success'])

const username = ref('')
const password = ref('')
const error = ref('')

const handleSubmit = async () => {
  try {
    // On tape directement sur le backend (port 3000)
    const response = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      // "credentials: 'include'" est OBLIGATOIRE pour que le navigateur accepte
      // et stocke le cookie que le serveur renvoie
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        password: password.value
      })
    })

    const data = await response.json()
    
    if (data.success) {
      emit('login-success', username.value)
    } else {
      error.value = data.message || 'Identifiants incorrects'
    }
  } catch (e) {
    error.value = 'Erreur de connexion au serveur'
    console.error(e)
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h2>Connexion</h2>
      <form @submit.prevent="handleSubmit">
        <input class="input-field" v-model="username" type="text" placeholder="Utilisateur (ex: sisou)" required />
        <input class="input-field" v-model="password" type="password" placeholder="Mot de passe (ex: 1234)" required />

        <button class="btn" type="submit">Entrer dans le jeu</button>
      </form>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-card {
  background: var(--card-bg);
  padding: 2rem;
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 300px;
  box-shadow: var(--shadow);
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.error {
  color: var(--error-color);
  text-align: center;
  font-size: 0.9rem;
}
</style>