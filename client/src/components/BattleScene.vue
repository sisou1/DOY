<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'

const props = defineProps({
  battleId: Number,
  isDev: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['end-battle'])

const ROUND_DURATION_MS = 1500
const VISIBLE_QUEUE_MAX = 6

const battleData = ref(null)
const heroNamesCache = ref({})
const showVictoryBanner = ref(false)
let pollingInterval = null

const fetchBattleState = async () => {
  try {
    const res = await fetch(`http://localhost:3000/game/battle/${props.battleId}`, { credentials: 'include' })
    const data = await res.json()
    if (!data.success) return

    const serverBattle = data.battle
    if (Array.isArray(serverBattle?.heroes)) {
      for (const hero of serverBattle.heroes) {
        heroNamesCache.value[hero.id] = hero.name
      }
    }

    battleData.value = serverBattle
    if (serverBattle.status === 'FINISHED') stopPolling()
  } catch (e) {
    console.error(e)
  }
}

const startPolling = () => {
  fetchBattleState()
  const interval = Math.max(300, Math.floor(ROUND_DURATION_MS / 3))
  pollingInterval = setInterval(fetchBattleState, interval)
}

const stopPolling = () => {
  if (!pollingInterval) return
  clearInterval(pollingInterval)
  pollingInterval = null
}

onMounted(startPolling)
onUnmounted(stopPolling)

const activeAtkUnit = computed(() => {
  const unit = battleData.value?.ui?.attacker?.active
  if (!unit) return null
  return {
    id: `${unit.heroId}-${unit.lineIndex}`,
    heroId: unit.heroId,
    heroName: unit.heroName,
    lineIndex: unit.lineIndex,
    hp: unit.hp,
    max: unit.max,
  }
})

const activeDefUnit = computed(() => {
  const unit = battleData.value?.ui?.defender?.active
  if (!unit) return null
  return {
    id: `${unit.heroId}-${unit.lineIndex}`,
    heroId: unit.heroId,
    heroName: unit.heroName,
    lineIndex: unit.lineIndex,
    hp: unit.hp,
    max: unit.max,
  }
})

const queueAtkUnits = computed(() => {
  const queue = battleData.value?.ui?.attacker?.queue || []
  // Cote attaquant (a gauche): on inverse l'ordre d'affichage pour avoir
  // ... L3 L2 L1(active) vers le centre du combat.
  return queue
    .slice()
    .reverse()
    .map((unit, i) => ({ id: `${unit.heroId}-${unit.lineIndex}-${i}`, ...unit }))
})

const queueDefUnits = computed(() => {
  const queue = battleData.value?.ui?.defender?.queue || []
  return queue.map((unit, i) => ({ id: `${unit.heroId}-${unit.lineIndex}-${i}`, ...unit }))
})

const visibleQueueAtk = computed(() => queueAtkUnits.value.slice(0, VISIBLE_QUEUE_MAX))
const visibleQueueDef = computed(() => queueDefUnits.value.slice(0, VISIBLE_QUEUE_MAX))
const overflowAtk = computed(() => Math.max(0, queueAtkUnits.value.length - VISIBLE_QUEUE_MAX))
const overflowDef = computed(() => Math.max(0, queueDefUnits.value.length - VISIBLE_QUEUE_MAX))

const victoryStatus = computed(() => {
  if (!battleData.value || battleData.value.status !== 'FINISHED') return null

  const winner = battleData.value?.result?.winnerSide
  if (winner === 'ATTACKER') return 'VICTOIRE !'
  if (winner === 'DEFENDER') return 'DEFAITE...'
  if (winner === 'DRAW') return 'HECATOMBE (Match Nul)'

  const hasAtk = Boolean(battleData.value?.ui?.attacker?.active)
  const hasDef = Boolean(battleData.value?.ui?.defender?.active)
  if (hasAtk && !hasDef) return 'VICTOIRE !'
  if (!hasAtk && hasDef) return 'DEFAITE...'
  if (!hasAtk && !hasDef) return 'HECATOMBE (Match Nul)'
  return 'COMBAT TERMINE'
})

watch(() => battleData.value?.status, (newStatus) => {
  if (newStatus === 'FINISHED') {
    showVictoryBanner.value = false
    setTimeout(() => {
      showVictoryBanner.value = true
    }, ROUND_DURATION_MS)
    return
  }
  showVictoryBanner.value = false
})

const phase = computed(() => battleData.value?.ui?.phase || (battleData.value?.ui?.pause ? 'ENTER' : 'INIT'))
const roundIndex = computed(() => battleData.value?.ui?.roundIndex ?? 0)

const debugInfo = computed(() => {
  const atk = activeAtkUnit.value
  const def = activeDefUnit.value
  return {
    phase: phase.value,
    roundIndex: roundIndex.value,
    atkHp: atk ? `${atk.hp}/${atk.max}` : '--',
    defHp: def ? `${def.hp}/${def.max}` : '--',
  }
})

const getLogTime = (log) => {
  if (typeof log?.at === 'number') return log.at
  if (typeof log?.round_time === 'number') return log.round_time
  return 0
}

const latestLogTime = computed(() => {
  const logs = battleData.value?.logs || []
  let latest = 0
  for (const log of logs) latest = Math.max(latest, getLogTime(log))
  return latest
})

const latestLogGroup = computed(() => {
  const logs = battleData.value?.logs || []
  const latest = latestLogTime.value
  if (!latest) return []
  return logs.filter((log) => getLogTime(log) === latest)
})

const isEnteringLine = (heroId, lineIdx) => {
  return latestLogGroup.value.some((log) => {
    if (log?.type === 'LINE_ENTER') {
      return String(log.heroId) === String(heroId) && Number(log.lineIndex) === Number(lineIdx)
    }
    if (log?.type === 'HERO_ENTER') {
      return String(log.heroId) === String(heroId)
    }
    return false
  })
}

const getHeroName = (id) => heroNamesCache.value[id] || 'Unite'

const displayedLogs = computed(() => {
  const logs = battleData.value?.logs || []
  let turn = 0
  const output = []

  for (const log of logs) {
    if (!log) continue
    if (Array.isArray(log.actions)) turn += 1
    output.push({ log, turn })
  }

  return output.slice().reverse()
})

const formatLog = (log, turn) => {
  if (!log) return ''

  if (log.type === 'DEATH') {
    return `☠️ ${getHeroName(log.heroId)} est elimine !`
  }

  if (log.type === 'LINE_DOWN') {
    const line = (typeof log.lineIndex === 'number') ? (log.lineIndex + 1) : '?'
    return `🔻 Ligne ${line} de ${getHeroName(log.heroId)} tombe !`
  }

  if (log.type === 'LINE_ENTER') {
    const line = (typeof log.lineIndex === 'number') ? (log.lineIndex + 1) : '?'
    return `➡️ Ligne ${line} de ${getHeroName(log.heroId)} entre en combat`
  }

  if (log.type === 'HERO_ENTER') {
    return `🎖️ ${getHeroName(log.heroId)} entre en ligne !`
  }

  if (log.type === 'BATTLE_END') {
    if (log.winnerSide === 'ATTACKER') return '🏁 Fin du combat : victoire attaquant'
    if (log.winnerSide === 'DEFENDER') return '🏁 Fin du combat : victoire defenseur'
    return '🏁 Fin du combat : match nul'
  }

  if (Array.isArray(log.actions)) {
    const parts = log.actions.map((action) => `${getHeroName(action.from)} tape -${action.dmg}`)
    return `Tour ${turn} : ${parts.join(' | ')}`
  }

  return '...'
}
</script>

<template>
  <div class="battle-scene">
    <div class="header-zone">
      <div
        v-if="victoryStatus && showVictoryBanner"
        class="victory-banner"
        :class="{ win: victoryStatus === 'VICTOIRE !', loss: victoryStatus === 'DEFAITE...' }"
      >
        {{ victoryStatus }}
      </div>
      <h1 v-else>COMBAT EN COURS</h1>
      <div class="phase-badge" :class="phase">
        Phase : {{ phase }}
        <span v-if="phase === 'ENTER'"> (entree des lignes/heros)</span>
      </div>
    </div>

    <div v-if="battleData" class="battle-info">
      <div class="battlefield">
        <div class="side left">
          <div class="unit-area">
            <div class="queue left">
              <div v-for="u in visibleQueueAtk" :key="u.id" class="queue-card">
                <div class="badge">L{{ u.lineIndex + 1 }}</div>
                <div class="q-name">{{ u.heroName }}</div>
              </div>
              <div v-if="overflowAtk > 0" class="overflow-chip left-chip">+{{ overflowAtk }}</div>
            </div>

            <div
              v-if="activeAtkUnit"
              class="unit-card ATTACKER"
              :class="{ enter: isEnteringLine(activeAtkUnit.heroId, activeAtkUnit.lineIndex) }"
            >
              <div class="unit-title">{{ activeAtkUnit.heroName }} - L{{ activeAtkUnit.lineIndex + 1 }}</div>
              <div class="hp-bar">
                <div class="fill" :style="{ width: (activeAtkUnit.hp / activeAtkUnit.max * 100) + '%' }"></div>
              </div>
              <div class="hp-val">{{ activeAtkUnit.hp }} / {{ activeAtkUnit.max }}</div>
            </div>
            <div v-else class="grave">☠️</div>
          </div>
        </div>

        <div class="vs">VS</div>

        <div class="side right">
          <div class="unit-area">
            <div
              v-if="activeDefUnit"
              class="unit-card DEFENDER"
              :class="{ enter: isEnteringLine(activeDefUnit.heroId, activeDefUnit.lineIndex) }"
            >
              <div class="unit-title">{{ activeDefUnit.heroName }} - L{{ activeDefUnit.lineIndex + 1 }}</div>
              <div class="hp-bar">
                <div class="fill" :style="{ width: (activeDefUnit.hp / activeDefUnit.max * 100) + '%' }"></div>
              </div>
              <div class="hp-val">{{ activeDefUnit.hp }} / {{ activeDefUnit.max }}</div>
            </div>
            <div v-else class="grave">☠️</div>

            <div class="queue right">
              <div v-for="u in visibleQueueDef" :key="u.id" class="queue-card">
                <div class="badge">L{{ u.lineIndex + 1 }}</div>
                <div class="q-name">{{ u.heroName }}</div>
              </div>
              <div v-if="overflowDef > 0" class="overflow-chip right-chip">+{{ overflowDef }}</div>
            </div>
          </div>
        </div>
      </div>

      <button
        @click="emit('end-battle')"
        class="btn-quit"
        :class="{ 'btn-big': battleData && battleData.status === 'FINISHED' }"
      >
        {{ battleData && battleData.status === 'FINISHED' ? 'RETOURNER A LA VILLE' : 'Quitter le combat' }}
      </button>

    </div>

    <div v-if="props.isDev && battleData" class="debug-overlay">
      <div class="debug-head">
        Debug combat
        <span class="debug-meta">round {{ debugInfo.roundIndex }} | {{ debugInfo.phase }} | ATK {{ debugInfo.atkHp }} | DEF {{ debugInfo.defHp }}</span>
      </div>
      <div class="logs">
        <div v-for="(entry, i) in displayedLogs" :key="i" class="log-line">
          {{ formatLog(entry.log, entry.turn) }}
        </div>
      </div>
    </div>

    <div v-if="!battleData">Chargement...</div>
  </div>
</template>

<style scoped>
.battle-scene {
  width: 100%;
  height: 100%;
  background: #2c0404;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  position: relative;
}

.header-zone {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.victory-banner {
  font-size: 3rem;
  font-weight: 900;
  text-transform: uppercase;
  text-shadow: 0 0 15px black;
  animation: pop 0.5s;
  text-align: center;
}

.victory-banner.win {
  color: #2ecc71;
}

.victory-banner.loss {
  color: #e74c3c;
}

@keyframes pop {
  0% {
    transform: scale(0);
  }
  80% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.battle-info {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 16px;
  box-sizing: border-box;
}

.battlefield {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 24px;
  margin: 20px 0;
  flex: 1;
  min-height: 0;
}

.side {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 100%;
}

.side.left {
  justify-self: end;
  justify-content: flex-end;
}

.side.right {
  justify-self: start;
  justify-content: flex-start;
}

.grave {
  font-size: 3rem;
  opacity: 0.5;
}

.hp-bar {
  width: 100%;
  height: 8px;
  background: black;
  margin: 10px 0;
}

.fill {
  height: 100%;
  background: #2ecc71;
  transition: width 0.3s;
}

.vs {
  font-size: 2rem;
  font-weight: bold;
  color: #888;
}

.logs {
  height: 100%;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.25);
  width: 100%;
  margin: 0;
  padding: 8px 10px;
  font-family: monospace;
  font-size: 0.82rem;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  box-sizing: border-box;
}

.log-line {
  margin-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-quit {
  display: block;
  margin: 0 auto 20px auto;
  padding: 10px 20px;
  cursor: pointer;
  background: transparent;
  border: 1px solid #aaa;
  color: #aaa;
}

.btn-quit:hover {
  background: #444;
  color: white;
}

.btn-big {
  background: #e67e22;
  color: white;
  border: none;
  font-size: 1.2rem;
  font-weight: bold;
  padding: 15px 40px;
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}

.btn-big:hover {
  background: #d35400;
  transform: scale(1.05);
}

.unit-area {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 16px;
  min-height: 140px;
  width: 100%;
}

.unit-card {
  width: 220px;
  padding: 14px;
  background: #2a2a2a;
  border: 3px solid #555;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35);
}

.unit-card.ATTACKER {
  border-color: #3498db;
}

.unit-card.DEFENDER {
  border-color: #e74c3c;
}

.unit-card.enter {
  animation: pulse-enter 0.6s ease;
}

.unit-title {
  font-weight: 700;
  margin-bottom: 8px;
}

.queue {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.queue.left {
  justify-content: flex-end;
}

.queue.right {
  justify-content: flex-start;
}

.queue-card {
  position: relative;
  width: 140px;
  height: 56px;
  background: #1d1d1d;
  border: 2px solid #444;
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 6px 8px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
  margin: 0 8px;
}

.queue-card .badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #f39c12;
  color: #2a2a2a;
  font-weight: 900;
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
}

.queue-card .q-name {
  font-size: 0.8rem;
  color: #ddd;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.overflow-chip {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 18px;
  background: #f39c12;
  color: #2a2a2a;
  font-weight: 900;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #b9770e;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}

.overflow-chip.left-chip {
  left: 8px;
}

.overflow-chip.right-chip {
  right: 8px;
}

.queue.left::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 40px;
  background: linear-gradient(90deg, rgba(44, 4, 4, 1) 0%, rgba(44, 4, 4, 0) 100%);
  pointer-events: none;
}

.queue.right::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 40px;
  background: linear-gradient(270deg, rgba(44, 4, 4, 1) 0%, rgba(44, 4, 4, 0) 100%);
  pointer-events: none;
}

.unit-card .hp-bar {
  margin-top: 6px;
}

@keyframes pulse-enter {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 rgba(243, 156, 18, 0);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 0 15px rgba(243, 156, 18, 0.5);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 rgba(243, 156, 18, 0);
  }
}

.phase-badge {
  margin-left: 12px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #444;
  font-size: 0.9rem;
}

.phase-badge.ENTER {
  background: #8e44ad;
}

.phase-badge.DAMAGE {
  background: #16a085;
}

.phase-badge.INIT {
  background: #555;
}

.debug-overlay {
  position: absolute;
  right: 14px;
  bottom: 14px;
  width: min(440px, calc(100vw - 28px));
  height: clamp(180px, 26vh, 250px);
  z-index: 30;
  background: rgba(10, 10, 10, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
  display: grid;
  grid-template-rows: auto 1fr;
}

.debug-head {
  padding: 8px 10px;
  font-size: 0.8rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.debug-meta {
  color: #c8c8c8;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
