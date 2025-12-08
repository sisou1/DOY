<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// On garde les props pour l'initialisation, mais on va utiliser une variable locale
const props = defineProps({
  username: {
    type: String,
    default: 'Joueur'
  }
})

// On utilise une ref locale qui pourra être mise à jour par le fetch
const currentUsername = ref(props.username)

const playerLevel = ref(1)
const playerXp = ref(0)
const isDev = ref(false)

const resources = ref({
  food: 0,
  wood: 0,
  iron: 0,
  gold: 0
})

const production = ref({
  food: 0,
  wood: 0,
  iron: 0
})

// Fonction pour récupérer les données réelles du serveur
const fetchResources = async () => {
  try {
    const response = await fetch('http://localhost:3000/game/my-profile', {
      credentials: 'include' // Important pour le cookie de session !
    })
    const data = await response.json()

    if (data.success && data.profile) {
      // Mise à jour des ressources
      resources.value = {
        food: data.profile.food,
        wood: data.profile.wood,
        iron: data.profile.iron,
        gold: data.profile.gold
      }
      // Mise à jour de la prod
      production.value = {
        food: data.profile.foodPerHour,
        wood: data.profile.woodPerHour,
        iron: data.profile.ironPerHour
      }
      // Mise à jour du niveau
      if (data.profile.level) {
        playerLevel.value = data.profile.level
        playerXp.value = data.profile.experience || 0
      }

      // Mise à jour des infos User (Pseudo + Dev)
      if (data.profile.user) {
        isDev.value = data.profile.user.isDev
        // ICI : On récupère le vrai pseudo depuis la BDD
        currentUsername.value = data.profile.user.username
      }
    }
  } catch (e) {
    console.error("Erreur fetch resources", e)
  }
}

// Simulation visuelle (le compteur qui tourne)
let intervalId = null
const REFRESH_RATE = 1000 // 1 seconde

const simulateProduction = () => {
  resources.value.food += production.value.food / 3600
  resources.value.wood += production.value.wood / 3600
  resources.value.iron += production.value.iron / 3600
}

onMounted(() => {
  fetchResources()
  intervalId = setInterval(simulateProduction, REFRESH_RATE)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})

const formatNumber = (num) => {
  return Math.floor(num).toLocaleString()
}

const getXpThreshold = (level) => {
  return 100 * Math.pow(level, 2);
}

const addCheatXp = async () => {
  try {
    const response = await fetch('http://localhost:3000/game/cheat-xp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount: 1000 }),
      credentials: 'include'
    })
    const data = await response.json()
    if (data.success && data.profile) {
      playerLevel.value = data.profile.level
      playerXp.value = data.profile.experience
    }
  } catch (e) {
    console.error("Erreur cheat XP", e)
  }
}

defineExpose({
  fetchResources
})
</script>

<template>
  <div class="top-bar">
    <div class="player-section">
      <span class="username">
        <!-- On affiche currentUsername au lieu de la prop username -->
        {{ currentUsername }}
        <span class="level-badge">
            Lvl {{ playerLevel }} : {{ formatNumber(playerXp) }} / {{ formatNumber(getXpThreshold(playerLevel)) }} XP
        </span>
        <button v-if="isDev" @click="addCheatXp" class="cheat-btn" title="DEV ONLY : +1000 XP">+XP</button>
      </span>
    </div>

    <div class="resources-section">
      <div class="resource-item">
        <span class="icon">🥖</span>
        <div class="res-details">
          <span class="amount">{{ formatNumber(resources.food) }}</span>
          <span class="rate">+{{ production.food }}/h</span>
        </div>
      </div>

      <!-- BOIS (Wood) -->
      <div class="resource-item">
        <span class="icon">🪵</span>
        <div class="res-details">
          <span class="amount">{{ formatNumber(resources.wood) }}</span>
          <span class="rate">+{{ production.wood }}/h</span>
        </div>
      </div>

      <div class="resource-item">
        <span class="icon">🪨</span>
        <div class="res-details">
          <span class="amount">{{ formatNumber(resources.iron) }}</span>
          <span class="rate">+{{ production.iron }}/h</span>
        </div>
      </div>

      <div class="resource-item gold">
        <span class="icon">🪙</span>
        <span class="amount">{{ formatNumber(resources.gold) }}</span>
      </div>
    </div>

    <div class="actions-section"></div>
  </div>
</template>

<style scoped>
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 60px;
  background: rgba(20, 20, 20, 0.95);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid var(--border-color);
  z-index: 100;
  color: white;
  font-family: 'Inter', sans-serif;
  box-shadow: 0 2px 10px rgba(0,0,0,0.5);
}

.player-section {
  min-width: 150px;
  font-weight: bold;
  font-size: 1.1rem;
  color: var(--primary-color);
  display: flex;
  align-items: center;
}

.username {
  display: flex;
  align-items: center;
  gap: 10px;
}

.level-badge {
  background-color: #2c3e50;
  color: #3498db;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  border: 1px solid #3498db;
  margin-left: 10px;
  white-space: nowrap;
}

.cheat-btn {
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.7em;
  margin-left: 10px;
  cursor: pointer;
  font-weight: bold;
}

.cheat-btn:hover {
  background-color: #c0392b;
}

.resources-section {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  flex-grow: 1;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.05);
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 110px;
}

.res-details {
  display: flex;
  flex-direction: column;
  line-height: 1;
}

.icon {
  font-size: 1.4rem;
}

.amount {
  font-weight: bold;
  font-size: 0.95rem;
}

.rate {
  font-size: 0.7rem;
  color: #888;
  margin-top: 2px;
}

.gold .amount {
  color: #ffd700;
}

.actions-section {
  min-width: 150px;
}
</style>