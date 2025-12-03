<script setup>
import { ref, onMounted, onUnmounted} from 'vue'
import TopBar from './TopBar.vue'
import CityScene from './CityScene.vue'
import PvESelectionScene from './PvESelectionScene.vue'
import BattleScene from './BattleScene.vue'
import ArmyView from './ArmyView.vue' // <-- On importe ArmyView ici maintenant

// --- ETAT DU JEU ---
const currentScene = ref('CITY')
const activeBattleId = ref(null)
let cityPollingInterval = null

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
  
  // On garde le polling, il est utile même en combat pour mettre à jour la liste des armées
  cityPollingInterval = setInterval(() => {
      refreshAllData()
  }, 2000)
})

onUnmounted(() => {
  if (cityPollingInterval) clearInterval(cityPollingInterval)
})
</script>

<template>
  <div class="main-game-container">
    
    <!-- TopBar visible PARTOUT sauf en combat si tu veux (ici je la laisse tout le temps ou selon ta préférence) -->
    <!-- Si tu veux la cacher en combat : v-if="currentScene !== 'BATTLE'" -->
    <TopBar v-if="currentScene !== 'BATTLE'" ref="topBarRef" :username="username" />

    <!-- ARMY VIEW GLOBALE : Visible tout le temps, par dessus les scènes -->
    <!-- On écoute l'événement @watch-battle pour changer de scène dynamiquement -->
    <ArmyView 
      :heroes="heroes" 
      @watch-battle="launchBattle"
      class="global-army-view"
    />

    <!-- LES SCÈNES -->
    <CityScene 
      v-if="currentScene === 'CITY'"
      :buildings="buildings"
      @upgrade-action="handleUpgrade"
      @refresh-request="refreshAllData"
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
    
    <!-- BOUTONS D'ACTION (Uniquement en Ville) -->
    <div v-if="currentScene === 'CITY'" class="action-buttons">
      <button @click="goToSelection" class="btn-attack">
         💀 PVE
      </button>
    </div>

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

/* On force le positionnement pour être sûr qu'il reste en haut à gauche peu importe la scène */
.global-army-view {
  position: fixed; /* Fixed pour rester au même endroit même si le reste scroll/bouge */
  top: 80px;
  left: 20px;
  z-index: 1000; /* Au dessus de tout, même de la BattleScene */
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
  font-size: 1.2rem;
}
.btn-attack:hover {
  background: #e74c3c;
}
</style>