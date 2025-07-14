import { watchEffect, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import type { StackViewport } from '@cornerstonejs/core';

export function useMagnifier(
  isMagnifyVisible: Ref<boolean>,
  elementRef: Ref<HTMLDivElement | null>,
  renderingEngineRef: Ref<any>,
  viewportId: string,
  zoomFactor: Ref<number>
) {
  let animationFrameRef: number | null = null;
  let lastMouseEvent: MouseEvent | null = null;

  const drawZoom = () => {
    if (!lastMouseEvent) return;

    const container = elementRef.value;
    if (!container) return;

    const zoomCanvas = document.getElementById('zoom-canvas') as HTMLCanvasElement;
    const svgOverlayWrapper = document.getElementById('zoom-svg-layer') as HTMLDivElement;
    if (!zoomCanvas || !svgOverlayWrapper) return;

    const zoomCtx = zoomCanvas.getContext('2d');
    if (!zoomCtx) return;

    const renderingEngine = renderingEngineRef.value;
    const viewport = renderingEngine?.getViewport(viewportId) as StackViewport;
    if (!viewport) return;

    const mainCanvas = viewport.getCanvas();
    const canvasRect = mainCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const zoomCanvasSize = 200;
    const zoomHalfSize = zoomCanvasSize / (2 * zoomFactor.value);

    // DPI handling
    zoomCanvas.width = zoomCanvasSize * dpr;
    zoomCanvas.height = zoomCanvasSize * dpr;
    zoomCanvas.style.width = `${zoomCanvasSize}px`;
    zoomCanvas.style.height = `${zoomCanvasSize}px`;
    zoomCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    zoomCtx.imageSmoothingEnabled = true;
    zoomCtx.imageSmoothingQuality = 'high';

    const canvasX = (lastMouseEvent.clientX - canvasRect.left) * dpr;
    const canvasY = (lastMouseEvent.clientY - canvasRect.top) * dpr;

    const sx = Math.min(Math.max(canvasX - zoomHalfSize, 0), mainCanvas.width - 2 * zoomHalfSize);
    const sy = Math.min(Math.max(canvasY - zoomHalfSize, 0), mainCanvas.height - 2 * zoomHalfSize);
    const sWidth = 2 * zoomHalfSize;
    const sHeight = 2 * zoomHalfSize;

    zoomCtx.clearRect(0, 0, zoomCanvasSize, zoomCanvasSize);
    zoomCtx.drawImage(mainCanvas, sx, sy, sWidth, sHeight, 0, 0, zoomCanvasSize, zoomCanvasSize);

    // Crosshair
    zoomCtx.strokeStyle = 'yellow';
    zoomCtx.lineWidth = 2;
    zoomCtx.beginPath();
    zoomCtx.moveTo(zoomCanvasSize / 2 - 5, zoomCanvasSize / 2);
    zoomCtx.lineTo(zoomCanvasSize / 2 + 5, zoomCanvasSize / 2);
    zoomCtx.stroke();
    zoomCtx.beginPath();
    zoomCtx.moveTo(zoomCanvasSize / 2, zoomCanvasSize / 2 - 5);
    zoomCtx.lineTo(zoomCanvasSize / 2, zoomCanvasSize / 2 + 5);
    zoomCtx.stroke();

    // Clone annotations
    svgOverlayWrapper.innerHTML = '';
    const currentAnnotationSVG = container.querySelector('svg');
    if (currentAnnotationSVG) {
      const clonedSVG = currentAnnotationSVG.cloneNode(true) as SVGSVGElement;
      const clonedChildren = Array.from(clonedSVG.childNodes);
      clonedSVG.innerHTML = currentAnnotationSVG.innerHTML;

      // const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      // g.setAttribute('transform', `scale(${1.268})`);
      // clonedChildren.forEach((child) => g.appendChild(child));
      // clonedSVG.appendChild(g);

      clonedSVG.setAttribute('width', `${zoomCanvasSize}px`);
      clonedSVG.setAttribute('height', `${zoomCanvasSize}px`);
      clonedSVG.setAttribute('viewBox', `${sx} ${sy} ${sWidth} ${sHeight}`);
      clonedSVG.style.position = 'absolute';
      clonedSVG.style.top = '0';
      clonedSVG.style.left = '0';
      clonedSVG.style.pointerEvents = 'none';

      svgOverlayWrapper.appendChild(clonedSVG);
    }

    animationFrameRef = requestAnimationFrame(drawZoom);
  };

  const handleMouseMove = (e: MouseEvent) => {
    lastMouseEvent = e;
    if (animationFrameRef === null) {
      animationFrameRef = requestAnimationFrame(drawZoom);
    }
  };

  const cleanup = () => {
    if (elementRef.value) {
      elementRef.value.removeEventListener('mousemove', handleMouseMove);
    }
    if (animationFrameRef !== null) {
      cancelAnimationFrame(animationFrameRef);
      animationFrameRef = null;
    }
  };

  watchEffect(() => {
    if (!isMagnifyVisible.value) {
      cleanup();
      return;
    }

    if (!elementRef.value || !renderingEngineRef.value) return;

    elementRef.value.addEventListener('mousemove', handleMouseMove);
  });

  onUnmounted(() => {
    cleanup();
  });
}
// 