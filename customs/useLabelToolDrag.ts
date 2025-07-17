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
  const firstClick = 500;
  const secondClick = 2000;
  const isDragging = ref(false);
  const dragStart = ref<[number, number] | null>(null);
  const AddLabel = () => {
   
    const anns = annotation.state.getAllAnnotations();
    if(customlabel.value === false){
      return
    }
    const viewport = renderingEngineRef.value?.getViewport(viewportId);
    anns.forEach((ann: any) => {
      const toolName = ann?.metadata?.toolName;
      const labelEmpty = !ann?.data?.label || ann.data.label.trim() === "";
      const isAllow = ['Length', 'RectangleROI', 'EllipticalROI', 'Angle', 'Label', 'SplineROI', 'CobbAngle', 'Bidirectional'].includes(toolName);
      if (isAllow && labelEmpty && !ann.data.hasCustomLabel) {
        const label = currentCustomLabel.value || "";
        ann.data.label = label;
        ann.data.hasCustomLabel = true;
        ann.metadata.label = label;
        const mainUID = ann.annotationUID;
        const p1 = ann.data.handles.points[1];
        const worldPos = [
          p1[0] + 12.0,
          p1[1] - 4.0,
          p1[2] 
        ];

        const imageId = viewport.getCurrentImageId();
        //console.log(worldPos);
        const labelAnn = {
          metadata: {
            toolName: LabelTool.toolName,
            referencedImageId: imageId,
            viewPlaneNormal: viewport.getCamera().viewPlaneNormal,
            viewUp: viewport.getCamera().viewUp,
          },
          data: {
            label,
            text: label,
            handles: {
              points: [worldPos]as any,
              activeHandleIndex: null,
            },
          },
          highlighted: true,
        invalidated: false,
        isLocked: false,
        isSelected: true,
        isVisible: true,
        };
        const labelUID = annotation.state.addAnnotation(
          labelAnn,
          LabelTool.toolName
        );
        measurementMap.set(mainUID, labelUID);
        viewport.render();
      }
    });
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
      const handlePointerUp = (clientX: number, clientY: number) => {
        const now = Date.now();
        const [startX, startY] = dragStart.value || [0, 0];
        const distance = Math.sqrt(
          (clientX - startX) ** 2 + (clientY - startY) ** 2
        );
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
      const resetState = () => {
        currentCustomLabel.value = null;
        customlabel.value = false;
        clickCount = 0;
        isDragging.value = false;
        dragStart.value = null;
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
      //console.log(changedAnn)
      const changedUID = changedAnn.annotationUID;
      const viewport = renderingEngineRef.value?.getViewport(viewportId);
      if (measurementMap.has(changedUID)) {
        const labelUID = measurementMap.get(changedUID)!;
        const labelAnn = annotation.state.getAnnotation(labelUID);
        const p1 = changedAnn.data.handles?.points?.[1];
        const newPos = [
          p1[0] + 12.0,
          p1[1] - 4.0,
          p1[2] ,
        ];
        labelAnn.data.handles.points[0] = [...newPos] as any;
        viewport?.render();
      }
    });
  });
  return {
    prevTool: prevToolRef,
  };
}
