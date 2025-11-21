<template>
  <canvas ref="pixiCanvas"></canvas>
</template>

<script setup>
import { ref } from "vue";

const pixiCanvas = ref(null);
// Rien d’autre. Pas de Pixi. Pas de logique.
</script>

<style>
canvas {
  display: block;
}
</style>
