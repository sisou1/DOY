<script setup>
const emit = defineEmits(['end-battle'])
</script>

<template>
  <div class="battle-scene">
    <h1>⚔️ COMBAT EN COURS ⚔️</h1>
    <button @click="emit('end-battle')">Retour à la ville</button>
  </div>
</template>

<style scoped>
.battle-scene {
  width: 100vw;
  height: 100vh;
  background-color: #2c0404; /* Fond rouge sombre sanglant */
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 50; /* Au dessus de tout */
  position: absolute;
  top: 0;
  left: 0;
}
</style>