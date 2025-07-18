import type { Point3, IEnabledElement, IViewport, Point2 } from "@cornerstonejs/core/types";
import { AngleTool } from "@cornerstonejs/tools";
import { isAnnotationVisible } from "@cornerstonejs/tools/annotation/annotationVisibility";
import { triggerAnnotationModified } from "@cornerstonejs/tools/annotation/helpers/state";
import { ChangeTypes } from "@cornerstonejs/tools/enums";
import { triggerAnnotationRenderForViewportIds } from "@cornerstonejs/tools/utilities";
import { drawHandles_default, drawHandles_defaultPlus, drawLinkedTextBox_default, drawLine } from './CustomLibrary'
import { getAnnotation, getAnnotations } from "@cornerstonejs/tools/annotation/annotationState";

import type { SVGDrawingHelper } from "@cornerstonejs/tools/types";
import type { PlanarBoundingBox } from "@cornerstonejs/tools/types";
import { csjsTools } from './types/CSJSTools';
import type { ExtendedMetadata, CachedStats, AnnotationData, StyleSpecifier } from './types/tools-type';


export class customangletool extends AngleTool {
 
  isFirst = true;

  constructor(toolProps: object, defaultProps: object) {
    super(toolProps, defaultProps);

    
    const originalDeactivateDraw = this._deactivateDraw;
    this._deactivateDraw = (element: HTMLDivElement) => {
      originalDeactivateDraw.call(this, element);
      this.isFirst = true;
      
    };

    this._dragCallback = (evt) => {
        this.isDrawing = true;
        const eventDetail = evt.detail;
        const { element } = eventDetail;
        const { annotation, viewportIdsToRender, handleIndex, movingTextBox } = this.editData!;

        const { data } = annotation;
        if (movingTextBox) return;
        else if (handleIndex === undefined) {
          const { deltaPoints } = eventDetail;
          const worldPosDelta = deltaPoints.world;
          const points = data?.handles?.points;
          const checkValue = (points)?.map((point: Point3) => {
              point[0] += worldPosDelta[0];
              point[1] += worldPosDelta[1];
              point[2] += worldPosDelta[2];
              return point;
          });
          
          if (!data.handles) return;
          data.handles.points = checkValue;
          annotation.invalidated = true;
        }
        else {            
          const { currentPoints } = eventDetail;
          let worldPos = (currentPoints.world) || [];
          annotation.invalidated = true;
          if (!data.handles?.points) return;
          data.handles.points[handleIndex] = [...worldPos];
        }
        if (!this.editData) return;
        this.editData.hasMoved = true;
        triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        if (annotation.invalidated) {
            triggerAnnotationModified(annotation, element, ChangeTypes.HandlesUpdated);
        }
    };
    
    this.renderAnnotation = (enabledElement: IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => {
        let renderStatus = false;
        const { viewport } = enabledElement;
        const { element } = viewport;
        
        let annotations = this.filterInteractableAnnotationsForElement(
          element,
          getAnnotations(this.getToolName(), element)
        );
      
        if (!annotations?.length) return renderStatus;
      
        const targetId = this.getTargetId(viewport) as string;
        const renderingEngine = viewport.getRenderingEngine();
      
        for (const annotation of annotations) {
          const { annotationUID, data, metadata } = annotation;
          const metadataWithExtended = metadata as ExtendedMetadata;
          const dataWithTypes = data as AnnotationData;
          const { points, activeHandleIndex } = dataWithTypes.handles!;
          const styleSpecifier = this._buildStyleSpecifier(viewport, annotationUID as string);
          const { color, lineWidth, lineDash } = this.getAnnotationStyle({
            annotation,
            styleSpecifier,
          });
      
          const canvasCoordinates = points?.map((p) => viewport.worldToCanvas(p));
          if (!canvasCoordinates?.length) continue;
      
          if (!dataWithTypes.cachedStats?.[targetId]?.angle) {
            if (!dataWithTypes.cachedStats) dataWithTypes.cachedStats = {} as CachedStats;
            dataWithTypes.cachedStats[targetId] = { angle: null };
            this._calculateCachedStats(annotation, renderingEngine, enabledElement); // Immediate calc
          } else if (annotation.invalidated) {
            this._throttledCalculateCachedStats(annotation, renderingEngine, enabledElement);
          }
      
          if (!isAnnotationVisible(annotationUID as string)) continue;
      
          this._renderHandles(svgDrawingHelper, annotationUID as string, canvasCoordinates, activeHandleIndex, lineWidth as number, lineDash as unknown as number[]);
          this._renderLines(svgDrawingHelper, annotationUID as string, canvasCoordinates, color as string, lineWidth as number, lineDash as unknown as number[]);
      
          renderStatus = true;
      
          if (canvasCoordinates.length !== 3) continue;
      
          if (!dataWithTypes.cachedStats?.[targetId]?.angle) continue;
      
          const options = this.getLinkedTextBoxStyle(styleSpecifier, annotation);
          if (!options.visibility) {
            this._initTextBoxHandles(dataWithTypes);
            continue;
          }
      
          this._updateTextBoxPosition(dataWithTypes, viewport, canvasCoordinates[1] as Point2);
          //const tagName = getTagWithPosition(metadataWithExtended, this.getToolName(), enabledElement);

 
          metadataWithExtended.measurementValues = [
            { name: 'angle', value: dataWithTypes.cachedStats?.[targetId]?.angle, unit:(this.getToolName() as csjsTools) || 'deg' },
          ];
      
          //EventBus.$emit('updatedMeasurements', annotationUID);
      
          this._renderTextBoxes(svgDrawingHelper, annotationUID as string, dataWithTypes, metadataWithExtended, canvasCoordinates, viewport, options);
        }
      
        return renderStatus;
      };
      
    
  };
  _buildStyleSpecifier(viewport: IViewport, annotationUID: string): StyleSpecifier {
    return {
      toolGroupId: this.toolGroupId,
      toolName: this.getToolName(),
      viewportId: viewport.id as string,
      annotationUID
    };
  }
  
  _renderHandles(helper: SVGDrawingHelper, uid: string, coords: Point2[], activeIndex: number | null, width: number, dash: number[]) {
    const handleGroupUID = "0";
    const handleColor = "yellow";
  
    if ((activeIndex != null && this.isFirst) || getAnnotation(uid).highlighted ) {
      drawHandles_default(helper, uid, handleGroupUID, coords, {
        handleColor,
        lineDash: dash,
        lineWidth: width
      });
    }
  
    drawHandles_defaultPlus(helper, uid, handleGroupUID, coords, {
      handleColor,
      lineDash: dash,
      lineWidth: width
    });
  }
  
  _renderLines(helper: SVGDrawingHelper, uid: string, coords: Point2[], color: string, width: number, dash: number[]) {
    drawLine(helper, uid, '1', coords?.[0], coords?.[1], { color, width, lineDash: dash });
    if (coords?.length === 3) {
      drawLine(helper, uid, '2', coords[1], coords[2], { color, width, lineDash: dash });
    }
  }
  
  _initTextBoxHandles(data: AnnotationData) {
    if (!data.handles) data.handles = { 
      points: [],
      activeHandleIndex: null,
      textBox: {
        hasMoved: false,
        worldPosition: [0, 0, 0],
        worldBoundingBox: {
          topLeft: [0, 0, 0],
          topRight: [0, 0, 0],
          bottomLeft: [0, 0, 0],
          bottomRight: [0, 0, 0]
        }
      }
    };
  }
  
  _updateTextBoxPosition(data: AnnotationData, viewport: IViewport, canvasCoord: Point2) {
    if (!data.handles?.textBox?.hasMoved) {
      const worldPos = viewport.canvasToWorld(canvasCoord);
      if (data.handles?.textBox) {
        data.handles.textBox.worldPosition = worldPos;
      }
    }
  }
  
  _renderTextBoxes(helper: SVGDrawingHelper, uid: string, data: AnnotationData, metadata: ExtendedMetadata, coords: Point2[], viewport: IViewport, options: any) {
    const customTextBoxPositionLabel = viewport.worldToCanvas(data.handles?.points?.[1] as Point3);
     const textBoxPosition = viewport.worldToCanvas(
        data.handles.textBox.worldPosition
      );
    const targetId = this.getTargetId(viewport) as string;
    
    if(data.cachedStats && targetId){
      const angleData = (data?.cachedStats[targetId]?.angle).toFixed(2) 
      const customTextBoxLabel = "Angle:" +  angleData + "°";

      const boundingBox = drawLinkedTextBox_default(helper, uid, '2', [customTextBoxLabel], customTextBoxPositionLabel, coords, options);
  
    if (data.handles?.textBox && boundingBox) {
      data.handles.textBox.worldBoundingBox = this._buildBoundingBox(boundingBox, viewport);
    }
    }
    
  
    // Only draw the tag name box
    
  }
  
  _buildBoundingBox(box: PlanarBoundingBox, viewport: IViewport) {
    const { x, y, width, height } = box;
    return {
      topLeft: viewport.canvasToWorld([x, y]),
      topRight: viewport.canvasToWorld([x + width, y]),
      bottomLeft: viewport.canvasToWorld([x, y + height]),
      bottomRight: viewport.canvasToWorld([x + width, y + height]),
    };
  }  

}