<template>
  <div id="app">
    <canvas ref="pixiCanvas"></canvas>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import * as PIXI from 'pixi.js';

export default defineComponent({
  setup() {
    const pixiCanvas = ref<HTMLCanvasElement | null>(null);

    onMounted(() => {
      if (!pixiCanvas.value) return;

      const app = new PIXI.Application({
        view: pixiCanvas.value,
        width: 800,
        height: 600,
        backgroundColor: 0x1099bb,
      });

      // Exemple : un cercle rouge
      const graphics = new PIXI.Graphics();
      graphics.beginFill(0xff0000);
      graphics.drawCircle(400, 300, 50);
      graphics.endFill();

      app.stage.addChild(graphics);
    });

    return { pixiCanvas };
  },
});
</script>

<style>
#app {
  width: 100vw;
  height: 100vh;
  margin: 0;
  overflow: hidden;
}
canvas {
  display: block;
}
</style>
