<script setup>
import HeadquartersView from './HeadquartersView.vue'
import ArmyView from './ArmyView.vue'

defineProps({
  buildings: Array,
  heroes: Array
})

// On ajoute 'watch-battle' à la liste des emits
const emit = defineEmits(['upgrade-action', 'refresh-request', 'watch-battle'])
</script>

<template>
  <div class="city-scene">
    <!-- La vue du QG -->
    <HeadquartersView
        :buildings="buildings"
        @upgrade-action="emit('upgrade-action', $event)"
        @refresh-request="emit('refresh-request')"
    />

    <!-- L'interface de l'armée -->
    <!-- On écoute l'événement et on le remonte au MainGame -->
    <ArmyView 
      :heroes="heroes" 
      @watch-battle="emit('watch-battle', $event)" 
    />
  </div>
</template>

<style scoped>
.city-scene {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>