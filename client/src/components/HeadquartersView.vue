<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import dayjs from 'dayjs' // Si tu ne l'as pas, installe-le ou utilise Date native (ici je fais natif pour pas te bloquer)

const props = defineProps({
  buildings: { type: Array, required: true }
})

const emit = defineEmits(['upgrade-action', 'refresh-request'])

// --- CONFIGURATION DES ZONES ---
const zoneConfig = {
  FARM: { style: { top: '30%', left: '77%' } },
  SAWMILL: { style: { top: '40%', left: '15%' } },
  IRON_MINE: { style: { top: '60%', left: '45%' } }
}

const buildingImages = {
  SAWMILL: '/HeadQuartersBuildings/Sawmill.png',
  FARM: '/HeadQuartersBuildings/Farm.png',
  IRON_MINE: '/HeadQuartersBuildings/Iron Mine.png'
}

const buildingNames = {
  SAWMILL: 'Scierie',
  FARM: 'Ferme',
  IRON_MINE: 'Mine de Fer'
}

// --- LOGIQUE DES TIMERS ---
const now = ref(Date.now())
let timerInterval = null

// Met à jour l'heure locale toutes les secondes
const startTimer = () => {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    now.value = Date.now()
    checkFinishedConstructions()
  }, 1000)
}

// Vérifie si une construction vient de se finir
const checkFinishedConstructions = () => {
  props.buildings.forEach(b => {
    if (b.status === 'UPGRADING' && b.constructionEndsAt) {
      const end = new Date(b.constructionEndsAt).getTime()
      // Si c'est fini (avec une petite marge de 1s) et qu'on n'a pas encore rafraichi
      if (end <= now.value) {
        // On demande au parent de recharger les données
        // On ajoute un petit délai tampon pour être sûr que le serveur a validé
        emit('refresh-request')
      }
    }
  })
}

// Calcule le temps restant formaté (MM:SS)
const getRemainingTime = (dateString) => {
  if (!dateString) return ''
  const end = new Date(dateString).getTime()
  const diff = Math.max(0, Math.floor((end - now.value) / 1000))

  if (diff <= 0) return 'Terminé...'

  const minutes = Math.floor(diff / 60)
  const seconds = diff % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

onMounted(() => {
  startTimer()
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

// --- GROUPEMENT ---
const groupedBuildings = computed(() => {
  const groups = { FARM: [], SAWMILL: [], IRON_MINE: [] }
  props.buildings.forEach(b => {
    if (groups[b.type]) groups[b.type].push(b)
  })
  return groups
})

// --- MODALE ET UPGRADE ---
const selectedBuilding = ref(null)
const nextLevelStats = ref(null)
const currentLevelStats = ref(null)
const isLoadingStats = ref(false)

// ... (Le reste du code de la modale reste identique, je le remets pour être complet) ...
const fetchStats = async (type, level) => {
  try {
    const res = await fetch(`http://localhost:3000/game/building-stats?type=${type}&level=${level}`)
    const data = await res.json()
    return data.success ? data.stats : null
  } catch (e) {
    console.error(e)
    return null
  }
}

const openUpgradeModal = async (building) => {
  // On empêche d'ouvrir si c'est déjà en construction
  if (building.status === 'UPGRADING') return

  selectedBuilding.value = building
  isLoadingStats.value = true
  nextLevelStats.value = null
  currentLevelStats.value = null

  const [current, next] = await Promise.all([
    fetchStats(building.type, building.level),
    fetchStats(building.type, building.level + 1)
  ])

  currentLevelStats.value = current
  nextLevelStats.value = next
  isLoadingStats.value = false
}

const closeModal = () => {
  selectedBuilding.value = null
}

const confirmUpgrade = () => {
  if (selectedBuilding.value) {
    emit('upgrade-action', selectedBuilding.value.type)
    closeModal()
  }
}

const decorBuildings = [
  { name: 'QG', img: '/HeadQuartersBuildings/Batiment principal.png', style: { top: '15%', left: '40%'}, width: '280px' },
  { name: 'Moulin', img: '/HeadQuartersBuildings/Moulin.png', style: { top: '10%', left: '80%' }, width: '140px' }
]
</script>

<template>
  <div class="scene-container">

    <!-- Décor -->
    <div
        v-for="(decor, index) in decorBuildings"
        :key="'decor-'+index"
        class="decor-sprite"
        :style="{ ...decor.style, width: decor.width }"
    >
      <img :src="decor.img" :alt="decor.name" />
    </div>

    <!-- Zones -->
    <div
        v-for="(config, type) in zoneConfig"
        :key="type"
        class="building-zone"
        :style="config.style"
    >
      <template v-for="index in 4" :key="index">
        <div
            v-if="groupedBuildings[type][index - 1]"
            class="building-slot interactive"
            :class="{ 'is-upgrading': groupedBuildings[type][index - 1].status === 'UPGRADING' }"
            @click="openUpgradeModal(groupedBuildings[type][index - 1])"
        >
          <div class="level-badge">{{ groupedBuildings[type][index - 1].level }}</div>
          <img :src="buildingImages[type]" :alt="type" />

          <!-- État normal -->
          <div v-if="groupedBuildings[type][index - 1].status !== 'UPGRADING'" class="building-label">
            {{ buildingNames[type] }}
          </div>

          <!-- État Construction -->
          <div v-else class="construction-overlay">
            <div class="hammer-icon">🔨</div>
            <div class="timer">{{ getRemainingTime(groupedBuildings[type][index - 1].constructionEndsAt) }}</div>
          </div>
        </div>

        <div v-else class="building-slot empty">
          <img src="/HeadQuartersBuildings/Emplacement vide.png" />
        </div>
      </template>
    </div>

    <!-- Modale -->
    <div v-if="selectedBuilding" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <h3>Améliorer {{ buildingNames[selectedBuilding.type] }}</h3>
        <div v-if="isLoadingStats" class="loading">Chargement...</div>
        <div v-else-if="nextLevelStats && currentLevelStats">
          <p class="level-transition">Niveau {{ selectedBuilding.level }} ➝ <span class="highlight-green">Niveau {{ selectedBuilding.level + 1 }}</span></p>
          <p class="duration-info">⏱️ Temps : {{ nextLevelStats.time }} sec</p>

          <div class="stats-comparison">
            <div class="stat-row">
              <span>Production :</span>
              <span class="old-val">{{ currentLevelStats.production }}/h</span>
              <span class="arrow">➜</span>
              <span class="new-val">+{{ nextLevelStats.production }}/h</span>
            </div>
          </div>
          <div class="cost-preview">
            <p>Coût : <span class="wood-cost">{{ nextLevelStats.cost.wood }} Bois</span></p>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="closeModal">Fermer</button>
            <button class="btn-confirm" @click="confirmUpgrade">Améliorer</button>
          </div>
        </div>
        <div v-else class="error-msg">Erreur données.</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scene-container {
  position: absolute; top: 60px; left: 0; width: 100vw; height: calc(100vh - 60px);
  background-image: url('/HeadQuartersBuildings/Fond.png');
  background-size: cover; background-position: center;
  z-index: 10; overflow: hidden;
}

/* ... (Styles précédents inchangés pour zones et décor) ... */
.building-zone { position: absolute; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 10px; width: 260px; }
.building-slot { width: 120px; height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
.building-slot img { width: 100%; height: 100%; object-fit: contain; transition: filter 0.2s, transform 0.2s; }
.empty img { filter: none; opacity: 1; }
.interactive { cursor: pointer; }
.interactive img { filter: drop-shadow(0 5px 10px rgba(0,0,0,0.7)); }
.interactive:hover img { filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.6)); transform: scale(1.05); }
.decor-sprite { position: absolute; display: flex; flex-direction: column; align-items: center; }
.decor-sprite img { width: 100%; height: auto; filter: drop-shadow(0 5px 10px rgba(0,0,0,0.5)); }

.level-badge { position: absolute; top: 0; right: 0; background: #e6c200; color: black; font-weight: bold; border-radius: 50%; width: 25px; height: 25px; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.5); z-index: 2; }
.building-label { background: rgba(0,0,0,0.6); color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.8rem; position: absolute; bottom: -10px; opacity: 0; transition: opacity 0.2s; pointer-events: none; white-space: nowrap; z-index: 5; }
.interactive:hover .building-label { opacity: 1; }

/* --- NOUVEAUX STYLES POUR LA CONSTRUCTION --- */
.is-upgrading { cursor: default; }
.is-upgrading img { filter: grayscale(0.8) sepia(0.2); opacity: 0.7; }

.construction-overlay {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  padding: 5px 10px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
  border: 1px solid #f39c12;
}

.hammer-icon { font-size: 1.5rem; animation: hammer-swing 1s infinite alternate; }
.timer { font-weight: bold; color: #f39c12; font-size: 0.9rem; margin-top: 2px; }

@keyframes hammer-swing {
  0% { transform: rotate(-20deg); }
  100% { transform: rotate(20deg); }
}

/* ... (Styles modale inchangés) ... */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 100; display: flex; justify-content: center; align-items: center; }
.modal-content { background: #222; padding: 2rem; border-radius: 8px; border: 1px solid #555; text-align: center; min-width: 350px; color: white; }
.modal-actions { display: flex; justify-content: space-around; margin-top: 1.5rem; }
.btn-confirm { background: #2e7d32; color: white; border: none; padding: 10px 20px; cursor: pointer; border-radius: 4px; }
.btn-cancel { background: #c62828; color: white; border: none; padding: 10px 20px; cursor: pointer; border-radius: 4px; }
.level-transition { font-size: 1.2rem; margin-bottom: 1.5rem; }
.highlight-green { color: #4caf50; font-weight: bold; }
.stats-comparison { background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 4px; margin-bottom: 1rem; }
.stat-row { display: flex; justify-content: center; align-items: center; gap: 10px; font-size: 1rem; }
.old-val { color: #aaa; }
.arrow { color: #fff; }
.new-val { color: #4caf50; font-weight: bold; }
.wood-cost { color: #e6c200; font-weight: bold; font-size: 1.1rem; }
.cost-preview { margin-bottom: 1rem; font-size: 1.1rem; }
.loading { color: #aaa; margin: 2rem 0; font-style: italic; }
.error-msg { color: #ff5252; }
.duration-info { margin-bottom: 10px; color: #3498db; }
</style>