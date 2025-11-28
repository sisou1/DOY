<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  buildings: { type: Array, required: true }
})

const emit = defineEmits(['upgrade-action'])

// --- CONFIGURATION DES ZONES ---
// On définit la position du coin haut-gauche de chaque zone de 4 bâtiments (2x2)
const zoneConfig = {
  FARM: { 
    style: { top: '30%', left: '77%' } // Zone Ferme (Haut Droite)
  },
  SAWMILL: { 
    style: { top: '40%', left: '15%' } // Zone Scierie (Milieu Gauche)
  },
  IRON_MINE: { 
    style: { top: '60%', left: '45%' } // Zone Mine (Bas Milieu)
  }
}

// --- HELPERS POUR L'AFFICHAGE ---
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

// On groupe les bâtiments par type pour les injecter dans les zones
const groupedBuildings = computed(() => {
  const groups = {
    FARM: [],
    SAWMILL: [],
    IRON_MINE: []
  }
  
  // On place les vrais bâtiments
  props.buildings.forEach(b => {
    if (groups[b.type]) {
      groups[b.type].push(b)
    }
  })

  return groups
})

// --- ELEMENTS DECORATIFS ---
const decorBuildings = [
  {
    name: 'QG',
    img: '/HeadQuartersBuildings/Batiment principal.png',
    style: { top: '15%', left: '40%'},
    width: '280px' //
  },
  {
    name: 'Moulin',
    img: '/HeadQuartersBuildings/Moulin.png',
    style: { top: '10%', left: '80%' },
    width: '140px' //
  }
]

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
  <div class="scene-container">
    
    <!-- 1. Éléments Décoratifs (Arrière-plan) -->
    <div 
      v-for="(decor, index) in decorBuildings" 
      :key="'decor-'+index"
      class="decor-sprite"
      :style="{ ...decor.style, width: decor.width }"
    >
      <img :src="decor.img" :alt="decor.name" />
    </div>

    <!-- 2. Zones de Bâtiments (Grilles 2x2) -->
    <div 
      v-for="(config, type) in zoneConfig" 
      :key="type"
      class="building-zone"
      :style="config.style"
    >
      <!-- Slot 1 : Le vrai bâtiment (s'il existe) -->
      <div 
        v-if="groupedBuildings[type][0]" 
        class="building-slot interactive"
        @click="openUpgradeModal(groupedBuildings[type][0])"
      >
        <div class="level-badge">{{ groupedBuildings[type][0].level }}</div>
        <img :src="buildingImages[type]" :alt="type" />
        <div class="building-label">{{ buildingNames[type] }}</div>
      </div>
      <!-- Sinon slot vide (cas rare) -->
      <div v-else class="building-slot empty">
        <img src="/HeadQuartersBuildings/Emplacement vide.png" />
      </div>

      <!-- Slots 2, 3, 4 : Toujours vides pour l'instant -->
      <div class="building-slot empty"><img src="/HeadQuartersBuildings/Emplacement vide.png" /></div>
      <div class="building-slot empty"><img src="/HeadQuartersBuildings/Emplacement vide.png" /></div>
      <div class="building-slot empty"><img src="/HeadQuartersBuildings/Emplacement vide.png" /></div>
    </div>

    <!-- MODALE UPGRADE -->
    <div v-if="selectedBuilding" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <h3>Améliorer {{ buildingNames[selectedBuilding.type] }}</h3>
        
        <div v-if="isLoadingStats" class="loading">Chargement...</div>
        
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
  position: absolute;
  top: 60px; left: 0; width: 100vw; height: calc(100vh - 60px);
  background-image: url('/HeadQuartersBuildings/Fond.png');
  background-size: cover; background-position: center;
  z-index: 10; overflow: hidden;
}

/* --- STYLES DES ZONES --- */
.building-zone {
  position: absolute;
  display: grid;
  grid-template-columns: 1fr 1fr; /* Grille 2 colonnes */
  grid-template-rows: 1fr 1fr;    /* Grille 2 lignes */
  gap: 10px; /* Espacement entre les bâtiments de la zone */
  width: 260px; /* Largeur totale de la zone (2 * 120px + gap) */
}

.building-slot {
  width: 120px;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.building-slot img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: filter 0.2s, transform 0.2s;
}

/* Slot vide : Image brute, pas de grisaille, pas de clic */
.empty img {
  /* Aucune modification, on affiche l'image telle quelle */
  filter: none;
  opacity: 1;
}

/* Slot interactif (Vrai bâtiment) */
.interactive { cursor: pointer; }
.interactive img { filter: drop-shadow(0 5px 10px rgba(0,0,0,0.7)); }
.interactive:hover img { filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.6)); transform: scale(1.05); }

/* Décor (QG, Moulin) */
.decor-sprite { position: absolute; display: flex; flex-direction: column; align-items: center; }
.decor-sprite img { width: 100%; height: auto; filter: drop-shadow(0 5px 10px rgba(0,0,0,0.5)); }

/* --- UI ELEMENTS --- */
.level-badge { position: absolute; top: 0; right: 0; background: #e6c200; color: black; font-weight: bold; border-radius: 50%; width: 25px; height: 25px; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.5); z-index: 2; }
.building-label { background: rgba(0,0,0,0.6); color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.8rem; position: absolute; bottom: -10px; opacity: 0; transition: opacity 0.2s; pointer-events: none; white-space: nowrap; z-index: 5; }
.interactive:hover .building-label { opacity: 1; }

/* --- MODALE (Inchangé) --- */
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
.diff { font-size: 0.8rem; color: #888; margin-left: 5px; }
.wood-cost { color: #e6c200; font-weight: bold; font-size: 1.1rem; }
.cost-preview { margin-bottom: 1rem; font-size: 1.1rem; }
.loading { color: #aaa; margin: 2rem 0; font-style: italic; }
.error-msg { color: #ff5252; }
</style>