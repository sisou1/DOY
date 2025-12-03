<script setup>
import HeadquartersView from './HeadquartersView.vue'
// ArmyView import supprimé

defineProps({
  buildings: Array
})

const emit = defineEmits(['upgrade-action', 'refresh-request']) // 'watch-battle' supprimé car géré plus haut
</script>

<template>
  <div class="city-scene">
    <!-- La vue du QG -->
    <HeadquartersView
        :buildings="buildings"
        @upgrade-action="emit('upgrade-action', $event)"
        @refresh-request="emit('refresh-request')"
    />
    
    <!-- ArmyView RETIRÉ D'ICI -->
  </div>
</template>

<style scoped>
.city-scene {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>