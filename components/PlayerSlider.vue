
<template>
  <div class="flex justify-center items-center gap-4 flex-wrap my-4">
    
    <input type="range" :min="0" :max="frameCount > 1 ? frameCount - 1 : 0" :value="frameCount > 1 ? frameIndex : 0"
      @input="(e) => handleFrameChange(Number((e.target as HTMLInputElement).value))" 
      class="range-slider h-10 disabled:opacity-50 disabled:cursor-not-allowed" :disabled="frameCount <= 1"/>
     

    
    <div v-if="isBookmarked" class="relative w-full -mt-12 -mb-1">
      <div v-for="(b, i) in bookmarkarray" :key="i" @click="() => handleFrameChange(b)"
        class="absolute px-1 mx-1 w-1 h-3 bg-yellow-300 rounded-full border-2 border-yellow-600 shadow-md cursor-pointer hover:scale-110 transition-transform duration-150"
        :style="{ left: `${(b / (frameCount - 1)) * 100}%`, top: '-4px', transform: 'translateX(-50%)' }"
        :title="`Go to frame ${b + 1}`" />
    </div>

   
    <div class="text-sm text-gray-400">
      {{ frameCount > 1
        ? `${String(Math.floor(frameIndex / 30)).padStart(2, '0')}:${String(frameIndex % 30).padStart(2, '0')}`
        : '00:00' }}
    </div>
  </div>
</template>

<script setup lang="ts">

const props = defineProps<{
  handleFrameChange: (index: number) => void,
  frameIndex: number,
  frameCount: number,
  isBookmarked: boolean,
  bookmarkarray: number[]
}>()

 
</script>
