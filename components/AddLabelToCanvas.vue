<script setup lang="ts">
import { ref, defineExpose } from 'vue';
import {
  annotation,
  LabelTool,
  ToolGroupManager,
  Enums as csToolsEnums,
} from '@cornerstonejs/tools';
import type { StackViewport } from '@cornerstonejs/core';

const props = defineProps<{
  cornerstoneElement: HTMLElement | null;
  renderingEngineRef: any;
  viewportId: string;
  toolGroupId: string;
}>();

const currentWorldPosRef = ref<number[] | null>(null);
const currentImageIdRef = ref<string | null>(null);

function triggerAddLabel(label: string) {
  const viewport = props.renderingEngineRef?.getViewport(props.viewportId) as StackViewport;
  const toolGroup = ToolGroupManager.getToolGroup(props.toolGroupId);
  if (!viewport || !toolGroup || !label) return;

  const canvas = viewport.getCanvas();
  const rect = canvas.getBoundingClientRect();
  const centerCoords: [number, number] = [
    rect.width / 2,
    rect.height / 2,
  ];

  const worldPos = viewport.canvasToWorld(centerCoords);
  const imageId = viewport.getCurrentImageId();
  currentWorldPosRef.value = worldPos;
  currentImageIdRef.value = imageId;
  annotation.state.addAnnotation(
    {
      metadata: {
        toolName: LabelTool.toolName,
        viewPlaneNormal: viewport.getCamera().viewPlaneNormal,
        viewUp: viewport.getCamera().viewUp,
        referencedImageId: imageId,
      },
      data: {
        label,
        text: label,
        handles: {
          points: [worldPos as any],
          activeHandleIndex: null,
        },
      },
    },
    LabelTool.toolName
  );

  toolGroup.setToolActive(LabelTool.toolName, {
    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
  });
  toolGroup.setToolPassive(LabelTool.toolName);
  viewport.render();
}

defineExpose({ triggerAddLabel });
</script>

<template>
  <div style="display: none"></div>
</template>
