<template>
  <div class="flex justify-center items-center gap-4 flex-wrap mt-5">

    <div class="flex flex-col items-center w-16">
      <button @click="undo" 
        class="tool-btn h-15 w-15 disabled:opacity-50 disabled:cursor-not-allowed">
        <Icon name="mdi:undo" class="w-9 h-9" />
      </button>
      <span class="text-xs mt-1 text-gray-400">Undo</span>
    </div>

    <div class="flex flex-col items-center w-16">
      <button @click="redo" class="tool-btn h-15 w-15 disabled:opacity-50 disabled:cursor-not-allowed">
        <Icon name="mdi:redo" class="w-10 h-6" />
      </button>
      <span class="text-xs mt-1 text-gray-400">Redo</span>
    </div>

    <div class="flex flex-col items-center w-16">
      <button @click="reset" 
        class="tool-btn h-15 w-15 disabled:opacity-50 disabled:cursor-not-allowed">
        <Icon name="mdi:restore" class="w-6 h-6" />
      </button>
      <span class="text-xs mt-1 text-gray-400">Reset</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { annotation } from '@cornerstonejs/tools';

const props = defineProps<{
  undo: () => void
  redo: () => void
  reset: () => void
  undostack: []
  redostack: []
}>()



</script>
