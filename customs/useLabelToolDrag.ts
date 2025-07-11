import { ref, watch } from 'vue';
import type { Ref } from 'vue';
import {
  annotation,
  LabelTool,
  ToolGroupManager,
  Enums as csToolsEnums,
} from '@cornerstonejs/tools';
import type { StackViewport } from '@cornerstonejs/core';
export function useLabelToolDrag(
  cornerstoneElement: Ref<HTMLElement | null>,
  renderingEngineRef: Ref<any>,
  viewportId: string,
  toolGroupId: string,
  isMagnifyVisible: Ref<boolean>,
  prevTool: string | null
) {
  const currentWorldPosRef = ref<number[] | null>(null);
  const currentImageIdRef = ref<string | null>(null);
  //const prevToolRef = ref<string | null>(null);
  let clickCount = 0;
  let clickTimeout: any = null;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  const resetClickState = () => {
    clickCount = 0;
    clearTimeout(clickTimeout);
    clickTimeout = null;
  };
  const triggerLabelInput = (event: MouseEvent) => {
    
    console.log(prevTool)
    //if (!['Length', 'Angle', 'EllipticalROI'].includes(prevTool || '')) return;
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
    const viewport = renderingEngineRef.value?.getViewport(viewportId) as StackViewport;
    if (!viewport || !toolGroup) return;
    if (isMagnifyVisible.value) {
      isMagnifyVisible.value = false;
    }
    const canvas = viewport.getCanvas();
    const rect = canvas.getBoundingClientRect();
    const coords: [number, number] = [
      event.clientX - rect.left,
      event.clientY - rect.top,
    ];
    const worldPos = viewport.canvasToWorld(coords);
    const imageId = viewport.getCurrentImageId();

    console.log(worldPos);
    console.log(imageId)
    currentWorldPosRef.value = worldPos;
    currentImageIdRef.value = imageId;
    onLabelSubmit();
  };
  const onLabelSubmit = () => {
    const worldPos = currentWorldPosRef.value;
    const imageId = currentImageIdRef.value;
    const viewport = renderingEngineRef.value?.getViewport(viewportId);
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
    const label = prevTool;
    //if (!label || !imageId || !worldPos || !viewport || !toolGroup) return;
    annotation.state.addAnnotation(
      {
        metadata: {
          toolName: LabelTool.toolName,
          viewPlaneNormal: viewport.getCamera().viewPlaneNormal,
          viewUp: viewport.getCamera().viewUp,
          referencedImageId: imageId,
        },
        data: {
          text: "abc",
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
    const previousTool = prevTool;
    if (previousTool !== null) {
      if (
        ['Length', 'RectangleROI', 'EllipticalROI', 'Angle', 'Label'].includes(previousTool) &&
        isMagnifyVisible.value === false
      ) {
        isMagnifyVisible.value = true;
      } else if (
        isMagnifyVisible.value &&
        ['Pan', 'Zoom', 'WindowLevel'].includes(previousTool)
      ) {
        isMagnifyVisible.value = false;
      }
    }
    if (previousTool && previousTool !== LabelTool.toolName) {
      toolGroup.setToolActive(previousTool, {
        bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
      });
    }
    viewport.render();
    prevTool = null;
  };
  watch(
    cornerstoneElement,
    (el, _, onCleanup) => {
      if (!el) return;
      console.log(el)
      const onMouseDown = (e: MouseEvent) => {
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
      };
      const onMouseMove = (e: MouseEvent) => {
        const dx = Math.abs(e.clientX - startX);
        const dy = Math.abs(e.clientY - startY);
        if (dx > 5 || dy > 5) {
          isDragging = true;
        }
      };
      console.log(clickCount)
      const onMouseUp = (e: MouseEvent) => {
        if (isDragging) {
          resetClickState();
          triggerLabelInput(e);
          return;
        }
        clickCount++;
        if (clickCount === 1) {
          clickTimeout = setTimeout(() => {
            resetClickState();
          }, 1000);
        }
        if (clickCount === 2) {
           console.log(clickCount)
          resetClickState();
          triggerLabelInput(e);
        }
      };
      el.addEventListener('mousedown', onMouseDown);
      el.addEventListener('mousemove', onMouseMove);
      el.addEventListener('mouseup', onMouseUp);
      onCleanup(() => {
        el.removeEventListener('mousedown', onMouseDown);
        el.removeEventListener('mousemove', onMouseMove);
        el.removeEventListener('mouseup', onMouseUp);
      });
    },
    { immediate: true }
  );
  return {
    prevTool,
  };
}