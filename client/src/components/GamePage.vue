<script setup>
import { ref, onMounted } from 'vue'
import GameCanvas from './GameCanvas.vue'
import TopBar from './TopBar.vue'
import HeadquartersView from './HeadquartersView.vue'

defineProps({ username: String })

const isHQOpen = ref(true) 
const topBarRef = ref(null)
const myBuildings = ref([]) // Stocker les bâtiments ici

// Fonction pour récupérer les infos complètes (bâtiments inclus)
const fetchGameData = async () => {
  try {
    const response = await fetch('http://localhost:3000/game/my-profile', {
      credentials: 'include'
    })
    const data = await response.json()
    if (data.success && data.profile) {
      myBuildings.value = data.profile.buildings // On récupère la liste !
      
      // On force aussi la maj de la TopBar pour les ressources
      if (topBarRef.value) topBarRef.value.fetchResources() 
    }
  } catch (e) { console.error(e) }
}

const handleUpgrade = async (type) => {
  try {
    const response = await fetch('http://localhost:3000/game/upgrade', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    })
    const data = await response.json()
    
    if (data.success) {
      console.log("Upgrade réussi !")
      // On rafraîchit tout
      fetchGameData()
    } else {
      alert("Erreur : " + (data.message || "Impossible d'améliorer"))
    }
  } catch (e) { console.error(e) }
}

onMounted(() => {
  fetchGameData() // Chargement initial
})
</script>

<template>
  <div class="game-page">
    <TopBar ref="topBarRef" :username="username" />
    <GameCanvas />

    <HeadquartersView 
      v-if="isHQOpen" 
      :buildings="myBuildings"
      @upgrade-action="handleUpgrade" 
    />
  </div>
</template>

<style scoped>
.game-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>