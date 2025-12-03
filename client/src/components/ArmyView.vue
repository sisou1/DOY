<script setup>
defineProps({
  heroes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['watch-battle']) // <-- On déclare l'événement
</script>

<template>
  <div class="army-view">
    <h2>Mon Armée</h2>

    <div v-if="heroes.length === 0" class="no-army">
      Aucun héros recruté.
    </div>

    <div class="heroes-list">
      <div v-for="hero in heroes" :key="hero.id" class="hero-card">
        
        <div class="hero-header">
          <!-- On utilise directement la propriété envoyée par le back -->
          <img :src="hero.imageUrl" class="hero-avatar" alt="Hero icon" />
          <div class="hero-info">
            <div class="name-row">
              <span class="hero-name">{{ hero.name }}</span>
              <span class="hero-lvl">Niv. {{ hero.level }}</span> <!-- AJOUT ICI -->
            </div>
            
            <button 
              v-if="hero.battleId" 
              class="btn-watch-battle"
              @click.stop="emit('watch-battle', hero.battleId)"
              title="Regarder le combat en cours"
            >
              ⚔️ Voir
            </button>

          </div>
        </div>

        <!-- ... reste du template inchangé ... -->
        <div class="hero-stats">
          <div class="stat">
            <span class="label">ATK</span>
            <span class="value">{{ hero.attack }}</span>
          </div>
          <div class="stat">
            <span class="label">DEF</span>
            <span class="value">{{ hero.defense }}</span>
          </div>
        </div>

        <div class="hero-troops">
          <div class="progress-bar">
            <div 
              class="fill" 
              :style="{ width: (hero.troops / hero.maxTroops * 100) + '%' }"
            ></div>
          </div>
          <span class="troops-text">{{ hero.troops }} / {{ hero.maxTroops }} Troupes</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ... styles existants ... */

/* AJOUTS POUR LE NIVEAU */
.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hero-lvl {
  font-size: 0.8rem;
  color: #e6c200; /* Doré */
  border: 1px solid #e6c200;
  padding: 1px 4px;
  border-radius: 4px;
}

/* ... le reste des styles inchangé ... */
.army-view { position: absolute; top: 80px; left: 20px; width: 270px; background: rgba(0, 0, 0, 0.8); border: 1px solid #444; padding: 15px; border-radius: 8px; color: white; pointer-events: auto; z-index: 20; }
h2 { margin-top: 0; font-size: 1.2rem; border-bottom: 1px solid #555; padding-bottom: 10px; margin-bottom: 15px; text-align: center; }
.hero-card { background: #222; border: 1px solid #555; border-radius: 6px; padding: 10px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 8px; }
.hero-header { display: flex; align-items: center; gap: 12px; margin-bottom: 5px; }
.hero-avatar { width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 2px solid #555; background: #111; }
.hero-info { display: flex; flex-direction: column;
  justify-content: center; align-items: flex-start; gap: 5px; }
.hero-name { font-weight: bold; font-size: 1.1rem; color: #fff; }
.btn-watch-battle { background: #e67e22; border: none; border-radius: 4px; color: white; font-size: 0.75rem; padding: 2px 8px; cursor: pointer; font-weight: bold; animation: pulse 1.5s infinite; }
.btn-watch-battle:hover { background: #d35400; }
@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
.hero-stats { display: flex; gap: 15px; padding-left: 2px; }
.stat { display: flex; gap: 5px; font-size: 0.9rem; }
.label { color: #fbbf24; font-weight: bold; }
.hero-troops { font-size: 0.9rem; }
.progress-bar { width: 100%; height: 6px; background: #444; border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
.fill { height: 100%; background: #ef4444; transition: width 0.3s ease; }
.troops-text { font-size: 1rem; font-weight: bold; color: #ccc; }

/* AJOUTS POUR LE NIVEAU */
.name-row { display: flex; align-items: center; gap: 8px; }
.hero-lvl { font-size: 0.8rem; color: #e6c200; border: 1px solid #e6c200; padding: 1px 4px; border-radius: 4px; }
</style>