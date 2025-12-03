<script setup>
import HeadquartersView from './HeadquartersView.vue'
import ArmyView from './ArmyView.vue'

defineProps({
  buildings: Array,
  heroes: Array
})

const emit = defineEmits(['upgrade-action', 'refresh-request'])
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
    <ArmyView :heroes="heroes" />
  </div>
</template>

<style scoped>
.city-scene {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>