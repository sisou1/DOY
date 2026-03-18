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
const showAtkRoster = ref(false)
const showDefRoster = ref(false)
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

const getHeroById = (id) => (battleData.value?.heroes || []).find((h) => String(h.id) === String(id))

const getHeroImageById = (id) => {
  const hero = getHeroById(id)
  if (!hero) return '/Heroes/Warrior.png'
  return hero.imageUrl || '/Heroes/Warrior.png'
}

const activeAttackerInfo = computed(() => {
  const unit = activeAtkUnit.value
  if (!unit) return null
  const hero = getHeroById(unit.heroId)
  return {
    ownerName: hero?.profile?.user?.username || 'Inconnu',
    heroName: unit.heroName,
    imageUrl: getHeroImageById(unit.heroId),
    rarityColor: hero?.rarityColor || '#fff'
  }
})

const activeDefenderInfo = computed(() => {
  const unit = activeDefUnit.value
  if (!unit) return null
  const hero = getHeroById(unit.heroId)
  return {
    ownerName: hero?.profile?.user?.username || 'IA',
    heroName: unit.heroName,
    imageUrl: getHeroImageById(unit.heroId),
    rarityColor: hero?.rarityColor || '#fff'
  }
})

const attackerRoster = computed(() => {
  const heroes = (battleData.value?.heroes || [])
    .filter((hero) => hero.side === 'ATTACKER')
    .sort((a, b) => (a.queueOrder ?? 999) - (b.queueOrder ?? 999))

  return heroes.map((hero) => ({
    owner: hero?.profile?.user?.username || 'Inconnu',
    heroName: hero.name,
    rarityColor: hero?.rarityColor || '#fff'
  }))
})

const defenderRoster = computed(() => {
  const heroes = (battleData.value?.heroes || [])
    .filter((hero) => hero.side === 'DEFENDER')
    .sort((a, b) => (a.queueOrder ?? 999) - (b.queueOrder ?? 999))

  return heroes.map((hero) => ({
    owner: hero?.profile?.user?.username || 'IA',
    heroName: hero.name,
    rarityColor: hero?.rarityColor || '#fff'
  }))
})

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
    <div class="side-head side-head-left">
      <div class="side-head-title">ATTAQUANT</div>
      <div v-if="activeAttackerInfo" class="side-head-card">
        <img :src="activeAttackerInfo.imageUrl" class="side-head-avatar" alt="Attacker" />
        <div class="side-head-text">
          <div class="owner-name">
            {{ activeAttackerInfo.ownerName }} (
            <span :style="{ color: activeAttackerInfo.rarityColor || '#fff' }">{{ activeAttackerInfo.heroName }}</span>
            )
          </div>
          <button class="roster-link" @click="showAtkRoster = !showAtkRoster">Heros: {{ attackerRoster.length }}</button>
        </div>
      </div>
      <div v-if="showAtkRoster" class="roster-panel">
        <div v-for="(entry, idx) in attackerRoster" :key="`atk-${idx}`" class="roster-line">
          {{ entry.owner }} (
          <span :style="{ color: entry.rarityColor || '#fff' }">{{ entry.heroName }}</span>
          )
        </div>
      </div>
    </div>

    <div class="side-head side-head-right">
      <div class="side-head-title">DEFENSEUR</div>
      <div v-if="activeDefenderInfo" class="side-head-card mirror">
        <div class="side-head-text">
          <div class="owner-name">
            {{ activeDefenderInfo.ownerName }} (
            <span :style="{ color: activeDefenderInfo.rarityColor || '#fff' }">{{ activeDefenderInfo.heroName }}</span>
            )
          </div>
          <button class="roster-link" @click="showDefRoster = !showDefRoster">Heros: {{ defenderRoster.length }}</button>
        </div>
        <img :src="activeDefenderInfo.imageUrl" class="side-head-avatar" alt="Defender" />
      </div>
      <div v-if="showDefRoster" class="roster-panel mirror">
        <div v-for="(entry, idx) in defenderRoster" :key="`def-${idx}`" class="roster-line">
          {{ entry.owner }} (
          <span :style="{ color: entry.rarityColor || '#fff' }">{{ entry.heroName }}</span>
          )
        </div>
      </div>
    </div>

    <div class="header-zone">
      <div
        v-if="victoryStatus && showVictoryBanner"
        class="victory-banner"
        :class="{ win: victoryStatus === 'VICTOIRE !', loss: victoryStatus === 'DEFAITE...' }"
      >
        {{ victoryStatus }}
      </div>
      <h1 v-else>COMBAT EN COURS</h1>
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
        Debug
        <span class="debug-meta">phase: {{ debugInfo.phase }} | round {{ debugInfo.roundIndex }} | ATK {{ debugInfo.atkHp }} | DEF {{ debugInfo.defHp }}</span>
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

.side-head {
  position: absolute;
  top: 8px;
  z-index: 24;
  min-width: 420px;
  max-width: 520px;
  background: rgba(12, 12, 12, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 12px 16px;
}

.side-head-left { left: 18px; }
.side-head-right {
  right: 18px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}

.side-head-title {
  font-size: 0.92rem;
  color: #d6d6d6;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}

.side-head-card {
  display: flex;
  align-items: center;
  gap: 14px;
}

.side-head-card.mirror {
  justify-content: flex-end;
  flex-direction: row;
  width: 100%;
}

.side-head-card.mirror .side-head-text {
  text-align: right;
}

.side-head-right .side-head-title {
  width: 100%;
  text-align: right;
}

.side-head-avatar {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  border: 1px solid #666;
  object-fit: cover;
  background: #111;
}

.side-head-text {
  min-width: 0;
}

.owner-name {
  color: #fff;
  font-size: 1.28rem;
  line-height: 1.15;
  font-weight: 700;
}

.roster-link {
  margin-top: 6px;
  border: 1px solid #6f6f6f;
  background: #232323;
  color: #f2f2f2;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s ease, transform 0.1s ease, border-color 0.15s ease;
}

.roster-link:hover {
  background: #2f2f2f;
  border-color: #9a9a9a;
}

.roster-link:active {
  transform: translateY(1px);
}

.side-head-right .roster-link {
  align-self: flex-end;
  text-align: right;
}

.roster-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 50%;
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.42);
  border-radius: 6px;
  padding: 6px 8px;
  z-index: 25;
}

.roster-panel.mirror {
  left: auto;
  right: 0;
  text-align: right;
}

.roster-line {
  color: #d7d7d7;
  font-size: 0.82rem;
  line-height: 1.35;
  padding: 3px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.roster-line:last-child {
  border-bottom: none;
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
