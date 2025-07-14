<template>
  <div class="fixed bottom-1 inset-x-0 bg-[#1e1e22] py-3 z-50 shadow-inner ml-32 mx-2 my-1">
    <div class="w-full max-w-[1240px] mx-auto px-6 flex justify-end gap-3">
      <button
        @click="onExit"
        class="px-5 py-2 bg-[#3b3b3f] text-white rounded-md hover:bg-[#505054] transition text-sm"
      >
        Exit
      </button>
      <button
        @click="onSave"
        class="px-5 py-2 bg-[#2563eb] text-white rounded-md hover:bg-[#3b82f6] transition text-sm"
      >
        Save As New
      </button>

      <button
        @click="onReplace"
        class="px-5 py-2 border border-[#2563eb] text-[#60a5fa] rounded-md hover:bg-[#1e3a8a] transition text-sm"
      >
        Replace Thumbnail
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'exit'): void
  (e: 'save'): void
  (e: 'replace'): void
}>()

const onExit = () => emit('exit')
const onSave = () => emit('save')
const onReplace = () => emit('replace')
</script>
