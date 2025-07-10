<script lang="ts" setup>
import {
  init as csCoreInit,
  RenderingEngine,
  Enums,
  type StackViewport,
} from '@cornerstonejs/core';
import {
  init as dicomLoaderInit,
  wadouri,
} from '@cornerstonejs/dicom-image-loader';
const elementRef = ref<HTMLDivElement | null>(null);
const renderingEngineId = 'myRenderingEngine';
const viewportId = 'CT_STACK';
const renderingEngineRef = ref<RenderingEngine | null>(null);
csCoreInit();
dicomLoaderInit();
const onFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  const file = input.files[0];
  const imageId = wadouri.fileManager.add(file);
  loadAndViewImage(imageId);
};
async function loadAndViewImage(imageId: string) {
  const element = elementRef.value;
  if (!element) return;
  const renderingEngine = new RenderingEngine(renderingEngineId);
  renderingEngineRef.value = renderingEngine;
  renderingEngine.enableElement({
    viewportId,
    type: Enums.ViewportType.STACK,
    element,
  });
  const viewport = renderingEngine.getViewport(viewportId) as StackViewport;
 viewport.setStack([imageId]);
  viewport.render();
}
</script>
<template>
  <div class="w-screen h-screen">
  <div class="w-full h-full">
    <input type="file" @change="onFileChange" accept=".dcm" class="mb-2" />
    <div ref="elementRef" class="w-full h-full" />
  </div>
  </div>
</template>




