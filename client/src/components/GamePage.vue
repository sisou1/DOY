<script setup>
import { ref, onMounted } from 'vue'
import TopBar from './TopBar.vue'
import HeadquartersView from './HeadquartersView.vue'

// ... (le reste du script est probablement déjà là)

const topBarRef = ref(null)
const buildings = ref([])

// Fonction pour rafraîchir toutes les données
const refreshAllData = () => {
  // Recharge la TopBar
  if (topBarRef.value) {
    topBarRef.value.fetchResources()
  }
  // Recharge les bâtiments du Headquarters
  fetchBuildings()
}

const fetchBuildings = async () => {
  try {
    const response = await fetch('http://localhost:3000/game/my-profile', { credentials: 'include' })
    const data = await response.json()
    if (data.success && data.profile) {
      buildings.value = data.profile.buildings
    }
  } catch (e) {
    console.error(e)
  }
}

const handleUpgrade = async (type) => {
  try {
    const response = await fetch('http://localhost:3000/game/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
      credentials: 'include'
    })
    const data = await response.json()
    if (data.success) {
      // Mise à jour locale immédiate pour voir le timer démarrer
      buildings.value = data.profile.buildings

      // On met aussi à jour les ressources (coût payé)
      if (topBarRef.value) topBarRef.value.fetchResources()
    }
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  refreshAllData()
})
</script>

<template>
  <div class="game-page">
    <TopBar ref="topBarRef" :username="username" />

    <!-- On écoute refresh-request ici -->
    <HeadquartersView
        :buildings="buildings"
        @upgrade-action="handleUpgrade"
        @refresh-request="refreshAllData"
    />
  </div>
</template>

<style scoped>
.game-page {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #111;
}
</style>