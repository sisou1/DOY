<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  buildings: { type: Array, required: true }
})

const emit = defineEmits(['upgrade-action'])

// Plus de config dupliquée ici ! C'est clean.

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

const ORDER = ['FARM', 'SAWMILL', 'IRON_MINE']

const sortedBuildings = computed(() => {
  // On crée une copie pour ne pas muter la prop (bonnes pratiques Vue)
  return [...props.buildings].sort((a, b) => {
    const indexA = ORDER.indexOf(a.type)
    const indexB = ORDER.indexOf(b.type)
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
  })
})

const selectedBuilding = ref(null)
const nextLevelStats = ref(null)
const currentLevelStats = ref(null)
const isLoadingStats = ref(false)

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
  selectedBuilding.value = building
  isLoadingStats.value = true
  nextLevelStats.value = null
  currentLevelStats.value = null

  // On demande au serveur les stats actuelles et futures
  // Promise.all permet de lancer les 2 requêtes en parallèle
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
  nextLevelStats.value = null
  currentLevelStats.value = null
}

const confirmUpgrade = () => {
  if (selectedBuilding.value) {
    emit('upgrade-action', selectedBuilding.value.type)
    closeModal()
  }
}
</script>

<template>
  <div class="hq-container">
    <h2>🛡️ Quartier Général</h2>

    <div class="buildings-grid">
      <div
        v-for="building in sortedBuildings"
        :key="building.id"
        class="building-card"
        @click="openUpgradeModal(building)"
      >
        <div class="level-badge">Niv. {{ building.level }}</div>
        <img :src="buildingImages[building.type]" :alt="building.type" class="building-img" />
        <h3>{{ buildingNames[building.type] }}</h3>
      </div>
    </div>

    <!-- MODALE UPGRADE -->
    <div v-if="selectedBuilding" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <h3>Améliorer {{ buildingNames[selectedBuilding.type] }}</h3>

        <div v-if="isLoadingStats" class="loading">Chargement des données...</div>

        <div v-else-if="nextLevelStats && currentLevelStats">
          <p class="level-transition">Niveau {{ selectedBuilding.level }} ➝ <span class="highlight-green">Niveau {{ selectedBuilding.level + 1 }}</span></p>

          <div class="stats-comparison">
            <div class="stat-row">
              <span>Production :</span>
              <span class="old-val">{{ currentLevelStats.production }}/h</span>
              <span class="arrow">➜</span>
              <span class="new-val">+{{ nextLevelStats.production }}/h</span>
              <span class="diff">(+{{ nextLevelStats.production - currentLevelStats.production }})</span>
            </div>
          </div>

          <div class="cost-preview">
            <p>Coût : <span class="wood-cost">{{ nextLevelStats.cost.wood }} Bois</span></p>
          </div>

          <div class="modal-actions">
            <button class="btn-cancel" @click="closeModal">Annuler</button>
            <button class="btn-confirm" @click="confirmUpgrade">Améliorer</button>
          </div>
        </div>
        
        <div v-else class="error-msg">Impossible de charger les statistiques.</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Styles précédents identiques + loading */
.loading { color: #aaa; margin: 2rem 0; font-style: italic; }
/* ... (Reste du CSS comme avant) ... */
/* Styles précédents inchangés */
.hq-container {
  background: rgba(20, 25, 30, 0.95);
  border: 1px solid #3a4a5a;
  border-radius: 4px;
  padding: 2rem;
  width: 800px;
  position: absolute;
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  z-index: 50;
  color: white;
}
.buildings-grid {
  display: flex; justify-content: center; gap: 2rem; margin-top: 2rem;
}
.building-card {
  position: relative; background: rgba(0,0,0,0.3); border: 1px solid #444;
  border-radius: 8px; padding: 1rem; cursor: pointer; transition: all 0.2s;
  width: 180px; text-align: center;
}
.building-card:hover { border-color: #64b5f6; transform: scale(1.05); background: rgba(255,255,255,0.05); }
.building-img { width: 100px; height: 100px; object-fit: contain; margin-bottom: 10px; }
.level-badge {
  position: absolute; top: 5px; right: 5px; background: #e6c200;
  color: black; font-weight: bold; font-size: 0.8rem; padding: 2px 6px; border-radius: 4px;
}
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7);
  z-index: 100; display: flex; justify-content: center; align-items: center;
}
.modal-content {
  background: #222; padding: 2rem; border-radius: 8px; border: 1px solid #555;
  text-align: center; min-width: 350px;
}
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
.diff { font-size: 0.8rem; color: #888; margin-left: 5px; }
.wood-cost { color: #e6c200; font-weight: bold; font-size: 1.1rem; }
.cost-preview { margin-bottom: 1rem; font-size: 1.1rem; }
</style>