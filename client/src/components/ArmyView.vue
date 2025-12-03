<script setup>
defineProps({
  heroes: {
    type: Array,
    default: () => []
  }
})

// Configuration des images par type
// Si tu ajoutes 'ARCHER' plus tard, tu ajouteras une ligne ici
const heroImages = {
  WARRIOR: '/Heroes/Warrior.png', 
  // ARCHER: '/Heroes/Archer.png',
}

const getHeroImage = (type) => {
  return heroImages[type] || '/Heroes/Warrior.png' // Image par défaut si type inconnu
}
</script>

<template>
  <div class="army-view">
    <h2>Mon Armée</h2>

    <div v-if="heroes.length === 0" class="no-army">
      Aucun héros recruté.
    </div>

    <div class="heroes-list">
      <div v-for="hero in heroes" :key="hero.id" class="hero-card">
        
        <!-- EN-TÊTE : IMAGE + NOM -->
        <div class="hero-header">
          <img :src="getHeroImage(hero.type)" class="hero-avatar" alt="Hero icon" />
          <div class="hero-info">
            <span class="hero-name">{{ hero.name }}</span>
            <!-- J'ai retiré l'affichage du TYPE ici comme demandé -->
          </div>
        </div>

        <!-- STATS -->
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
          <!-- MODIFICATION ICI : Ajout d'une classe pour la taille -->
          <span class="troops-text">{{ hero.troops }} / {{ hero.maxTroops }} Troupes</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.army-view {
  position: absolute;
  top: 80px; /* Juste sous la TopBar */
  left: 20px; /* MODIFICATION : right -> left pour le mettre à gauche */
  width: 270px; /* MODIFICATION : 300px -> 270px (-10%) */
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid #444;
  padding: 15px;
  border-radius: 8px;
  color: white;
  pointer-events: auto; 
  z-index: 20;
}

h2 {
  margin-top: 0;
  font-size: 1.2rem;
  border-bottom: 1px solid #555;
  padding-bottom: 10px;
  margin-bottom: 15px;
  text-align: center;
}

.hero-card {
  background: #222;
  border: 1px solid #555;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px; /* Espacement entre les sections de la carte */
}

/* --- NOUVEAU DESIGN HEADER --- */
.hero-header {
  display: flex;
  align-items: center;
  gap: 12px; /* Espace entre l'image et le nom */
  margin-bottom: 5px;
}

.hero-avatar {
  width: 50px;  /* Taille de l'avatar */
  height: 50px;
  border-radius: 8px; /* Coins arrondis */
  object-fit: cover;
  border: 2px solid #555;
  background: #111;
}

.hero-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.hero-name {
  font-weight: bold;
  font-size: 1.1rem;
  color: #fff;
}

/* --- STATS --- */
.hero-stats {
  display: flex;
  gap: 15px;
  padding-left: 2px; /* Petit alignement visuel */
}

.stat {
  display: flex;
  gap: 5px;
  font-size: 0.9rem;
}

.label {
  color: #fbbf24; /* Jaune/Or */
  font-weight: bold;
}

/* --- BARRE DE VIE --- */
.hero-troops {
  font-size: 0.9rem;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #444;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}

.fill {
  height: 100%;
  background: #ef4444; /* Rouge sang */
  transition: width 0.3s ease;
}

.troops-text {
  font-size: 1rem; /* MODIFICATION : 0.8rem -> 1rem pour grossir le texte */
  font-weight: bold; /* Petit bonus de lisibilité */
  color: #ccc;
}
</style>