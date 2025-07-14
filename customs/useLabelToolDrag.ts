import { ref, watch, type Ref } from 'vue';
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
  prevToolRef: Ref<string | null>,
  currentCustomLabel: Ref<string | null>,
  customlabel: Ref<boolean>
) {
  const currentWorldPosRef = ref<number[] | null>(null);
  const currentImageIdRef = ref<string | null>(null);
  let lastClickTime = 0;
  let clickCount = 0;
  const MIN_THRESHOLD = 500;
  const MAX_THRESHOLD = 2000;
  const isDragging = ref(false);
  const dragStart = ref<[number, number] | null>(null);
  const shouldAddLabel = () => {
    const anns = annotation.state.getAllAnnotations();
    return anns.some((ann: any) => {
      const toolName = ann?.metadata?.toolName;
      if (toolName && ['Length', 'Angle', 'EllipticalROI'].includes(toolName)) {
        const label = ann?.data?.label;
        const isAlreadyCustom = ann?.data?.hasCustomLabel === true;
        const isLabelEmpty = typeof label === 'string' && label === '';
        if (isLabelEmpty && !isAlreadyCustom) return true;
      }
      return false;
    });
  };
  const AddLabel = () => {
    const anns = annotation.state.getAllAnnotations();
    const viewport = renderingEngineRef.value?.getViewport(viewportId);
    //const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
    anns.some((ann: any) => {
      const toolName = ann?.metadata?.toolName;
      if (toolName && ['Length', 'Angle', 'EllipticalROI'].includes(toolName)) {
        const labelEmpty = !ann?.data?.label || ann.data.label.trim() === '';
        //const isAlreadyCustom = ann?.data?.hasCustomLabel === true;
        if (labelEmpty) {
          ann.data.label = currentCustomLabel.value;
          ann.data.text = currentCustomLabel.value;
          ann.metadata.label = currentCustomLabel.value;
          ann.data.hasCustomLabel = true;
          // const data =ann.data.cachedStats["imageId:dicomfile:0?frame=1"]
          // data.append(currentCustomLabel.value)
        }
        viewport.render()
      }
      const anns = annotation.state.getAllAnnotations();
      console.log(anns)
    });
  };
  
  // const triggerLabelInput = (event: MouseEvent) => {
  //   const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
  //   const viewport = renderingEngineRef.value?.getViewport(viewportId) as StackViewport;
  //   if (!viewport || !toolGroup) return;
  //   let activeTool = prevToolRef.value;
  //   let label = currentCustomLabel.value;
  //   const isCustomTool = activeTool?.endsWith('_custom') ?? false;
  //   if (isCustomTool) {
  //     activeTool = activeTool!.replace('_custom', '');
  //   }
  //   label = label ?? activeTool ?? null;
  //   if (!label) return;
  //   const allowedTools = ['Length', 'Angle', 'EllipticalROI'];
  //   if (!allowedTools.includes(activeTool!)) return;
  //   if (!currentCustomLabel.value && !shouldAddLabel()) return;
  //   AddLabel();
  //   const canvas = viewport.getCanvas();
  //   const rect = canvas.getBoundingClientRect();
  //   const coords: [number, number] = [
  //     event.clientX - rect.left,
  //     event.clientY - rect.top,
  //   ];
  //   const worldPos = viewport.canvasToWorld(coords);
  //   const imageId = viewport.getCurrentImageId();
  //   currentWorldPosRef.value = worldPos;
  //   currentImageIdRef.value = imageId;
  //   onLabelSubmit(label);
  // };
  const onLabelSubmit = (label: string) => {
    if (!customlabel.value) return;
    const worldPos = currentWorldPosRef.value;
    const imageId = currentImageIdRef.value;
    const viewport = renderingEngineRef.value?.getViewport(viewportId);
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
    if (!label || !imageId || !worldPos || !viewport || !toolGroup) return;
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
    
    currentCustomLabel.value = null;
    customlabel.value = false;
    clickCount = 0;
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
        const now = Date.now();
        const [startX, startY] = dragStart.value || [0, 0];
        const distance = Math.sqrt(
          Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2)
        );
        if (isDragging.value && distance > 5) {
          AddLabel()
          resetState();
          return;
        }
        
        if (clickCount === 0) {
          lastClickTime = now;
          clickCount = 1;
        } else {
          const timeDiff = now - lastClickTime;
          if (timeDiff >= MIN_THRESHOLD && timeDiff <= MAX_THRESHOLD) {
            AddLabel()
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
      el.addEventListener('mousedown', onMouseDown);
      el.addEventListener('mouseup', onMouseUp);
      onCleanup(() => {
        el.removeEventListener('mousedown', onMouseDown);
        el.removeEventListener('mouseup', onMouseUp);
      });
    },
    { immediate: true }
  );
  return {
    prevTool: prevToolRef,
  };
}