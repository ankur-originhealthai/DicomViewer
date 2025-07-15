<template>
  <div class="flex flex-wrap justify-center items-center gap-5">

    <div class="flex flex-col items-center">
      <button
        @click="() => handleToolChange('WindowLevel')"
        class="tool-btn"
      >
        <Icon name="mdi:brightness-6" class="w-6 h-6" />
      </button>
      <span class="text-xs mt-1 text-gray-300">Window</span>
    </div>

    <div
      v-for="{ name, onClick, label } in playbackButtons"
      :key="label"
      
      class="flex flex-col items-center "
    >
      <button @click="onClick" class="tool-btn disabled:opacity-50 disabled:cursor-not-allowed" :disabled="frameCount === 1">
        <Icon :name="name" class="w-6 h-6" />
      </button>
      <span class="text-xs mt-1 text-gray-300">{{ label }}</span>
    </div>

    
    <div class="flex flex-col items-center">
      <select
        @change="(e) => handleSpeedChange(Number((e.target as HTMLSelectElement).value))"
        class="tool-btn disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="frameCount === 1"
      >
        <option value="0.5">0.5x</option>
        <option value="1" selected>1x</option>
        <option value="1.5">1.5x</option>
        <option value="2">2x</option>
      </select>
      <span class="text-xs mt-1 text-gray-300">Speed</span>
    </div>

    <div class="flex flex-col items-center">
      <button
        @click="() => captureDicom(elementRef, frameIndex)"
        class="tool-btn"
      >
        <Icon name="mdi:camera-outline" class="w-6 h-6" />
      </button>
      <span class="text-xs mt-1 text-gray-300">Capture</span>
    </div>
  </div>
</template>



<script setup lang="ts">
const props = defineProps<{
  handleToolChange: (tool: string) => void,
  playbackButtons: { name: string, onClick: () => void, label: string }[],
  handleSpeedChange: (value: number) => void,
  captureDicom: (elementRef: any, frameIndex: number) => void,
  elementRef: any,
  frameIndex: number,
  frameCount: number
}>()
</script>
