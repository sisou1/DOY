<script setup>
const emit = defineEmits(['start-pve', 'back-home'])

const startBattle = async () => {
  try {
    const response = await fetch('http://localhost:3000/game/battle/start-pve', {
      method: 'POST',
      credentials: 'include'
    })
    const data = await response.json()
    if (data.success) {
      // On émet l'événement avec l'ID de la bataille pour que le parent charge la BattleScene
      emit('start-pve', data.battle.id)
    } else {
      alert('Impossible de lancer le combat : ' + (data.message || 'Erreur inconnue'))
    }
  } catch (e) {
    console.error(e)
    alert('Erreur serveur')
  }
}
</script>

<template>
  <div class="pve-selection">
    <h1>Choisir un Adversaire</h1>

    <div class="enemy-card">
      <img src="/Heroes/Goblin.png" alt="Goblin" class="enemy-img" />
      <h3>Goblin Scout</h3>
      <p>Niveau 1</p>
      <button @click="startBattle" class="btn-attack">ATTAQUER</button>
    </div>

    <button @click="emit('back-home')" class="btn-back">Retour à la ville</button>
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
  top: 0; left: 0;
}

.enemy-card {
  background: #333;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  border: 2px solid #555;
  margin-bottom: 30px;
  width: 200px;
}

.enemy-img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid #c0392b;
  margin-bottom: 10px;
}

.btn-attack {
  background: #c0392b;
  color: white;
  border: none;
  padding: 10px 20px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 10px;
  width: 100%;
}

.btn-attack:hover {
  background: #e74c3c;
}

.btn-back {
  background: transparent;
  border: 1px solid #666;
  color: #ccc;
  padding: 8px 16px;
  cursor: pointer;
}
</style>