<script setup>
import GameCanvas from './GameCanvas.vue'
import TopBar from './TopBar.vue' // Import du nouveau composant

defineProps({
  username: {
    type: String,
    required: true
  }
})
</script>

<template>
  <div class="game-page">
    <!-- On passe le username à la TopBar -->
    <TopBar :username="username" />

    <!-- Le Canvas du jeu -->
    <GameCanvas />
  </div>
</template>

<style scoped>
.game-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
/* Plus de style HUD ici, tout est dans TopBar */
</style>