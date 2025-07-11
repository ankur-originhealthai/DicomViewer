import { ref, onMounted, onUnmounted, watch } from 'vue';
import type { Ref } from 'vue';

import {
  annotation,
  LabelTool,
  ToolGroupManager,
  Enums as csToolsEnums,
} from '@cornerstonejs/tools';
import type { StackViewport } from '@cornerstonejs/core';

export function useLabelTool(
  cornerstoneElement: Ref<HTMLElement | null>,
  renderingEngineRef: Ref<any>,
  viewportId: string,
  toolGroupId: string,
  isMagnifyVisible: Ref<boolean>,
) {
  const labelInputVisible = ref(false);
  const labelInputCoords = ref({ x: 0, y: 0 });
  const labelInputValue = ref('');
  const currentWorldPosRef = ref<number[] | null>(null);
  const currentImageIdRef = ref<string | null>(null);
  const prevToolRef = ref<string | null>(null);

  const handler = (event: MouseEvent) => {
    console.log("called")
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
    const viewport = renderingEngineRef.value?.getViewport(viewportId) as StackViewport;
    if (!viewport || !toolGroup) return;

    if (isMagnifyVisible.value) {
      isMagnifyVisible.value = (false);
    }

    const canvas = viewport.getCanvas();
    const rect = canvas.getBoundingClientRect();

    const coords: [number, number] = [
      event.clientX - rect.left,
      event.clientY - rect.top,
    ];

    const worldPos = viewport.canvasToWorld(coords);
    const imageId = viewport.getCurrentImageId();

    currentWorldPosRef.value = worldPos;
    currentImageIdRef.value = imageId;

    labelInputCoords.value = { x: event.clientX, y: event.clientY };
    labelInputValue.value = '';
    labelInputVisible.value = true;
  };

  watch(cornerstoneElement, (el, _, onCleanup) => {
    if (!el) return;
    el.addEventListener('dblclick', handler);
    onCleanup(() => {
      el.removeEventListener('dblclick', handler);
    });
  }, { immediate: true });

  const onLabelSubmit = () => {
    const worldPos = currentWorldPosRef.value;
    const imageId = currentImageIdRef.value;
    const viewport = renderingEngineRef.value?.getViewport(viewportId);
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
    if (!labelInputValue.value || !imageId || !worldPos || !viewport || !toolGroup) return;

    annotation.state.addAnnotation(
      {
        metadata: {
          toolName: LabelTool.toolName,
          viewPlaneNormal: viewport.getCamera().viewPlaneNormal,
          viewUp: viewport.getCamera().viewUp,
          referencedImageId: imageId,
        },
        data: {
          text: labelInputValue.value,
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

    const previousTool = prevToolRef.value;
    if (previousTool !== null) {
      if (
        ['Length', 'RectangleROI', 'EllipticalROI', 'Angle', 'Label'].includes(previousTool) &&
        isMagnifyVisible.value === false
      ) {
        isMagnifyVisible.value =(true);
      } else if (
        isMagnifyVisible.value &&
        ['Pan', 'Zoom', 'WindowLevel'].includes(previousTool)
      ) {
        isMagnifyVisible.value = (false);
      }
    }

    if (previousTool && previousTool !== LabelTool.toolName) {
      toolGroup.setToolActive(previousTool, {
        bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
      });
    }

    viewport.render();
    labelInputVisible.value = false;
    labelInputValue.value = '';
    prevToolRef.value = null;
  };

  const onLabelCancel = () => {
    if (prevToolRef.value === 'Magnifier') {
      isMagnifyVisible.value = (true);
    }

    labelInputVisible.value = false;
    prevToolRef.value = null;
  };

  return {
    labelInputVisible,
    labelInputCoords,
    labelInputValue,
    setLabelInputValue: (val: string) => (labelInputValue.value = val),
    setLabelInputVisible: (val: boolean) => (labelInputVisible.value = val),
    onLabelSubmit,
    onLabelCancel,
    prevToolRef,
  };
}