<template>
  <div class="app">
    <h1>Dawn Of You</h1>
    <GameCanvas />
  </div>
</template>

<script setup>
import GameCanvas from "./components/GameCanvas.vue";
</script>

<style>
body {
  margin: 0;
  background: #1a1a1a;
  font-family: Arial,serif;
  color: white;
}
.app {
  text-align: center;
}
</style>
