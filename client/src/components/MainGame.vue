<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import TopBar from './TopBar.vue'
import CityScene from './CityScene.vue'
import PvESelectionScene from './PvESelectionScene.vue'
import BattleScene from './BattleScene.vue'
import HeroManagementScene from './HeroManagementScene.vue'
import ArmyView from './ArmyView.vue'

const currentScene = ref('CITY')
const activeBattleId = ref(null)
const showHeroManagement = ref(false)
let cityPollingInterval = null

const topBarRef = ref(null)
const buildings = ref([])
const heroes = ref([])
const isDev = ref(false)

const refreshAllData = () => {
  if (topBarRef.value) {
    topBarRef.value.fetchResources()
  }
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
      if (data.profile.user) {
        isDev.value = !!data.profile.user.isDev
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

const goToSelection = () => {
  currentScene.value = 'PVE_SELECTION'
}

const openHeroManagement = () => { showHeroManagement.value = true }
const closeHeroManagement = () => { showHeroManagement.value = false }

const launchBattle = (battleId) => {
  showHeroManagement.value = false
  activeBattleId.value = battleId
  currentScene.value = 'BATTLE'
}

const backHome = () => {
  showHeroManagement.value = false
  currentScene.value = 'CITY'
  activeBattleId.value = null
  refreshAllData()
}

onMounted(() => {
  refreshAllData()
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
    <TopBar v-if="currentScene !== 'BATTLE'" ref="topBarRef" :username="username" />

    <ArmyView
      :heroes="heroes"
      @watch-battle="launchBattle"
      :class="['global-army-view', { dimmed: showHeroManagement }]"
    />

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
      :isDev="isDev"
      @end-battle="backHome"
    />

    <HeroManagementScene
      v-if="showHeroManagement && currentScene !== 'BATTLE'"
      :heroes="heroes"
      @watch-battle="launchBattle"
      @close="closeHeroManagement"
      @refresh-request="refreshAllData"
    />

    <div v-if="currentScene !== 'BATTLE'" class="action-buttons">
      <button @click="openHeroManagement" class="btn-heroes">
        Heros
      </button>
      <button @click="goToSelection" class="btn-attack">
        PVE
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

.global-army-view {
  z-index: 220;
  transition: opacity 0.2s ease, filter 0.2s ease;
}

.global-army-view.dimmed {
  opacity: 0.38;
  filter: grayscale(0.75);
  pointer-events: none;
}

.action-buttons {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 100;
  display: flex;
  flex-direction: row;
  gap: 10px;
}

.btn-attack,
.btn-heroes {
  padding: 15px 30px;
  color: white;
  font-weight: bold;
  border: 2px solid white;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
  font-size: 1.2rem;
}

.btn-heroes {
  background: #2c3e50;
}

.btn-heroes:hover {
  background: #3f5870;
}

.btn-attack {
  background: #c0392b;
}

.btn-attack:hover {
  background: #e74c3c;
}
</style>
