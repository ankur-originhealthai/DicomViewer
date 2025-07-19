import type { Types } from "@cornerstonejs/core";
import { SplineROITool } from "@cornerstonejs/tools";
import { getAnnotation, getChildAnnotations } from "@cornerstonejs/tools/annotation/annotationState";
import { drawPolyline, _getSplineConfig, drawHandles_defaultPlus, drawHandles_default, _updateSplineInstance, _renderStats, drawLinkedTextBox_default } from './CustomLibrary';


import { csjsTools } from "../types/CSJSTools";
import { triggerAnnotationRenderForViewportIds } from "@cornerstonejs/tools/utilities";
import { _calculateCachedStats, ContourSegmentRenderAnnotationInstance } from './CustomLibrary';

import type { MouseClickEventType, TouchTapEventType, MouseDragEventType, InteractionEventType } from "@cornerstonejs/tools/types/EventTypes";
import type { IImageData, Point2, Point3 } from "@cornerstonejs/core/types";

import type { Handles, AnnotationData, ExtendedMetadata, EditData, CachedStats } from "../types/tools-type";
import type { AnnotationRenderContext, Annotation } from "@cornerstonejs/tools/types";
import { ChangeTypes } from "@cornerstonejs/tools/enums";
import { currentcustomLabel } from "~/composables/labelState";


const TOUCH_TO_FINISH_DELAY = 200;
const isNullishValue = (value:any) => {
  return value === undefined || value === null;
}

export class CustomSplineROITool extends SplineROITool { 
  protected isFirst: boolean = true;
  protected isTouchFinished: boolean = true;
  public override fireChangeOnUpdate: { annotationUID: string; changeType: ChangeTypes; contourHoleProcessingEnabled: boolean; } = {
    annotationUID: '',
    changeType: ChangeTypes.HandlesUpdated,
    contourHoleProcessingEnabled: false
  };

  constructor(toolProps: any, defaultToolProps: any) {
    super(toolProps, defaultToolProps);
    const self = this as any;
    const originalActivateDraw = self._activateDraw;
    self._activateDraw = (element: HTMLDivElement) => {
        originalActivateDraw.call(self, element);
        
    };

    const originalDeactivateDraw = self._deactivateDraw;
    self._deactivateDraw = (element: HTMLDivElement) => {
        originalDeactivateDraw.call(self, element);
        this.isFirst = true;
        
    };

    const originalMouseDownCallback = self._mouseDownCallback;

    self._mouseDownCallback = (evt: MouseClickEventType | TouchTapEventType) => {
        if(!self.isTouchFinished) {
          return;
        };
        self.isTouchFinished = false;
        setTimeout(() => self.isTouchFinished = true, TOUCH_TO_FINISH_DELAY);
        originalMouseDownCallback(evt);
    };

    const originalDragCallback = self._dragCallback;
    self._dragCallback = (evt: InteractionEventType) => {
      const eventDetail = evt.detail;
      this.isDrawing = true;
      const { annotation, viewportIdsToRender, handleIndex, movingTextBox } = this.editData!;
      const { data } = annotation;

      if (movingTextBox) {
          const { textBox } = data.handles as Handles;
          const { deltaPoints } = eventDetail as MouseDragEventType['detail'];
          const worldPosDelta = deltaPoints.world;
          const { worldPosition } = textBox;
          worldPosition[0] += worldPosDelta[0];
          worldPosition[1] += worldPosDelta[1];
          worldPosition[2] += worldPosDelta[2];
          textBox.hasMoved = true;
      }
      else if (handleIndex === undefined) {
          const { deltaPoints } = eventDetail as MouseDragEventType['detail'];
          const worldPosDelta = deltaPoints.world;
          const points = (data.handles?.points);
          if(!points) return;
          points.forEach((point) => {
              point[0] += worldPosDelta[0];
              point[1] += worldPosDelta[1];
              point[2] += worldPosDelta[2];
          });
    
          annotation.invalidated = true;
          const handles = data.handles as Handles;
          handles.points = points;
      }
      else {
        const { currentPoints } = eventDetail as MouseDragEventType['detail'];
        let worldPos = currentPoints.world;
        //worldPos = (worldPos) || [];
        annotation.invalidated = true;
        const handles = data.handles as Handles;
        handles.points[handleIndex] = [...worldPos];
      }
      triggerAnnotationRenderForViewportIds(viewportIdsToRender);
    };
  }

  protected drawHandles(drawHandlesParams: any) {
    const { annotationUID, activeHandleIndex, handleGroupUID, canvasCoordinates, handleColor, lineWidth, svgDrawingHelper } = drawHandlesParams;
    const hasActiveHandle = !isNullishValue(activeHandleIndex);
    if (hasActiveHandle || getAnnotation(annotationUID).highlighted) {
      drawHandles_default(svgDrawingHelper, annotationUID, handleGroupUID, canvasCoordinates, {
        handleColor,
        lineWidth,
      });
    }else{
      drawHandles_default(svgDrawingHelper, annotationUID, handleGroupUID, canvasCoordinates, {
        handleColor,
        lineWidth,
        handleRadius: '0'
      });
    }
  }

  override renderAnnotationInstance(renderContext: AnnotationRenderContext): boolean {
    const { enabledElement, targetId, svgDrawingHelper, annotationStyle } = renderContext;
    const { viewport } = enabledElement;
    const { worldToCanvas } = viewport;
    const { element } = viewport;
    const annotation = renderContext.annotation as Annotation;
    const { annotationUID, data } = annotation;
    const { handles } = data as AnnotationData;
    let { points: controlPoints, activeHandleIndex } = handles;
    const { lineWidth, lineDash } = annotationStyle;
    let worldPos: Point3[] = [];
    controlPoints?.forEach(point => worldPos.push((point)));
    if(controlPoints){
        controlPoints = [...worldPos];
    }
    const canvasCoordinates = controlPoints.map((p) => worldToCanvas(p));
    const { drawPreviewEnabled } = this.configuration.spline;
    const splineType = (annotation.data as AnnotationData).spline?.type;
    const { configuration: config } = this;
    const splineConfig = _getSplineConfig(splineType as string, config);
    const spline = (annotation.data as AnnotationData).spline?.instance;
    const childAnnotations = getChildAnnotations(annotation);
    const missingAnnotation = childAnnotations.findIndex((it) => !it);
    if (missingAnnotation !== -1) {
        throw new Error(`Can't find annotation for child ${annotation.childAnnotationUIDs?.join()}`);
    }
    const splineAnnotationsGroup = [annotation, ...childAnnotations].filter((annotation2) => this._isSplineROIAnnotation(annotation2));
    splineAnnotationsGroup.forEach((annotation2) => {
        const { configuration: config } = this;
        const spline2 = _updateSplineInstance(element, annotation2, config);
        const splinePolylineCanvas = spline2?.getPolylinePoints();
        this.updateContourPolyline(annotation2, {
        points: splinePolylineCanvas as Point2[],
        closed: data.contour?.closed,
        targetWindingDirection: 1
        }, viewport, { updateWindingDirection: data.contour?.closed });
    });
    ContourSegmentRenderAnnotationInstance(renderContext);
    if (!(data.cachedStats as CachedStats)?.[targetId]?.areaUnit) {
        data.cachedStats = data.cachedStats || {};
        data.cachedStats[targetId] = {
            Modality: null,
            area: null,
            areaUnit: null
        };
        const targetImageData = this.getTargetImageData(targetId);
        _calculateCachedStats(annotation as any, element, targetImageData as IImageData, this.triggerAnnotationModified);
    } else if (annotation.invalidated) {
        this._throttledCalculateCachedStats(annotation, element);
    }
    const handleColor = "yellow";
    const handleGroupUID = "0";
    const drawHandlesParams = { annotationUID, activeHandleIndex, handleGroupUID, canvasCoordinates, handleColor, lineWidth, svgDrawingHelper };
    this.drawHandles(drawHandlesParams);
    
    drawHandles_defaultPlus(svgDrawingHelper, annotationUID as string, handleGroupUID as string, canvasCoordinates as Point2[], {
      handleColor,
      lineDash,
      lineWidth
    });
    const hasLastCanvasPoint = this.editData?.lastCanvasPoint;
    const hasEnoughPoints = spline.numControlPoints > 1;
    const shouldDrawPreview = drawPreviewEnabled && hasEnoughPoints && hasLastCanvasPoint && !spline.closed;

    if (shouldDrawPreview) {
        const { lastCanvasPoint } = this.editData as EditData;
        const previewPolylinePoints = spline.getPreviewPolylinePoints(lastCanvasPoint, 10);
        drawPolyline(svgDrawingHelper, annotationUID as string, "previewSplineChange" as string, previewPolylinePoints as Point2[], {
            color: "#0000ff",
            lineDash,
            lineWidth: 1
        });
    }
    if (splineConfig.showControlPointsConnectors) {
        const controlPointsConnectors = [...canvasCoordinates];
        if (spline.closed) {
          controlPointsConnectors.push(canvasCoordinates[0]);
        }
        drawPolyline(svgDrawingHelper, annotationUID as string, "controlPointsConnectors" as string, controlPointsConnectors as Point2[], {
          color: "#0000ff",
          lineWidth: 1
        });
    }
    const toolName = this.getToolName();
    const metadata = annotation.metadata as ExtendedMetadata;
    const renderStatsParams = { enabledElement, toolName };
    

    // Only render the tag name
    if(data.cachedStats){
      const areaSpline : number= Math.round(data.cachedStats[targetId].area) 
    const textLines = [metadata.tagName ?? "Area:" + areaSpline + data?.cachedStats[targetId].areaUnit];
    if(!textLines) return false;
    _renderStats(annotation as any, viewport, svgDrawingHelper, annotationStyle.textbox as any, targetId, textLines, [renderStatsParams]);

    const isDrawingThis =
    this.editData?.annotation?.annotationUID === annotationUID &&
    this.editData?.newAnnotation === true;

  if (!isDrawingThis && data.handles?.points.length >= 3) {
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
        Option
      );
    }
  }


    if (this.fireChangeOnUpdate?.annotationUID === annotationUID) {
        this.triggerChangeEvent(annotation as any, enabledElement, this.fireChangeOnUpdate.changeType, this.fireChangeOnUpdate.contourHoleProcessingEnabled);
        this.fireChangeOnUpdate = {
            annotationUID: '',
            changeType: ChangeTypes.HandlesUpdated,
            contourHoleProcessingEnabled: false
        };
    }
    }
    
    //EventBus.$emit('updatedMeasurements', annotation.annotationUID);
    annotation.invalidated = false;
    return true;
  }

  static override hydrate(viewportId: string, points: Types.Point3[], options?: { annotationUID?: string }) {
    const annotation = super.hydrate(viewportId, points, options);
    //setActivateDraw(false);
    //setActiveTool({ id: null, cornerstoneToolName: '' });
    return annotation;
  }

  

  
}