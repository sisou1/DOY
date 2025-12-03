<script setup>
import { onMounted, onUnmounted, ref, nextTick } from 'vue'

const props = defineProps({
  battleId: Number 
})

const emit = defineEmits(['end-battle'])
const battleData = ref(null)
let pollingInterval = null // Variable pour stocker le timer

const fetchBattleState = async () => {
  try {
    const res = await fetch(`http://localhost:3000/game/battle/${props.battleId}`, { credentials: 'include' })
    const data = await res.json()
    if (data.success) {
      battleData.value = data.battle
      
      // Si le combat est fini, on arrête de demander
      if (data.battle.status === 'FINISHED') {
        stopPolling()
      }
    }
  } catch (e) {
    console.error(e)
  }
}

const startPolling = () => {
  // On appelle tout de suite
  fetchBattleState()
  // Et on relance toutes les 1000ms (1 seconde)
  pollingInterval = setInterval(fetchBattleState, 1000)
}

const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

onMounted(() => {
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="battle-scene">
    <h1>⚔️ COMBAT #{{ battleId }} ⚔️</h1>
    
    <div v-if="battleData" class="battle-info">
      <div class="status-badge" :class="battleData.status">
        {{ battleData.status }}
      </div>

      <div class="heroes-container">
        <div v-for="hero in battleData.heroes" :key="hero.id" class="hero-box" :class="hero.side">
          <strong>{{ hero.name }}</strong>
          <div class="hp-bar">
            <div class="hp-fill" :style="{width: (hero.troops / hero.maxTroops * 100) + '%'}"></div>
          </div>
          <small>{{ hero.troops }} PV</small>
        </div>
      </div>

      <!-- Zone de logs qui scroll -->
      <div class="logs-container">
        <div v-for="(log, index) in battleData.logs" :key="index" class="log-entry">
           <!-- Affichage brut du JSON pour le moment -->
           {{ log }}
        </div>
      </div>
    </div>
    
    <div v-else>Chargement du champ de bataille...</div>

    <button @click="emit('end-battle')" style="margin-top: 20px;">Quitter le combat</button>
  </div>
</template>

<style scoped>
.battle-scene {
  width: 100vw;
  height: 100vh;
  background-color: #2c0404;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 50;
  position: absolute;
  top: 0; left: 0;
}

.battle-info {
  width: 80%;
  max-width: 600px;
  text-align: center;
}

.heroes-container {
  display: flex;
  justify-content: space-around;
  margin: 20px 0;
}

.hero-box {
  background: #444;
  padding: 10px;
  border-radius: 8px;
  width: 150px;
}
.hero-box.ATTACKER { border: 2px solid #3498db; }
.hero-box.DEFENDER { border: 2px solid #e74c3c; }

.hp-bar {
  width: 100%;
  height: 10px;
  background: #222;
  margin: 5px 0;
}
.hp-fill {
  height: 100%;
  background: #2ecc71;
  transition: width 0.5s ease;
}

.logs-container {
  background: rgba(0,0,0,0.5);
  height: 200px;
  overflow-y: auto;
  text-align: left;
  padding: 10px;
  border: 1px solid #555;
  font-family: monospace;
  font-size: 0.8rem;
}

.status-badge {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 10px;
}
.status-badge.FINISHED { color: #f1c40f; }
</style>