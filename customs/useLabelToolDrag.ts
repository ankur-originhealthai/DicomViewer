import { ref, watch, type Ref, onMounted } from "vue";
import {
  annotation,
  LabelTool,
  Enums as csToolsEnums,
  ToolGroupManager,
} from "@cornerstonejs/tools";
import { eventTarget } from "@cornerstonejs/core";

const csEvents = csToolsEnums.Events;
const measurementMap = new Map<string, string>();

export function useLabelToolDrag(
  cornerstoneElement: Ref<HTMLElement | null>,
  renderingEngineRef: Ref<any>,
  viewportId: string,
  toolGroupId: string,
  isMagnifyVisible: Ref<boolean>,
  prevToolRef: Ref<string | null>,
  currentCustomLabel: Ref<string | null>,
  customlabel: Ref<boolean>
) {
  let lastClickTime = 0;
  let clickCount = 0;
  const firstClick = 500; // ms threshold for double click detection
  const secondClick = 2000;

  const isDragging = ref(false);
  const dragStart = ref<[number, number] | null>(null);

  const AddLabel = () => {
    const anns = annotation.state.getAllAnnotations();

    const viewport = renderingEngineRef.value?.getViewport(viewportId);
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
    if (!viewport || !toolGroup) {
      console.warn("Viewport or ToolGroup missing");
      return;
    }

    anns.forEach((ann: any) => {
      if (!ann || !ann.data) return;

      // If customlabel flag is false and no current label, add default
      if (customlabel.value === false && currentCustomLabel.value === null) {
        if (!ann.data.label || ann.data.label.trim() === "") {
          ann.data.label = "No label";
          ann.data.hasCustomLabel = true;
        }
      } else {
        const toolName = ann?.metadata?.toolName;
        const labelEmpty = !ann?.data?.label || ann.data.label.trim() === "";
        const allowedTools = [
          "Length",
          "RectangleROI",
          "EllipticalROI",
          "Angle",
          "Label",
          "SplineROI",
          "CobbAngle",
          "Bidirectional",
        ];

        if (allowedTools.includes(toolName) && labelEmpty && !ann.data.hasCustomLabel) {
          const label = currentCustomLabel.value || "No label";
          ann.data.label = label;
          ann.data.hasCustomLabel = true;
          ann.metadata.label = label;

          const mainUID = ann.annotationUID;
          const p1 = ann.data.handles?.points?.[0];
          if (!p1 || p1.length < 3) return;

          // Offset label position a bit for visibility
          const worldPos = [p1[0] + 12.0, p1[1] - 4.0, p1[2]];

          const imageId = viewport.getCurrentImageId();

          const labelAnn = {
  metadata: {
    toolName: LabelTool.toolName,
    referencedImageId: imageId,
    FrameOfReferenceUID: viewport.getFrameOfReferenceUID?.(),
    viewPlaneNormal: viewport.getCamera()?.viewPlaneNormal,
    viewUp: viewport.getCamera()?.viewUp,
  },
  data: {
    label,
    text: label,
    handles: {
      points: [worldPos] as any,  // make sure this is world coordinates
      activeHandleIndex: null,
    },
  },
  highlighted: true,
  invalidated: false,
  isLocked: false,
  isSelected: true,
  isVisible: true,
};

          const labelUID = annotation.state.addAnnotation(labelAnn, LabelTool.toolName);
          measurementMap.set(mainUID, labelUID);

          // Ensure LabelTool is active to see label immediately
          if (!toolGroup.hasTool(LabelTool.toolName)) {
            toolGroup.addTool(LabelTool.toolName);
          }
          toolGroup.setToolActive(LabelTool.toolName, {
            bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
          });
 toolGroup.setToolPassive("Label");
          viewport.render();
        }
      }
    });
  };

  const resetState = () => {
    currentCustomLabel.value = null;
    customlabel.value = false;
    clickCount = 0;
    isDragging.value = false;
    dragStart.value = null;
  };

  const handlePointerUp = (clientX: number, clientY: number) => {
    const now = Date.now();
    const [startX, startY] = dragStart.value || [0, 0];
    const distance = Math.sqrt((clientX - startX) ** 2 + (clientY - startY) ** 2);

    if (isDragging.value && distance > 5) {
      AddLabel();
      resetState();
      return;
    }

    if (clickCount === 0) {
      lastClickTime = now;
      clickCount = 1;
    } else {
      const timeDiff = now - lastClickTime;
      if (timeDiff >= firstClick && timeDiff <= secondClick) {
        AddLabel();
        resetState();
      } else {
        lastClickTime = now;
        clickCount = 1;
      }
    }
    isDragging.value = false;
    dragStart.value = null;
  };

  watch(
    cornerstoneElement,
    (el, _, onCleanup) => {
      if (!el) return;

      const onMouseDown = (e: MouseEvent) => {
        dragStart.value = [e.clientX, e.clientY];
        isDragging.value = true;
      };
      const onMouseUp = (e: MouseEvent) => {
        handlePointerUp(e.clientX, e.clientY);
      };
      const onTouchStart = (e: TouchEvent) => {
        const t = e.touches[0];
        if (!t) return;
        dragStart.value = [t.clientX, t.clientY];
        isDragging.value = true;
      };
      const onTouchEnd = (e: TouchEvent) => {
        const t = e.changedTouches[0];
        if (!t) return;
        handlePointerUp(t.clientX, t.clientY);
      };

      el.addEventListener("mousedown", onMouseDown);
      el.addEventListener("mouseup", onMouseUp);
      el.addEventListener("touchstart", onTouchStart, { passive: true });
      el.addEventListener("touchend", onTouchEnd, { passive: true });

      onCleanup(() => {
        el.removeEventListener("mousedown", onMouseDown);
        el.removeEventListener("mouseup", onMouseUp);
        el.removeEventListener("touchstart", onTouchStart);
        el.removeEventListener("touchend", onTouchEnd);
      });
    },
    { immediate: true }
  );

  onMounted(() => {
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
    if (toolGroup && !toolGroup.getToolInstance(LabelTool.toolName)) {
      toolGroup.addTool(LabelTool.toolName);
      toolGroup.setToolEnabled(LabelTool.toolName);
    }

    eventTarget.addEventListener(csEvents.ANNOTATION_MODIFIED, (evt: any) => {
      const changedAnn = evt.detail.annotation;
      const changedUID = changedAnn.annotationUID;
      const viewport = renderingEngineRef.value?.getViewport(viewportId);

      if (measurementMap.has(changedUID)) {
        const labelUID = measurementMap.get(changedUID)!;
        const labelAnn = annotation.state.getAnnotation(labelUID);
        const p1 = changedAnn.data.handles?.points?.[0];
        if (!p1 || !labelAnn?.data?.handles?.points) return;

        const newPos = [p1[0] + 12.0, p1[1] - 4.0, p1[2]];

        labelAnn.data.handles.points[0] = [...newPos] as any;

        viewport?.render();
      }
    });
  });

  return {
    prevTool: prevToolRef,
  };
}
