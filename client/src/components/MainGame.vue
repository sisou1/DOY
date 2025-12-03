<script setup>
import { ref, onMounted } from 'vue'
import TopBar from './TopBar.vue'
import CityScene from './CityScene.vue'
import BattleScene from './BattleScene.vue'

// --- ETAT DU JEU ---
const currentScene = ref('CITY') // 'CITY' | 'BATTLE'

// --- DONNÉES ---
const topBarRef = ref(null)
const buildings = ref([])
const heroes = ref([])

// ... (Garde les fonctions fetchBuildings, handleUpgrade, refreshAllData telles qu'elles étaient) ...
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
          if (data.profile.heroes) {
            heroes.value = data.profile.heroes
          }
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
          buildings.value = data.profile.buildings
          if (topBarRef.value) topBarRef.value.fetchResources()
        }
      } catch (e) {
        console.error(e)
      }
    }

// --- NAVIGATION ---
const startBattle = () => {
  currentScene.value = 'BATTLE'
}

const endBattle = () => {
  currentScene.value = 'CITY'
  refreshAllData() // On rafraichit en revenant (pertes de troupes, butin...)
}

onMounted(() => {
  refreshAllData()
})
</script>

<template>
  <div class="main-game-container">
    <!-- La TopBar reste toujours visible (ou pas, à toi de voir, ici je la laisse) -->
    <!-- On la cache en combat si tu veux une immersion totale avec v-if="currentScene !== 'BATTLE'" -->
    <TopBar v-if="currentScene === 'CITY'" ref="topBarRef" :username="username" />

    <!-- SCÈNE VILLE -->
    <CityScene 
      v-if="currentScene === 'CITY'"
      :buildings="buildings"
      :heroes="heroes"
      @upgrade-action="handleUpgrade"
      @refresh-request="refreshAllData"
    />

    <!-- SCÈNE BATAILLE -->
    <BattleScene 
      v-if="currentScene === 'BATTLE'"
      @end-battle="endBattle"
    />
    
    <!-- Bouton temporaire pour tester le switch (à mettre dans un menu plus tard) -->
    <button v-if="currentScene === 'CITY'" @click="startBattle" class="debug-btn">
       ⚔️ ALLER AU COMBAT
    </button>

  </div>
</template>

<style scoped>
.main-game-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #111;
  position: relative;
}

.debug-btn {
  position: absolute;
  bottom: 20px;
  right: 20px;
  padding: 15px 30px;
  background: #c0392b;
  color: white;
  font-weight: bold;
  border: 2px solid white;
  cursor: pointer;
  z-index: 100;
}
</style>