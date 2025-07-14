<script setup lang="ts">
import { defineProps, watch, nextTick } from 'vue';

const props = defineProps<{
  visible: boolean;
  coords: { x: number; y: number };
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}>();

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      await nextTick();
      const input = document.getElementById('label-input');
      input?.focus();
    }
  }
);
</script>

<template>
  <div
    v-if="visible"
    :style="{
      position: 'fixed',
      top: coords.y + 'px',
      left: coords.x + 'px',
      zIndex: 1000
    }"
  >
    <input
      id="label-input"
      type="text"
      class="w-48 px-3 py-1 text-yellow-400 placeholder-yellow-300 bg-transparent font-['Roboto'] text-sm focus:outline-none"
      :value="value"
      placeholder="Enter label and press Enter"
      @input="(e) => onChange((e.target as HTMLInputElement).value)"
      @keydown.enter.prevent="onSubmit"
      @keydown.esc.prevent="onClose"
      @blur="onClose"
    />
  </div>
</template>