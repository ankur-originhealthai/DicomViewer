<template>
  <div class="h-[740px] bg-neutral-900 text-white border-l border-gray-800 p-4 overflow-y-auto">
    <h2 class="text-lg font-semibold mb-3">Measurements</h2>

    <div v-if="measurementList.length" class="h-[260px]">

      <div class="grid grid-cols-[100px_70px_1fr] text-xs text-gray-400 mb-2">
        <div>20 Meas.</div>
        <div>Value</div>
        <div>M1/M2/M3</div>
      </div>

      <div class="max-h-64 overflow-y-auto pr-1" style="scrollbar-width: none; -ms-overflow-style: none;">
        <div v-for="(item, idx) in measurementList" :key="idx"
          class="grid grid-cols-[100px_70px_1fr] text-sm py-1 items-center border-b border-gray-800 px-2">
          <div class="text-white font-medium">{{ item.label }}</div>
          <div class="text-green-700 font-semibold">{{ item.value }}</div>
          <div class="text-gray-300">{{ item.stats }}</div>
        </div>
      </div>
    </div>

    <div v-else class="text-gray-500 text-sm italic">No measurements done</div>

    <h3 class="text-sm mt-6 mb-2 font-semibold text-gray-300 bg-neutral-800 p-2">Overall Cine Evaluation</h3>
    <p class="text-xs text-neutral-300 m-1">OVERALL QUALITY CRITERIA</p>
    <ul class="space-y-2 text-sm text-gray-300 bg-neutral-800 p-2 px-3">
      <li v-for="(item, index) in cineEvaluation" :key="index" class="flex items-center bg-neutral-900 p-1"
        :class="{ 'text-yellow-500 bg-neutral-900 p-1 font-semibold': item.level === 'warning' }">
        <span class="inline-block w-3 h-3 box-full mr-5" :class="{
          'bg-green-700': item.level === 'normal',
          'bg-yellow-500': item.level === 'warning'
        }"></span>
        {{ item.label }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { annotation, Enums } from '@cornerstonejs/tools';
import { eventTarget } from '@cornerstonejs/core';
defineProps<{
  cineEvaluation: { label: string; level: 'normal' | 'warning' }[];
}>();
const measurementList = ref<{ label: string; value: string; stats: string }[]>([]);
function getMeasurementsSummary() {
  const annotations = annotation.state.getAllAnnotations();
  const summary: { label: string; value: string; stats: string }[] = [];
  annotations.forEach((ann: any) => {
    const toolName = ann?.metadata?.toolName;
    if (toolName === 'Label') return;
    const label = ann?.data?.label?.trim();
    if (!label) return;
    const data = ann.data;
    const cachedStats = data.cachedStats;
    let value = '';
    let stats = '';
    if (cachedStats && typeof cachedStats === 'object') {
      const firstKey = Object.keys(cachedStats)[0];
      if (firstKey) {
        const stat = cachedStats[firstKey];
        if (stat.length != null && stat.width != null) {
          value = `L:${stat.length.toFixed(0)} ${stat.unit} ` + " " + ` W:${stat.width.toFixed(0)} ${stat.unit} `;
          const mValues = ['M1', 'M2', 'M3']
            .map(key => stat[key])
            .filter(v => v != null)
            .map(v => v.toFixed(2));
          stats = mValues.join(' / ');
        }
        else if (stat.length != null) {
          value = `${stat.length.toFixed(0)} ${stat.unit}`;
          const mValues = ['M1', 'M2', 'M3']
            .map(key => stat[key])
            .filter(v => v != null)
            .map(v => v.toFixed(2));
          stats = mValues.join(' / ');
        } else if (stat.angle != null) {
          value = `${stat.angle.toFixed(2)}°`;
        } else if (stat.area) {
          value = `Area: ${stat.area.toFixed(2)} ${stat.areaUnit}`;
        }
      }
    }
    summary.push({ label, value, stats });
  });
  measurementList.value = summary;
}
const handler = () => {
  requestAnimationFrame(() => {
    getMeasurementsSummary();
  });
};
onMounted(() => {
  getMeasurementsSummary();
  eventTarget.addEventListener(Enums.Events.ANNOTATION_ADDED, handler);
  eventTarget.addEventListener(Enums.Events.ANNOTATION_MODIFIED, handler);
  eventTarget.addEventListener(Enums.Events.ANNOTATION_REMOVED, handler);
});
onUnmounted(() => {
  eventTarget.removeEventListener(Enums.Events.ANNOTATION_ADDED, handler);
  eventTarget.removeEventListener(Enums.Events.ANNOTATION_MODIFIED, handler);
  eventTarget.removeEventListener(Enums.Events.ANNOTATION_REMOVED, handler);
});
</script>