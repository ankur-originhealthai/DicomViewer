<script lang="ts">
import { onUnmounted, watchEffect } from 'vue';
import type { Ref } from 'vue';
import {
  RenderingEngine,
  Enums,
  StackViewport,
} from '@cornerstonejs/core';
import {
  addTool,
  ToolGroupManager,
  Enums as csToolsEnums,
  LengthTool,
} from '@cornerstonejs/tools';
export function useViewportMagnifier(
  mainElementRef: Ref<HTMLElement | null>,
  zoomElementRef: Ref<HTMLDivElement | null>,
  renderingEngineRef: Ref<RenderingEngine | null>,
  isMagnifyVisible: Ref<boolean>,
  mainViewportId: string,
  zoomViewportId = 'zoom-magnifier',
  zoomFactor = 2
) {
  let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  watchEffect(async () => {
    const renderingEngine = renderingEngineRef.value;
    const mainElement = mainElementRef.value;
    const zoomElement = zoomElementRef.value;
    if (!isMagnifyVisible.value || !mainElement || !zoomElement || !renderingEngine) {
      return;
    }
    const mainViewport = renderingEngine.getViewport(mainViewportId) as StackViewport;
    const imageIds = mainViewport.getImageIds?.();
    const currentImageIdIndex = mainViewport.getCurrentImageIdIndex?.();
    if (!imageIds || imageIds.length === 0 || currentImageIdIndex === undefined) return;
    // Enable zoom viewport
    try {
      renderingEngine.enableElement({
        viewportId: zoomViewportId,
        type: Enums.ViewportType.STACK,
        element: zoomElement,
      });
    } catch {
      // Already enabled
    }
    const zoomViewport = renderingEngine.getViewport(zoomViewportId) as StackViewport;
    // Set same stack
    await zoomViewport.setStack({ imageIds : imageIds, currentImageIdIndex:currentImageIdIndex });
    // Sync camera
    const mainCamera = mainViewport.getCamera();
    zoomViewport.setCamera({
      ...mainCamera,
      parallelScale: mainCamera.parallelScale / zoomFactor,
    });
    // Setup tool group
    const toolGroupId = 'zoomToolGroup';
    let toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
    if (!toolGroup) {
      toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
      toolGroup.addViewport(zoomViewportId, renderingEngine.id);
      addTool(LengthTool);
      toolGroup.addTool('Length', { configuration: {} });
      toolGroup.setToolEnabled('Length');
      toolGroup.setToolActive('Length', {
        bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
      });
    }
    renderingEngine.renderViewport(zoomViewportId);
    // Track mouse
    mouseMoveHandler = (e: MouseEvent) => {
      const rect = mainElement.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      const world = mainViewport.canvasToWorld([canvasX, canvasY]);
      const currentCam = zoomViewport.getCamera();
      zoomViewport.setCamera({ ...currentCam, focalPoint: world });
      zoomViewport.render();
    };
    mainElement.addEventListener('mousemove', mouseMoveHandler);
  });
  onUnmounted(() => {
    if (mouseMoveHandler && mainElementRef.value) {
      mainElementRef.value.removeEventListener('mousemove', mouseMoveHandler);
    }
  });
}







</script>