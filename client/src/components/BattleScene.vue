<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'

const props = defineProps({ battleId: Number })
const emit = defineEmits(['end-battle'])

const battleData = ref(null)
const heroNamesCache = ref({})
let pollingInterval = null

const fetchBattleState = async () => {
  try {
    const res = await fetch(`http://localhost:3000/game/battle/${props.battleId}`, { credentials: 'include' })
    const data = await res.json()

    if (data.success) {
      if (data.battle.heroes) {
        data.battle.heroes.forEach(h => {
          heroNamesCache.value[h.id] = h.name
        })
      }

      if (data.battle.status === 'FINISHED') {
        stopPolling()

        if (battleData.value) {
          battleData.value.status = 'FINISHED'
          battleData.value.logs = data.battle.logs

          const deathLogs = data.battle.logs.filter(l => l.type === 'DEATH')
          const deadHeroIds = deathLogs.map(l => String(l.heroId))

          if (battleData.value.heroes) {
            battleData.value.heroes.forEach(h => {
              if (deadHeroIds.includes(String(h.id))) {
                h.troops = 0
              }
            })
          }
        } else {
          battleData.value = data.battle
        }
        return
      }

      battleData.value = data.battle
    }
  } catch (e) { console.error(e) }
}

const startPolling = () => {
  fetchBattleState()
  pollingInterval = setInterval(fetchBattleState, 1000)
}
const stopPolling = () => {
  if (pollingInterval) clearInterval(pollingInterval)
}
onMounted(() => startPolling())
onUnmounted(() => stopPolling())

const attackers = computed(() => {
  if (!battleData.value || !battleData.value.heroes) return []
  return battleData.value.heroes
      .filter(h => h.side === 'ATTACKER')
      .sort((a, b) => a.queueOrder - b.queueOrder)
})

const defenders = computed(() => {
  if (!battleData.value || !battleData.value.heroes) return []
  return battleData.value.heroes
      .filter(h => h.side === 'DEFENDER')
      .sort((a, b) => a.queueOrder - b.queueOrder)
})

const victoryStatus = computed(() => {
  if (!battleData.value || battleData.value.status !== 'FINISHED') return null

  const attackersAlive = attackers.value.some(h => h.troops > 0)
  const defendersAlive = defenders.value.some(h => h.troops > 0)

  if (attackersAlive && !defendersAlive) return "VICTOIRE !"
  if (!attackersAlive && defendersAlive) return "DÉFAITE..."

  if (!attackersAlive && !defendersAlive) return "HÉCATOMBE (Match Nul)"

  return "COMBAT TERMINÉ"
})

const activeAttacker = computed(() => attackers.value[0])
const activeDefender = computed(() => defenders.value[0])

const reserveAttackers = computed(() => attackers.value.slice(1).filter(h => h.troops > 0))
const reserveDefenders = computed(() => defenders.value.slice(1).filter(h => h.troops > 0))

const getHeroName = (id) => heroNamesCache.value[id] || 'Unité'

const formatLog = (log, index) => {
  if (log.type === 'DEATH') {
    return `☠️ ${getHeroName(log.heroId)} est éliminé !`
  }
  if (log.actions) {
    const parts = log.actions.map(a => `${getHeroName(a.from)} tape -${a.dmg}`)
    return `Tour ${index + 1} : ${parts.join(' | ')}`
  }
  return '...'
}
</script>

<template>
  <div class="battle-scene">

    <div class="header-zone">
      <div v-if="victoryStatus" class="victory-banner" :class="{ win: victoryStatus === 'VICTOIRE !', loose: victoryStatus === 'DÉFAITE...' }">
        {{ victoryStatus }}
      </div>
      <h1 v-else>⚔️ COMBAT EN COURS ⚔️</h1>
    </div>

    <div v-if="battleData" class="battle-info">

      <div class="battlefield">
        <div class="side left">
          <div class="reserve">
            <div v-for="h in reserveAttackers" :key="h.id" class="mini-card">{{ h.name }} ({{ h.troops }})</div>
          </div>

          <div v-if="activeAttacker" class="active-card ATTACKER">
            <div class="name">{{ activeAttacker.name }}</div>
            <div class="hp-bar"><div class="fill" :style="{width: (activeAttacker.troops / activeAttacker.maxTroops * 100) + '%'}"></div></div>
            <div class="hp-val">{{ activeAttacker.troops }} / {{ activeAttacker.maxTroops }}</div>
          </div>
          <div v-else class="grave">☠️</div>
        </div>

        <div class="vs">VS</div>

        <div class="side right">
          <div v-if="activeDefender" class="active-card DEFENDER">
            <div class="name">{{ activeDefender.name }}</div>
            <div class="hp-bar"><div class="fill" :style="{width: (activeDefender.troops / activeDefender.maxTroops * 100) + '%'}"></div></div>
            <div class="hp-val">{{ activeDefender.troops }} / {{ activeDefender.maxTroops }}</div>
          </div>
          <div v-else class="grave">☠️</div>

          <div class="reserve">
            <div v-for="h in reserveDefenders" :key="h.id" class="mini-card">{{ h.name }} ({{ h.troops }})</div>
          </div>
        </div>
      </div>

      <button
          @click="emit('end-battle')"
          class="btn-quit"
          :class="{ 'btn-big': battleData && battleData.status === 'FINISHED' }"
      >
        {{ battleData && battleData.status === 'FINISHED' ? 'RETOURNER À LA VILLE' : 'Quitter le combat' }}
      </button>

      <div class="logs">
        <div v-for="(log, i) in battleData.logs.slice().reverse()" :key="i" class="log-line">
          {{ formatLog(log, battleData.logs.length - 1 - i) }}
        </div>
      </div>

    </div>

    <div v-else>Chargement...</div>

  </div>
</template>

<style scoped>
.battle-scene {
  width: 100vw; height: 100vh; background: #2c0404; color: white;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  z-index: 50; position: absolute; top: 0; left: 0;
}

.header-zone {
  height: 100px;
  display: flex; align-items: center; justify-content: center;
  width: 100%;
}

.victory-banner {
  font-size: 3rem; font-weight: 900; text-transform: uppercase;
  text-shadow: 0 0 15px black; animation: pop 0.5s;
  text-align: center;
}
.victory-banner.win { color: #2ecc71; }
.victory-banner.loose { color: #e74c3c; }

@keyframes pop { 0% { transform: scale(0); } 80% { transform: scale(1.2); } 100% { transform: scale(1); } }

.battle-info { width: 95%; max-width: 1200px; }
.battlefield { display: flex; justify-content: center; align-items: center; gap: 20px; margin: 20px 0; }
.side { display: flex; align-items: center; gap: 10px; min-width: 300px; }
.side.left { justify-content: flex-end; }
.side.right { justify-content: flex-start; }

.active-card { width: 180px; padding: 15px; background: #333; border: 3px solid #555; border-radius: 8px; text-align: center; }
.active-card.ATTACKER { border-color: #3498db; }
.active-card.DEFENDER { border-color: #e74c3c; }

.mini-card { font-size: 0.8rem; color: #aaa; background: #222; padding: 5px; border: 1px solid #444; margin-bottom: 5px; }
.grave { font-size: 3rem; opacity: 0.5; }
.hp-bar { width: 100%; height: 8px; background: black; margin: 10px 0; }
.fill { height: 100%; background: #2ecc71; transition: width 0.3s; }
.vs { font-size: 2rem; font-weight: bold; color: #888; }

.logs {
  height: 400px;
  overflow-y: auto; background: rgba(0,0,0,0.5);
  width: 80%;
  margin: 0 auto; padding: 10px;
  font-family: monospace; font-size: 0.9rem; border: 1px solid #555;
}
.log-line { margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1); }

.btn-quit {
  display: block; margin: 0 auto 20px auto;
  padding: 10px 20px; cursor: pointer; background: transparent; border: 1px solid #aaa; color: #aaa;
}
.btn-quit:hover { background: #444; color: white; }

.btn-big {
  background: #e67e22; color: white; border: none;
  font-size: 1.2rem; font-weight: bold; padding: 15px 40px;
  border-radius: 8px; box-shadow: 0 0 20px rgba(0,0,0,0.5);
}
.btn-big:hover { background: #d35400; transform: scale(1.05); }
</style>