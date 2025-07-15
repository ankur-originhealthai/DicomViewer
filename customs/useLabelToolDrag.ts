import { ref, watch, type Ref, onMounted } from "vue";
import {
  annotation,
  LabelTool,
  Enums as csToolsEnums,
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
    const viewport = renderingEngineRef.value?.getViewport(viewportId);

    anns.forEach((ann: any) => {
      const toolName = ann?.metadata?.toolName;
      const labelEmpty = !ann?.data?.label || ann.data.label.trim() === "";
      const isAllow = ["Length", "Angle", "EllipticalROI"].includes(toolName);
      if (isAllow && labelEmpty && !ann.data.hasCustomLabel) {
        const label = currentCustomLabel.value || "";
        ann.data.label = label;
        ann.data.hasCustomLabel = true;
        ann.metadata.label = label;

        const mainUID = ann.annotationUID;
        const worldPos = ann.data.handles.points[1];
        const imageId = viewport.getCurrentImageId();

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
              points: [worldPos],
              activeHandleIndex: null,
            },
          },
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
    (el, mouse, onCleanup) => {
      if (!el) return;

      const onMouseDown = (e: MouseEvent) => {
        dragStart.value = [e.clientX, e.clientY];
        isDragging.value = true;
      };

      const onMouseUp = (e: MouseEvent) => {
        const now = Date.now();
        const [startX, startY] = dragStart.value || [0, 0];
        const distance = Math.sqrt(
          (e.clientX - startX) ** 2 + (e.clientY - startY) ** 2
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

      onCleanup(() => {
        el.removeEventListener("mousedown", onMouseDown);
        el.removeEventListener("mouseup", onMouseUp);
      });
    },
    { immediate: true }
  );

  onMounted(() => {
    eventTarget.addEventListener(csEvents.ANNOTATION_MODIFIED, (evt: any) => {
      const changedAnn = evt.detail.annotation;
      const changedUID = changedAnn.annotationUID;
      const viewport = renderingEngineRef.value?.getViewport(viewportId);
      if (measurementMap.has(changedUID)) {
        const labelUID = measurementMap.get(changedUID)!;
        const labelAnn = annotation.state.getAnnotation(labelUID);
        const newPos = changedAnn.data.handles?.points?.[1];
        labelAnn.data.handles.points[0] = [...newPos] as any;
        if (!viewport) return;
        viewport?.render();
      } //else if ([...measurementMap.values()].includes(changedUID)) {
      //   const mainUID = [...measurementMap.entries()].find(
      //     ([annotationUID, labelUID]) => labelUID === changedUID
      //   )?.[0];

      //   const mainAnn = mainUID
      //     ? annotation.state.getAnnotation(mainUID)
      //     : null;
      //   const newPos = changedAnn.data.handles?.points?.[0];
      //   mainAnn.data.handles.points[1] = [...newPos] as [
      //     number,
      //     number,
      //     number
      //   ];
      //   viewport.render();
      // }
    });
  });

  return {
    prevTool: prevToolRef,
    
  };
}
