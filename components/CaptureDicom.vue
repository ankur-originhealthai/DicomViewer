<script lang="ts">
export const captureDicom = (
  elementRef: HTMLDivElement ,
  frameIndex: number
) => {

    console.log("called")
    const element = elementRef;
  if (!elementRef) return;
  

  console.log("called2")
  const canvas = element.querySelector(".cornerstone-canvas") as HTMLCanvasElement | null;
  const svg = element.querySelector(".svg-layer") as SVGSVGElement | null;
  if (!canvas || !svg) {
    console.warn("Canvas or SVG annotation layer not found");
    return;
  }
  const canvasRect = canvas.getBoundingClientRect();
  const svgRect = svg.getBoundingClientRect();
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  const ctx = exportCanvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(canvas, 0, 0);
  const newSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  newSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  newSvg.setAttribute("width", String(svgRect.width));
  newSvg.setAttribute("height", String(svgRect.height));
  newSvg.setAttribute("viewBox", `0 0 ${svgRect.width} ${svgRect.height}`);
  Array.from(svg.childNodes).forEach((child) => {
    if (child.nodeType === 1) {
      newSvg.appendChild(child.cloneNode(true));
    }
  });
  const svgData = new XMLSerializer().serializeToString(newSvg);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const svgImage = new window.Image();
  svgImage.onload = () => {
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    const offsetX = (svgRect.left - canvasRect.left) * scaleX;
    const offsetY = (svgRect.top - canvasRect.top) * scaleY;
    const drawWidth = svgRect.width * scaleX;
    const drawHeight = svgRect.height * scaleY;
    ctx.drawImage(svgImage, offsetX, offsetY, drawWidth, drawHeight);
    const dataURL = exportCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `dicom-capture-frame-${frameIndex + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  svgImage.src = url;
};

</script>