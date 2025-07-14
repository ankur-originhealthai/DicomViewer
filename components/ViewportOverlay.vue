<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

const props = defineProps<{
  elementRef: HTMLElement | null;
  isMagnifyVisible: boolean;
  zoomFactor: number;
}>();

const emit = defineEmits<{
  (e: 'update:zoomFactor', value: number): void;
}>();
</script>

<template>
 
    
    

    <div
      v-if="isMagnifyVisible"
      class="absolute top-40 right-100 z-50 flex flex-col items-center space-y-2 pointer-events-none"
    >
      <div class="relative w-[200px] h-[200px]">
        <canvas
          id="zoom-canvas"
          width="200"
          height="200"
          class="absolute top-0 left-0 w-full h-full border border-white bg-black rounded"
        />
        <div
          id="zoom-svg-layer"
          class="absolute top-0 left-0 w-full h-full"
          style="pointer-events: none"
        />
      </div>

      <div
        class="flex items-center gap-2 bg-neutral-800 px-2 py-1 rounded pointer-events-auto text-white"
      >
        <label for="zoomRange" class="text-xs">Zoom:</label>
        <input
          id="zoomRange"
          type="range"
          min="1"
          max="5"
          step="0.1"
          :value="zoomFactor"
          @input="(e) => emit('update:zoomFactor', parseFloat((e.target as HTMLInputElement).value))"
          class="w-32 accent-yellow-400"
        />
        <span class="text-yellow-300 text-sm font-mono">{{ zoomFactor.toFixed(1) }}x</span>
      </div>
    </div>

</template>