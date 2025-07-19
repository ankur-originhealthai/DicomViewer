import type SVGDrawingHelper from '@cornerstonejs/tools/types/SVGDrawingHelper';
import { LengthTool, annotation as annotationTools } from '@cornerstonejs/tools';
import getTextBoxCoordsCanvas from '@cornerstonejs/tools/utilities/drawing/getTextBoxCoordsCanvas';
import { drawHandles_default, drawHandles_defaultPlus, drawLinkedTextBox_default, drawLine } from './CustomLibrary'
import type { IEnabledElement, Point3, Point2 } from '@cornerstonejs/core/types';
import triggerAnnotationRenderForViewportIds from '@cornerstonejs/tools/utilities/triggerAnnotationRenderForViewportIds';
import type { Types } from '@cornerstonejs/core';
import type { LengthAnnotation } from '@cornerstonejs/tools/types/ToolSpecificAnnotationTypes';
//import { getTagWithPosition } from './tagAndPosition';

import { getAnnotation } from '@cornerstonejs/tools/annotation/annotationState';


import type { ExtendedMetadata, AnnotationData, StyleSpecifier, Handles, DragEventDetail, EditData } from '~/types/tools-type';
import type { MouseDragEventType } from '@cornerstonejs/tools/types/EventTypes';
import type { InteractionEventType } from '@cornerstonejs/tools/types/EventTypes';
import { currentcustomLabel } from '~/composables/labelState';

const getAnnotations = annotationTools.state.getAnnotations;
const isAnnotationVisible = annotationTools.visibility.isAnnotationVisible;
const imageId = {};




export class CustomLengthTool extends LengthTool {
  isFirst = true;
  override editData: EditData | null = null;

  constructor(toolProps: object, defaultToolProps: object) {
    super(toolProps, defaultToolProps);
    const originalActivateDraw = this._activateDraw;
    this._activateDraw = (element: HTMLDivElement) => {
      originalActivateDraw.call(this, element);
    };

    const originalDeactivateDraw = this._deactivateDraw;
    this._deactivateDraw = (element: HTMLDivElement) => {
      originalDeactivateDraw.call(this, element);
      this.isFirst = true;
      //EventBus.$emit('updateAnnotations');
    };
  }

  override _dragCallback = (evt: InteractionEventType) => {
    this.isDrawing = true;
    const eventDetail = evt.detail as MouseDragEventType['detail'];
    if (!this.editData) return;
    const { annotation, viewportIdsToRender, handleIndex, movingTextBox } = this.editData;

    if(this.isFirst && handleIndex != undefined){
      this.isFirst = false;
    }

    const { data } = annotation;
    if (movingTextBox) {
        const { deltaPoints } = eventDetail as MouseDragEventType['detail'];
        const worldPosDelta = deltaPoints.world;
        const { textBox } = data.handles || {};
        if (!textBox?.worldPosition) return;
        textBox.worldPosition[0] += worldPosDelta[0];
        textBox.worldPosition[1] += worldPosDelta[1];
        textBox.worldPosition[2] += worldPosDelta[2];
        textBox.hasMoved = true;
    }
    else if (handleIndex === undefined) {
        const { deltaPoints } = eventDetail as MouseDragEventType['detail'];
        const worldPosDelta = deltaPoints.world;
        const points = useDeepClone(data.handles?.points);
        if(!points) return;
        points.forEach((point: Point3) => {
            point[0] += worldPosDelta[0];
            point[1] += worldPosDelta[1];
            point[2] += worldPosDelta[2];
        });
        //if(isOutsideTheImage(points)) return;
        if (!data.handles) data.handles = CustomLengthTool.createDefaultHandles();
        data.handles.points = points;
        annotation.invalidated = true;
    }
    else {
      const { currentPoints } = eventDetail;
      let worldPos = currentPoints.world;
      //worldPos = _dragCallbackElseBlock(worldPos) || [];
      if (!data.handles) data.handles = CustomLengthTool.createDefaultHandles();
      if (!data.handles.points) data.handles.points = [[0,0,0],[0,0,0]] as Point3[];
      data.handles.points[handleIndex] = [...worldPos] as Point3;
      annotation.invalidated = true;
    }
    this.triggerAnnotationRender(viewportIdsToRender);
  };
  
  protected triggerAnnotationRender(viewportIdsToRender: string[]): void {
    if (!this.editData) return;
    this.editData.hasMoved = true;
    triggerAnnotationRenderForViewportIds(viewportIdsToRender);
  }

  protected returnAnnotationStatus(annotations: LengthAnnotation[] | undefined, renderStatus: boolean): boolean | undefined {
    if (!annotations?.length) {
      return renderStatus;
    }
  }

  // Helper to create a default Handles object
  private static createDefaultHandles(): { points: Point3[]; activeHandleIndex: number | null; textBox: { hasMoved: boolean; worldPosition: Point3; worldBoundingBox: { topLeft: Point3; topRight: Point3; bottomLeft: Point3; bottomRight: Point3; }; }; } {
    return {
      points: [[0, 0, 0], [0, 0, 0]] as Point3[],
      activeHandleIndex: null,
      textBox: {
        hasMoved: false,
        worldPosition: [0, 0, 0] as Point3,
        worldBoundingBox: {
          topLeft: [0, 0, 0] as Point3,
          topRight: [0, 0, 0] as Point3,
          bottomLeft: [0, 0, 0] as Point3,
          bottomRight: [0, 0, 0] as Point3
        }
      }
    };
  }

  protected renderLinkedTextBox(data: AnnotationData, annotationUID: string, textLines: string[], canvasCoordinates: Point2[], options: { visibility: boolean }, viewport: Types.IViewport, svgDrawingHelper: SVGDrawingHelper): void {
    const textBoxLabelUID = "1";
    const textBoxWorldPoints = getLeftAndRightPoints(data.handles.points);
    const customTextBoxPositionLabel = viewport.worldToCanvas((textBoxWorldPoints.right?.length === 3 ? textBoxWorldPoints.right : [0,0,0]) as Point3);
    const tag = textLines[0];
   
    
    // Only draw the tag name box
    const boundingBox = drawLinkedTextBox_default(svgDrawingHelper, annotationUID || '', textBoxLabelUID, [tag], customTextBoxPositionLabel,
       canvasCoordinates, {...options, isLeftDown: !textBoxWorldPoints.isLeftDown });
    

      const isDrawingThis =
    this.editData?.annotation?.annotationUID === annotationUID &&
    this.editData?.newAnnotation === true;

  if (!isDrawingThis && data.handles?.points.length === 2) {
    const labelBoxPosition = viewport.worldToCanvas(data.handles.points[0] as Point3);

    // Assign label once
    if (!data.label) {
      data.label = currentcustomLabel.value?.trim() || 'No label';
    }

    if (data.label && data.label !== 'No label') {
      drawLinkedTextBox_default(
        svgDrawingHelper,
        annotationUID,
        '2',
        [data.label],
        labelBoxPosition,
        canvasCoordinates,
        {},
        options
      );
    }
  }

    if (!boundingBox) return;
    const { x: left, y: top, width, height } = boundingBox;
  
    data.handles.textBox.worldBoundingBox = {
      topLeft: viewport.canvasToWorld([left, top]) as Point3,
      topRight: viewport.canvasToWorld([left + width, top]) as Point3,
      bottomLeft: viewport.canvasToWorld([left, top + height]) as Point3,
      bottomRight: viewport.canvasToWorld([left + width, top + height]) as Point3
    };
  }

  protected calculateStats(data: AnnotationData, targetId: string, annotation: LengthAnnotation, renderingEngine: Types.IRenderingEngine, enabledElement: IEnabledElement): void {
    if (!data.cachedStats?.[targetId]?.unit) {
      if (!data.cachedStats) data.cachedStats = {};
      data.cachedStats[targetId] = {
        length: null,
        unit: null
      };
      this._calculateCachedStats(annotation, renderingEngine, enabledElement);
    } else if (annotation.invalidated) {
      this._throttledCalculateCachedStats(annotation, renderingEngine, enabledElement);
    }
  }

  protected drawHandles(drawHandlesParams: {
    annotationUID: string;
    handleGroupUID: string;
    canvasCoordinates: Point2[];
    activeHandleIndex?: number | null;
    handleColor: string;
    lineDash: number[];
    lineWidth: number;
    svgDrawingHelper: SVGDrawingHelper;
  }): void {
    const { annotationUID, handleGroupUID, canvasCoordinates, activeHandleIndex, handleColor, lineDash, lineWidth, svgDrawingHelper } = drawHandlesParams;
    const invalidActiveHandleIndex = activeHandleIndex != undefined && activeHandleIndex != null;
    
    if (invalidActiveHandleIndex || getAnnotation(annotationUID).highlighted ) {
      drawHandles_default(svgDrawingHelper, annotationUID, handleGroupUID, canvasCoordinates, {
        handleColor,
        lineDash,
        lineWidth
      });
    }
  
    drawHandles_defaultPlus(svgDrawingHelper, annotationUID, handleGroupUID, canvasCoordinates, {
      handleColor,
      lineDash,
      lineWidth
    });
  }

  protected renderAllAnnotations(annotations: LengthAnnotation[], targetId: string, renderingEngine: Types.IRenderingEngine, styleSpecifier: StyleSpecifier, enabledElement: IEnabledElement, svgDrawingHelper: SVGDrawingHelper, renderAllAnnotationsParams: { viewport: Types.IViewport; renderStatus: boolean }): boolean {
    let { viewport, renderStatus } = renderAllAnnotationsParams;

    for (const annotation of annotations) {
      const { annotationUID, data, metadata } = annotation;
      const metadataExtended = metadata as ExtendedMetadata;
      // Ensure handles is always present and fully initialized
      if (!data.handles || !data.handles.points || !data.handles.textBox) {
        data.handles = CustomLengthTool.createDefaultHandles();
      }
      const { points, activeHandleIndex } = data.handles;
      styleSpecifier.annotationUID = annotationUID || '';
      
      const { color, lineWidth, lineDash, shadow } = this.getAnnotationStyle({
        annotation,
        styleSpecifier
      });
      
      const canvasCoordinates = (points && points.length >= 2)
        ? points.map((p: Point3) => (p.length === 3 ? viewport.worldToCanvas(p) : [0,0] as Point2))
        : [[0,0] as Point2, [0,0] as Point2];
      this.calculateStats(data, targetId, annotation, renderingEngine, enabledElement);
      const hasNoRenderingEngine = !viewport.getRenderingEngine();
      if (hasNoRenderingEngine) {
        return renderStatus;
      }
      const annotationNotVisible = !isAnnotationVisible(annotationUID || '');
      if (annotationNotVisible) continue;
    
      const handleGroupUID = "0";
      const handleColor = "yellow";
      const drawHandlesParams = {
        annotationUID: annotationUID || '',
        handleGroupUID,
        canvasCoordinates,
        activeHandleIndex,
        handleColor,
        lineDash: Array.isArray(lineDash) ? lineDash as number[] : [],
        lineWidth: typeof lineWidth === 'number' ? lineWidth : 1,
        svgDrawingHelper
      };
      this.drawHandles(drawHandlesParams);
    
      const dataId = `${annotationUID}-line`;
      const lineUID = "1";
      drawLine(svgDrawingHelper, annotationUID || '', lineUID, canvasCoordinates[0], canvasCoordinates[1], {
        color,
        width: lineWidth,
        lineDash,
        shadow
      }, dataId);
    
      renderStatus = true;
    
      if (!viewport.getRenderingEngine()) {
        return renderStatus;
      }
    
      const optionsRaw = this.getLinkedTextBoxStyle(styleSpecifier, annotation);
      const options = { visibility: Boolean(optionsRaw && (optionsRaw as { visibility?: boolean }).visibility) };
      if (!options.visibility) {
        data.handles.textBox = {
          hasMoved: false,
          worldPosition: [0, 0, 0] as Point3,
          worldBoundingBox: {
            topLeft: [0, 0, 0] as Point3,
            topRight: [0, 0, 0] as Point3,
            bottomLeft: [0, 0, 0] as Point3,
            bottomRight: [0, 0, 0] as Point3
          }
        };
        continue;
      }
      data.handles.points = points;
      if (!data.handles.textBox.hasMoved) {
        const canvasTextBoxCoords = getTextBoxCoordsCanvas(canvasCoordinates);
        data.handles.textBox.worldPosition = viewport.canvasToWorld(canvasTextBoxCoords);
      }
      const tagName = 'abc'
      
 
      metadataExtended.measurementValues = [{ name: "length", value: data.cachedStats[targetId]?.length, unit: 'mm' }];
      const textLines = this.configuration.getTextLines(data, targetId, metadataExtended.tagName || metadataExtended.measurementValues);
      if(!textLines) return renderStatus;
      //EventBus.$emit('updatedMeasurements', annotationUID || '');
      textLines.push(metadataExtended.tagName || 'abc');
      this.renderLinkedTextBox(data, annotationUID || '', textLines, canvasCoordinates, options, viewport, svgDrawingHelper);
    }
    return renderStatus;
  }

  override renderAnnotation = (enabledElement: IEnabledElement, svgDrawingHelper: SVGDrawingHelper): boolean => {
    let renderStatus = false;
    const { viewport } = enabledElement;
    const { element } = viewport;
    let annotations = getAnnotations(this.getToolName(), element) as LengthAnnotation[];
    this.returnAnnotationStatus(annotations, renderStatus);
    annotations = this.filterInteractableAnnotationsForElement(element, annotations) as LengthAnnotation[];
    this.returnAnnotationStatus(annotations, renderStatus);
    const targetId = this.getTargetId(viewport) || '';
    const renderingEngine = viewport.getRenderingEngine();
    const styleSpecifier: StyleSpecifier = {
      toolGroupId: this.toolGroupId,
      toolName: this.getToolName(),
      viewportId: enabledElement.viewport.id,
      annotationUID: ''
    };
    let renderAllAnnotationsParams = { viewport, renderStatus};
    return this.renderAllAnnotations(annotations, targetId, renderingEngine, styleSpecifier, enabledElement, svgDrawingHelper, renderAllAnnotationsParams);
  }

  static override hydrate(viewportId: string, points: Point3[], options?: { annotationUID?: string }): LengthAnnotation {
    const annotation = super.hydrate(viewportId, points, options);
    return annotation;
  }
}

 const getLeftAndRightPoints = (worldPoints: number[][]):{left:number[], right:number[], isLeftDown: boolean} => {
    let left = useDeepClone(worldPoints[0]);
    let right = useDeepClone(worldPoints[1]);
    let isLeftDown = false;
    for(const point of worldPoints){
      if(point[0] < left[0]) {
        left = useDeepClone(point);
      };
      if(point[0] > right[0]){
        right = useDeepClone(point);
      }
    }

    if(left[1] < right[1]){
      isLeftDown = true
    }

    return { left, right , isLeftDown}
  };

  export const useDeepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
}