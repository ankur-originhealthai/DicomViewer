import { ref, watch } from "vue";
import type { Ref } from "vue";

import {
  annotation,
  LabelTool,
  ToolGroupManager,
  Enums as csToolsEnums,
} from "@cornerstonejs/tools";

import type { StackViewport } from "@cornerstonejs/core";

export function useLabelTool(
  cornerstoneElement: Ref<HTMLElement | null>,
  renderingEngineRef: Ref<any>,
  viewportId: string,
  toolGroupId: string,
  isMagnifyVisible: Ref<boolean>
) {
  const labelInputVisible = ref(false);
  const labelInputCoords = ref({ x: 0, y: 0 });
  const labelInputValue = ref("");
  const currentWorldPosRef = ref<number[] | null>(null);
  const currentImageIdRef = ref<string | null>(null);
  const prevToolRef = ref<string | null>(null);

  const handler = (event: MouseEvent) => {
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
    const viewport = renderingEngineRef.value?.getViewport(
      viewportId
    ) as StackViewport;
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

    currentWorldPosRef.value = worldPos;
    currentImageIdRef.value = imageId;

    labelInputCoords.value = { x: event.clientX, y: event.clientY };
    labelInputValue.value = "";
    labelInputVisible.value = true;
  };

  watch(
    cornerstoneElement,
    (el, _, onCleanup) => {
      if (!el) return;
      el.addEventListener("dblclick", handler);
      onCleanup(() => {
        el.removeEventListener("dblclick", handler);
      });
    },
    { immediate: true }
  );

  const onLabelSubmit = () => {
    const worldPos = currentWorldPosRef.value;
    const imageId = currentImageIdRef.value;
    const viewport = renderingEngineRef.value?.getViewport(viewportId);
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);

    if (
      !labelInputValue.value ||
      !imageId ||
      !worldPos ||
      !viewport ||
      !toolGroup
    ) {
      return;
    }

    const { viewPlaneNormal, viewUp } = viewport.getCamera();

    const normal = [viewPlaneNormal[0], viewPlaneNormal[1], viewPlaneNormal[2]] as [number, number, number];
    const up = [viewUp[0], viewUp[1], viewUp[2]] as [number, number, number];

    annotation.state.addAnnotation(
      {
        metadata: {
          toolName: LabelTool.toolName,
          viewPlaneNormal: normal,
          viewUp: up,
          referencedImageId: imageId,
          FrameOfReferenceUID: viewport.getFrameOfReferenceUID?.(),
        },
        data: {
          text: labelInputValue.value,
          handles: {
            points: [worldPos as [number, number, number]],
            activeHandleIndex: null,
          },
          label: labelInputValue.value
        },
        highlighted: true,
        invalidated: false,
        isLocked: false,
        isSelected: true,
        isVisible: true,
      },
      LabelTool.toolName
    );

    toolGroup.setToolActive(LabelTool.toolName, {
      bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
    });
    toolGroup.setToolPassive("Label");

    const container = cornerstoneElement.value;
    if (container) {
      container.style.cursor = "auto";
    }

    viewport.render();

    labelInputVisible.value = false;
    labelInputValue.value = "";
  };

  const onLabelCancel = () => {
    if (prevToolRef.value === "Magnifier") {
      isMagnifyVisible.value = true;
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
