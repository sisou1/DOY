<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'

const props = defineProps({ battleId: Number })
const emit = defineEmits(['end-battle'])

const battleData = ref(null)
const heroNamesCache = ref({})
let pollingInterval = null

const fetchBattleState = async () => {
  try {
    const res = await fetch(`http://localhost:3000/game/battle/${props.battleId}`, { credentials: 'include' })
    const data = await res.json()

    if (!data.success) return

    const serverBattle = data.battle

    // Cache noms (utile pour formatter les logs)
    if (serverBattle.heroes) {
      serverBattle.heroes.forEach(h => {
        heroNamesCache.value[h.id] = h.name
      })
    }

    // Nouveau protocole: on fait confiance au serveur (ui + heroes) et on assigne tel quel
    battleData.value = serverBattle

    if (serverBattle.status === 'FINISHED') {
      stopPolling()
    }
  } catch (e) { console.error(e) }
}

const startPolling = () => {
  fetchBattleState()
  // Polling plus fin pour ne louper aucun tick
  const interval = Math.max(300, Math.floor(ROUND_DURATION_MS / 3))
  pollingInterval = setInterval(fetchBattleState, interval)
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

// Affichage de la bannière de victoire avec un léger délai pour l'anim finale
const ROUND_DURATION_MS = 1500 // doit rester aligné avec le back
const showVictoryBanner = ref(false)

const victoryStatus = computed(() => {
  if (!battleData.value || battleData.value.status !== 'FINISHED') return null

  const attackersAlive = attackers.value.some(h => h.troops > 0)
  const defendersAlive = defenders.value.some(h => h.troops > 0)

  if (attackersAlive && !defendersAlive) return "VICTOIRE !"
  if (!attackersAlive && defendersAlive) return "DÉFAITE..."

  if (!attackersAlive && !defendersAlive) return "HÉCATOMBE (Match Nul)"

  return "COMBAT TERMINÉ"
})

// Ancienne vue par héros (gardée si besoin ailleurs)
const activeAttacker = computed(() => attackers.value[0])
const activeDefender = computed(() => defenders.value[0])

// --- Nouveau modèle d'affichage « unités en file » (chaque héros est découpé en 3 unités) ---
const flattenSideToUnits = (heroes) => {
  const out = []
  for (const h of (heroes || [])) {
    const segs = getLineSegments(h)
    for (const seg of segs) {
      if (seg.max <= 0) continue
      if (seg.hp <= 0) continue // on ne garde que les lignes encore vivantes
      out.push({
        id: `${h.id}-${seg.idx}`,
        heroId: h.id,
        heroName: h.name,
        side: h.side,
        lineIndex: seg.idx,
        hp: seg.hp,
        max: seg.max,
      })
    }
  }
  return out
}

const getAliveHeroes = (side) => {
  if (!battleData.value || !battleData.value.heroes) return []
  return battleData.value.heroes
    .filter(h => h.side === side && h.troops > 0)
    .sort((a, b) => a.queueOrder - b.queueOrder)
}

// Horodatage commun des logs (le back peut envoyer `at` ou `round_time`)
const getLogTime = (l) => (l && (typeof l.at === 'number' ? l.at : (typeof l.round_time === 'number' ? l.round_time : 0)))

// Renvoie les infos sur le dernier "groupe temporel" de logs
const getLatestRoundMeta = () => {
  const logs = battleData.value?.logs || []
  if (logs.length === 0) return { time: null, hasActions: false, enters: new Set(), hasAnyEnter: false }
  let latest = 0
  for (const l of logs) latest = Math.max(latest, getLogTime(l))
  const group = logs.filter(l => getLogTime(l) === latest)
  const hasActions = group.some(l => Array.isArray(l.actions))
  const enters = new Set(group.filter(l => l && (l.type === 'LINE_ENTER' || l.type === 'HERO_ENTER')).map(l => String(l.heroId)))
  return { time: latest, hasActions, enters, hasAnyEnter: enters.size > 0 }
}

// Vrai uniquement sur un tour de "pause d'entrée":
// - Le dernier groupe n'a PAS d'actions
// - Il contient un LINE_ENTER/HERO_ENTER pour ce héros
const isPauseRoundForHero = (heroId) => {
  const meta = getLatestRoundMeta()
  if (!meta.time) return false
  if (meta.hasActions) return false
  return meta.enters.has(String(heroId))
}

// Dernière ligne tombée pour un héros AVANT un temps donné (utile pour afficher la ligne 0 PV pendant la pause)
const getLastLineDownIndex = (heroId, beforeTime = Infinity) => {
  const logs = battleData.value?.logs || []
  let last = null
  for (let i = logs.length - 1; i >= 0; i--) {
    const l = logs[i]
    if (!l) continue
    const t = getLogTime(l)
    if (t >= beforeTime) continue
    if (l.type === 'LINE_DOWN' && String(l.heroId) === String(heroId)) { last = typeof l.lineIndex === 'number' ? l.lineIndex : last; break }
  }
  return last
}

const makeUnit = (hero, lineIndex, hp, max) => ({
  id: `${hero.id}-${lineIndex}`,
  heroId: hero.id,
  heroName: hero.name,
  side: hero.side,
  lineIndex,
  hp,
  max,
})

const getActiveUnitForSide = (side) => {
  const heroes = getAliveHeroes(side)
  const hero = heroes[0]
  if (!hero) return null

  // Toujours afficher la première ligne vivante actuelle
  const segs = getLineSegments(hero)
  const firstAliveIdx = segs.findIndex(s => s.hp > 0)
  if (firstAliveIdx >= 0) {
    const seg = segs[firstAliveIdx]
    return makeUnit(hero, seg.idx, seg.hp, seg.max)
  }
  return null
}

const getQueueUnitsForSide = (side) => {
  const result = []
  const heroes = getAliveHeroes(side)
  if (heroes.length === 0) return result

  const current = heroes[0]
  const segs = getLineSegments(current)
  const firstAliveIdx = segs.findIndex(s => s.hp > 0)

  // Lignes restantes après la ligne active
  if (firstAliveIdx >= 0) {
    for (let i = firstAliveIdx + 1; i < segs.length; i++) {
      const seg = segs[i]
      if (seg.hp > 0) result.push(makeUnit(current, seg.idx, seg.hp, seg.max))
    }
  }

  // Puis les héros suivants (toutes leurs lignes vivantes)
  for (let h = 1; h < heroes.length; h++) {
    const hero = heroes[h]
    const s2 = getLineSegments(hero)
    for (const seg of s2) {
      if (seg.hp > 0) result.push(makeUnit(hero, seg.idx, seg.hp, seg.max))
    }
  }

  return result
}

// Nouvelles sources UI côté serveur (version 2)
const activeAtkUnit = computed(() => {
  const u = battleData.value?.ui?.attacker?.active
  if (!u) return null
  return { id: `${u.heroId}-${u.lineIndex}`, heroId: u.heroId, heroName: u.heroName, lineIndex: u.lineIndex, hp: u.hp, max: u.max }
})
const activeDefUnit = computed(() => {
  const u = battleData.value?.ui?.defender?.active
  if (!u) return null
  return { id: `${u.heroId}-${u.lineIndex}`, heroId: u.heroId, heroName: u.heroName, lineIndex: u.lineIndex, hp: u.hp, max: u.max }
})

const queueAtkUnits = computed(() => {
  const arr = battleData.value?.ui?.attacker?.queue || []
  return arr.map(u => ({ id: `${u.heroId}-${u.lineIndex}`, ...u }))
})
const queueDefUnits = computed(() => {
  const arr = battleData.value?.ui?.defender?.queue || []
  return arr.map(u => ({ id: `${u.heroId}-${u.lineIndex}`, ...u }))
})

const getHeroName = (id) => heroNamesCache.value[id] || 'Unité'

const formatLog = (log, index) => {
  if (!log) return ''
  // On masque les logs techniques de planification
  if (log.type === 'SCHEDULE_ENTER') return ''
  if (log.type === 'DEATH') {
    return `☠️ ${getHeroName(log.heroId)} est éliminé !`
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
  if (log.actions) {
    const parts = log.actions.map(a => `${getHeroName(a.from)} tape -${a.dmg}`)
    return `Tour ${index + 1} : ${parts.join(' | ')}`
  }
  return '...'
}

// --- Affichage des lignes (3 par héros) ---
const LINES_PER_HERO = 3
const getLineSizes = (maxTroops) => {
  const lines = LINES_PER_HERO
  const base = Math.floor(maxTroops / lines)
  const rem = maxTroops % lines
  const arr = []
  for (let i = 0; i < lines; i++) arr.push(base + (i < rem ? 1 : 0))
  return arr
}
const getLineSegments = (hero) => {
  if (!hero) return []
  const sizes = getLineSizes(hero.maxTroops || 0)
  let remaining = Math.max(0, hero.troops || 0)
  return sizes.map((size, idx) => {
    const hp = Math.max(0, Math.min(size, remaining))
    remaining -= hp
    return { idx, hp, max: size }
  })
}

// Petit helper pour savoir si une unité (ligne d'un héros) vient d'entrer (pour animer)
const isEnteringLine = (heroId, lineIdx) => {
  const logs = battleData.value?.logs || []
  for (let i = logs.length - 1; i >= 0; i--) {
    const l = logs[i]
    if (l.type === 'LINE_ENTER' && String(l.heroId) === String(heroId)) {
      return l.lineIndex === lineIdx
    }
    if (l.type === 'HERO_ENTER' && String(l.heroId) === String(heroId)) {
      // entrée d'un héros => on anime l'unité active (sa première ligne vivante)
      return true
    }
    if (l.type === 'DEATH' || l.actions) {
      // On s'arrête au dernier "tour" effectif/état majeur
      break
    }
  }
  return false
}

const displayedLogs = computed(() => {
  const all = battleData.value?.logs || []
  return all.filter(l => l && l.type !== 'SCHEDULE_ENTER')
})

// --- Limitation d'affichage des files (ne montrer que les 5-6 premières unités) ---
const VISIBLE_QUEUE_MAX = 6
const visibleQueueAtk = computed(() => queueAtkUnits.value.slice(0, VISIBLE_QUEUE_MAX))
const visibleQueueDef = computed(() => queueDefUnits.value.slice(0, VISIBLE_QUEUE_MAX))
const overflowAtk = computed(() => Math.max(0, queueAtkUnits.value.length - VISIBLE_QUEUE_MAX))
const overflowDef = computed(() => Math.max(0, queueDefUnits.value.length - VISIBLE_QUEUE_MAX))

// Injecte un petit délai avant d'afficher la bannière finale pour laisser jouer l'anim de mort
watch(() => battleData.value?.status, (newVal) => {
  if (newVal === 'FINISHED') {
    // On arrête le polling et on attend un ROUND pour la bannière
    showVictoryBanner.value = false
    setTimeout(() => {
      showVictoryBanner.value = true
    }, ROUND_DURATION_MS)
  } else {
    showVictoryBanner.value = false
  }
})
</script>

<template>
  <div class="battle-scene">

    <div class="header-zone">
      <div v-if="victoryStatus && showVictoryBanner" class="victory-banner" :class="{ win: victoryStatus === 'VICTOIRE !', loose: victoryStatus === 'DÉFAITE...' }">
        {{ victoryStatus }}
      </div>
      <h1 v-else>⚔️ COMBAT EN COURS ⚔️</h1>
    </div>

    <div v-if="battleData" class="battle-info">

      <div class="battlefield">
        <!-- Côté Attaquant: pile de files + unité active -->
        <div class="side left">
          <div class="unit-area">
            <div class="queue left">
              <div
                v-for="(u, idx) in visibleQueueAtk"
                :key="u.id"
                class="queue-card"
              >
                <div class="badge">L{{ u.lineIndex + 1 }}</div>
                <div class="q-name">{{ u.heroName }}</div>
              </div>
              <div v-if="overflowAtk > 0" class="overflow-chip left-chip">
                +{{ overflowAtk }}
              </div>
            </div>

            <div v-if="activeAtkUnit" class="unit-card ATTACKER" :class="{ enter: isEnteringLine(activeAtkUnit.heroId, activeAtkUnit.lineIndex) }">
              <div class="unit-title">{{ activeAtkUnit.heroName }} — L{{ activeAtkUnit.lineIndex + 1 }}</div>
              <div class="hp-bar"><div class="fill" :style="{ width: (activeAtkUnit.hp / activeAtkUnit.max * 100) + '%' }"></div></div>
              <div class="hp-val">{{ activeAtkUnit.hp }} / {{ activeAtkUnit.max }}</div>
            </div>
            <div v-else class="grave">☠️</div>
          </div>
        </div>

        <div class="vs">VS</div>

        <!-- Côté Défenseur: unité active + pile de files -->
        <div class="side right">
          <div class="unit-area">
            <div v-if="activeDefUnit" class="unit-card DEFENDER" :class="{ enter: isEnteringLine(activeDefUnit.heroId, activeDefUnit.lineIndex) }">
              <div class="unit-title">{{ activeDefUnit.heroName }} — L{{ activeDefUnit.lineIndex + 1 }}</div>
              <div class="hp-bar"><div class="fill" :style="{ width: (activeDefUnit.hp / activeDefUnit.max * 100) + '%' }"></div></div>
              <div class="hp-val">{{ activeDefUnit.hp }} / {{ activeDefUnit.max }}</div>
            </div>
            <div v-else class="grave">☠️</div>

            <div class="queue right">
              <div
                v-for="(u, idx) in visibleQueueDef"
                :key="u.id"
                class="queue-card"
              >
                <div class="badge">L{{ u.lineIndex + 1 }}</div>
                <div class="q-name">{{ u.heroName }}</div>
              </div>
              <div v-if="overflowDef > 0" class="overflow-chip right-chip">
                +{{ overflowDef }}
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
        {{ battleData && battleData.status === 'FINISHED' ? 'RETOURNER À LA VILLE' : 'Quitter le combat' }}
      </button>

      <div class="logs">
        <div v-for="(log, i) in displayedLogs.slice().reverse()" :key="i" class="log-line">
          {{ formatLog(log, displayedLogs.length - 1 - i) }}
        </div>
      </div>

    </div>

    <div v-else>Chargement...</div>

  </div>
</template>

<style scoped>
 .battle-scene {
  width: 100%; height: 100%; background: #2c0404; color: white;
  display: flex; flex-direction: column; align-items: stretch; justify-content: flex-start;
  position: relative;
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

.battle-info { width: 100%; flex: 1; display: flex; flex-direction: column; padding: 0 16px; box-sizing: border-box; }
/* Centrage strict: 1fr | auto(VS) | 1fr pour que le centre reste centré même si un côté est vide */
.battlefield { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 24px; margin: 20px 0; flex: 1; min-height: 0; }
.side { display: flex; align-items: center; gap: 12px; height: 100%; }
.side.left { justify-self: end; }
.side.right { justify-self: start; }
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
  max-height: 35vh;
  overflow-y: auto; background: rgba(0,0,0,0.5);
  width: 100%;
  margin: 0 0 12px 0; padding: 10px;
  font-family: monospace; font-size: 0.9rem; border: 1px solid #555; box-sizing: border-box;
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

/* --- VISU FACE-À-FACE PAR UNITÉS (lignes fractionnées) --- */
.unit-area { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 16px; min-height: 140px; width: 100%; }
.unit-card {
  width: 220px; padding: 14px; background: #2a2a2a; border: 3px solid #555; border-radius: 10px; text-align: center;
  box-shadow: 0 10px 20px rgba(0,0,0,0.35);
}
.unit-card.ATTACKER { border-color: #3498db; }
.unit-card.DEFENDER { border-color: #e74c3c; }
.unit-card.enter { animation: pulse-enter 0.6s ease; }
.unit-title { font-weight: 700; margin-bottom: 8px; }
.queue { position: relative; width: 100%; height: 100%; display: flex; align-items: center; overflow: hidden; }
.queue.left { justify-content: flex-end; }
.queue.right { justify-content: flex-start; }
.queue-card {
  position: relative; width: 140px; height: 56px; background: #1d1d1d; border: 2px solid #444; border-radius: 6px; 
  display: flex; align-items: center; padding: 6px 8px; box-shadow: 0 6px 12px rgba(0,0,0,0.3);
  margin: 0 8px;
}
.queue-card .badge {
  width: 22px; height: 22px; border-radius: 50%; background: #f39c12; color: #2a2a2a; font-weight: 900; font-size: 0.75rem;
  display: inline-flex; align-items: center; justify-content: center; margin-right: 8px;
}
.queue-card .q-name { font-size: 0.8rem; color: #ddd; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Indice d'overflow: +N (ancré aux bords) */
.overflow-chip { position: absolute; top: 50%; transform: translateY(-50%); width: 36px; height: 36px; border-radius: 18px; background: #f39c12; color: #2a2a2a; font-weight: 900; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; border: 2px solid #b9770e; box-shadow: 0 6px 12px rgba(0,0,0,0.3); }
.overflow-chip.left-chip { left: 8px; }
.overflow-chip.right-chip { right: 8px; }

/* Masque de fondu en bord de file pour suggérer qu'il y en a plus */
.queue.left::after {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 40px;
  background: linear-gradient(90deg, rgba(44,4,4,1) 0%, rgba(44,4,4,0) 100%);
  pointer-events: none;
}
.queue.right::after {
  content: ""; position: absolute; right: 0; top: 0; bottom: 0; width: 40px;
  background: linear-gradient(270deg, rgba(44,4,4,1) 0%, rgba(44,4,4,0) 100%);
  pointer-events: none;
}

/* Hérite des barres de PV standard */
.unit-card .hp-bar { margin-top: 6px; }

@keyframes pulse-enter {
  0% { transform: scale(0.95); box-shadow: 0 0 0 rgba(243,156,18,0); }
  50% { transform: scale(1.02); box-shadow: 0 0 15px rgba(243,156,18,0.5); }
  100% { transform: scale(1); box-shadow: 0 0 0 rgba(243,156,18,0); }
}
</style>