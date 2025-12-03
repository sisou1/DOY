<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import TopBar from './TopBar.vue'
import CityScene from './CityScene.vue'
import PvESelectionScene from './PvESelectionScene.vue'
import BattleScene from './BattleScene.vue'

// --- ETAT DU JEU ---
const currentScene = ref('CITY')
const activeBattleId = ref(null)
let cityPollingInterval = null

// ... (Données et logique existante inchangée) ...
// ... existing code ...
    // --- DONNÉES ---
    const topBarRef = ref(null)
    const buildings = ref([])
    const heroes = ref([])

    // ... existing code ...
    const refreshAllData = () => {
          // Recharge la TopBar
          if (topBarRef.value) {
            topBarRef.value.fetchResources()
          }
          // Recharge les bâtiments du Headquarters
          fetchBuildings()
        }

    // ... existing code ...
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
        // ... existing code ...
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

const goToSelection = () => {
  currentScene.value = 'PVE_SELECTION'
}

const launchBattle = (battleId) => {
  activeBattleId.value = battleId
  currentScene.value = 'BATTLE'
}

const backHome = () => {
  currentScene.value = 'CITY'
  activeBattleId.value = null
  refreshAllData()
}

onMounted(() => {
  refreshAllData()
  
  cityPollingInterval = setInterval(() => {
    if (currentScene.value === 'CITY') {
      refreshAllData()
    }
  }, 2000)
})

onUnmounted(() => {
  if (cityPollingInterval) clearInterval(cityPollingInterval)
})
</script>

<template>
  <div class="main-game-container">
    
    <TopBar v-if="currentScene === 'CITY'" ref="topBarRef" :username="username" />

    <!-- SCÈNE VILLE : On écoute l'événement @watch-battle -->
    <CityScene 
      v-if="currentScene === 'CITY'"
      :buildings="buildings"
      :heroes="heroes"
      @upgrade-action="handleUpgrade"
      @refresh-request="refreshAllData"
      @watch-battle="launchBattle" 
    />

    <PvESelectionScene 
      v-if="currentScene === 'PVE_SELECTION'"
      @start-pve="launchBattle"
      @back-home="backHome"
    />

    <BattleScene 
      v-if="currentScene === 'BATTLE'"
      :battleId="activeBattleId"
      @end-battle="backHome"
    />
    
    <!-- BOUTONS D'ACTION -->
    <div v-if="currentScene === 'CITY'" class="action-buttons">
      <!-- Le bouton "VOIR LE COMBAT" global est supprimé. On utilise celui de l'ArmyView. -->
      
      <!-- On garde le bouton Attaquer pour pouvoir lancer un autre combat si on a un autre héros libre -->
      <button @click="goToSelection" class="btn-attack">
         ⚔️ ALLER AU COMBAT
      </button>
    </div>

  </div>
</template>

<style scoped>
/* ... Styles inchangés ... */
.main-game-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #111;
  position: relative;
}

.action-buttons {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-attack {
  padding: 15px 30px;
  background: #c0392b;
  color: white;
  font-weight: bold;
  border: 2px solid white;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0,0,0,0.5);
}
</style>