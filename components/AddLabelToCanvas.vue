<script setup lang="ts">
import { ref, defineExpose, onMounted } from 'vue';
import {
  annotation,
  LabelTool,
  ToolGroupManager,
  Enums as csToolsEnums,
} from '@cornerstonejs/tools';
import type { StackViewport } from '@cornerstonejs/core';

const props = defineProps<{
  cornerstoneElement: HTMLElement | null;
  renderingEngineRef: any;  // Your Cornerstone RenderingEngine instance
  viewportId: string;       // Viewport ID string
  toolGroupId: string;      // ToolGroup ID string
}>();

const currentWorldPosRef = ref<number[] | null>(null);
const currentImageIdRef = ref<string | null>(null);
const toolGroupId = "myToolGroup";
function setupToolGroup() {
  const toolGroup =  ToolGroupManager.getToolGroup(toolGroupId);
  if (!toolGroup) {
    
    return null;
  }

  // Add LabelTool if not already added
  if (!toolGroup.hasTool(LabelTool.toolName)) {
    toolGroup.addTool(LabelTool.toolName);
  }

  // Set LabelTool active with primary mouse button binding
  toolGroup.setToolActive(LabelTool.toolName, {
    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
  });

  return toolGroup;
}

function triggerAddLabel(label: string) {
  if (!label) {
    console.warn('Label text is empty');
    return;
  }

  const viewport = props.renderingEngineRef?.getViewport(props.viewportId) as StackViewport;
  const toolGroup = ToolGroupManager.getToolGroup(props.toolGroupId);

  if (!viewport) {
    console.warn('Viewport not found:', props.viewportId);
    return;
  }
  if (!toolGroup) {
    console.warn('ToolGroup not found:', props.toolGroupId);
    return;
  }

  // Ensure tool is added and active
  if (!toolGroup.hasTool(LabelTool.toolName)) {
    toolGroup.addTool(LabelTool.toolName);
  }
  toolGroup.setToolActive(LabelTool.toolName, {
    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
  });

  const canvas = viewport.getCanvas();
  const rect = canvas.getBoundingClientRect();
  const centerCoords: [number, number] = [rect.width / 2, rect.height / 2];

  const worldPos = viewport.canvasToWorld(centerCoords);
  const imageId = viewport.getCurrentImageId();
  const camera = viewport.getCamera();

  if (!worldPos || worldPos.some(isNaN)) {
    console.error('Invalid world position:', worldPos);
    return;
  }
  if (!imageId) {
    console.error('No current imageId');
    return;
  }
  if (!camera?.viewPlaneNormal || !camera?.viewUp) {
    console.error('Camera properties missing');
    return;
  }

  const frameOfReferenceUID = viewport.getFrameOfReferenceUID?.();

  currentWorldPosRef.value = worldPos;
  currentImageIdRef.value = imageId;

  const normal = camera.viewPlaneNormal.map((v: number) => Number(v.toFixed(6))) as [number, number, number];
  const up = camera.viewUp.map((v: number) => Number(v.toFixed(6))) as [number, number, number];

  const annotationUID = crypto.randomUUID?.() || `${Date.now()}`;

  annotation.state.addAnnotation(
    {
      annotationUID,
      metadata: {
        toolName: LabelTool.toolName,
        viewPlaneNormal: normal,
        viewUp: up,
        referencedImageId: imageId,
        FrameOfReferenceUID: frameOfReferenceUID,
      },
      data: {
        label,
        text: label,
        handles: {
          points: [worldPos],
          activeHandleIndex: null,
        },
      },
      isVisible: true,
      isSelected: true,
    },
    LabelTool.toolName
  );

  toolGroup.setToolActive(LabelTool.toolName, {
      bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
    });
  toolGroup.setToolPassive("Label");

    // Important for image plane module images
  viewport.render();
}

// Call setup once when component is mounted
onMounted(() => {
  setupToolGroup();
});

defineExpose({ triggerAddLabel });
</script>

<template>
  <!-- Hidden div as this component does not render UI -->
  <div style="display:none"></div>
</template>
