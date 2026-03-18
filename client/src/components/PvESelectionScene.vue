<script setup>
import { onMounted, ref } from 'vue'

const emit = defineEmits(['start-pve', 'back-home'])

const presets = ref([])
const loading = ref(false)
const errorMessage = ref('')

const fetchPresets = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await fetch('http://localhost:3000/game/battle/pve-presets', {
      credentials: 'include'
    })
    const data = await response.json()
    if (!data.success) {
      errorMessage.value = data.message || 'Impossible de charger les ennemis.'
      return
    }
    presets.value = data.presets || []
  } catch (e) {
    console.error(e)
    errorMessage.value = 'Erreur serveur.'
  } finally {
    loading.value = false
  }
}

const startBattle = async (presetId) => {
  try {
    const response = await fetch(`http://localhost:3000/game/battle/start-pve?presetId=${encodeURIComponent(presetId)}`, {
      method: 'POST',
      credentials: 'include'
    })
    const data = await response.json()
    if (data.success) {
      emit('start-pve', data.battle.id)
      return
    }
    alert('Impossible de lancer le combat : ' + (data.message || 'Erreur inconnue'))
  } catch (e) {
    console.error(e)
    alert('Erreur serveur')
  }
}

onMounted(fetchPresets)
</script>

<template>
  <div class="pve-selection">
    <h1>Choisir un Adversaire</h1>

    <div v-if="loading" class="state">Chargement...</div>
    <div v-else-if="errorMessage" class="state error">{{ errorMessage }}</div>
    <div v-else class="enemy-grid">
      <div v-for="preset in presets" :key="preset.id" class="enemy-card">
        <img src="/Heroes/Goblin.png" alt="Enemy" class="enemy-main-img" />
        <h3>{{ preset.name }}</h3>
        <button @click="startBattle(preset.id)" class="btn-attack">ATTAQUER</button>
      </div>
    </div>

    <button @click="emit('back-home')" class="btn-back">Retour a la ville</button>
  </div>
</template>

<style scoped>
.pve-selection {
  width: 100vw;
  height: 100vh;
  background-color: #1a1a1a;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 40;
  position: absolute;
  top: 0;
  left: 0;
  padding: 24px;
}

.state {
  margin: 18px 0;
  color: #d8d8d8;
}

.state.error {
  color: #ff9d9d;
}

.enemy-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: center;
  width: min(900px, 94vw);
}

.enemy-card {
  background: #333;
  padding: 16px;
  border-radius: 10px;
  border: 2px solid #555;
  width: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.enemy-card h3 {
  margin: 10px 0 12px;
  min-height: 44px;
}

.enemy-main-img {
  width: 92px;
  height: 92px;
  border-radius: 50%;
  border: 2px solid #c0392b;
  object-fit: cover;
}

.btn-attack {
  background: #c0392b;
  color: white;
  border: none;
  padding: 10px 20px;
  font-weight: bold;
  cursor: pointer;
  width: 100%;
}

.btn-attack:hover {
  background: #e74c3c;
}

.btn-back {
  margin-top: 16px;
  background: transparent;
  border: 1px solid #666;
  color: #ccc;
  padding: 8px 16px;
  cursor: pointer;
}
</style>
