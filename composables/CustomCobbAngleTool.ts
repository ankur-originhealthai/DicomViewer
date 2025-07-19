import type SVGDrawingHelper from '@cornerstonejs/tools/types/SVGDrawingHelper';
import { getAnnotation, getAnnotations } from '@cornerstonejs/tools/annotation/annotationState';
import { isAnnotationVisible } from '@cornerstonejs/tools/annotation/annotationVisibility';
import { isAnnotationLocked } from '@cornerstonejs/tools/annotation/annotationLocking';
import getTextBoxCoordsCanvas from '@cornerstonejs/tools/utilities/drawing/getTextBoxCoordsCanvas';
import { CobbAngleTool } from '@cornerstonejs/tools';
import { drawHandles_default, drawHandles_defaultPlus, drawLinkedTextBox_default, drawLine, midPoint2, drawTextBox_default } from './CustomLibrary'
import { Events } from '@cornerstonejs/tools/enums';
import type { Types } from '@cornerstonejs/core';
import { triggerAnnotationRenderForViewportIds } from '@cornerstonejs/tools/utilities';
import { toolsAcronyms, csjsTools } from '../types/CSJSTools';

import type { Point3, Point2 } from '@cornerstonejs/core/types';

import type { AnnotationData, StyleSpecifier, EditData, CobbAngleAnnotation, Handles } from '../types/tools-type';
import type { MouseDragEventType, MouseMoveEventType, MouseClickEventType } from '@cornerstonejs/tools/types/EventTypes';
import type { Annotation, Annotations } from '@cornerstonejs/tools/types/AnnotationTypes';
import { currentcustomLabel } from '~/composables/labelState';

//const { setActivateDraw, isEraserToolActive, activeTool } = useToolStore.getState();
let imageId: string = '';


export class customCobbAngleTool extends CobbAngleTool {
    isFirst = true;
    override editData: EditData | null = null;

    constructor(toolProps: object, defaultToolProps: object) {
        super(toolProps, defaultToolProps);
        const originalActivateDraw = this._activateDraw;
        const originalActivateModify = this._activateModify;
        const originalDeactivateDraw = this._deactivateDraw;
        const originalDeactivateModify = this._deactivateModify;

        this._activateDraw = (element: HTMLDivElement) => {
            originalActivateDraw.call(this, element);
            //setActivateDraw(true);
            element.addEventListener(Events.TOUCH_END, this._endCallback as unknown as EventListener);
            element.addEventListener(Events.TOUCH_DRAG, this._dragCallback as unknown as EventListener);
            element.addEventListener(Events.TOUCH_START, this._mouseDownCallback as unknown as EventListener);
        };

        this._activateModify = (element: HTMLDivElement) => {
            originalActivateModify(element);
            element.addEventListener(Events.TOUCH_END, this._endCallback as unknown as EventListener);
            element.addEventListener(Events.TOUCH_DRAG, this._dragCallback as unknown as EventListener);
            element.addEventListener(Events.TOUCH_START, this._mouseDownCallback as unknown as EventListener);
        }

        this._deactivateDraw = (element: HTMLDivElement) => {
            originalDeactivateDraw.call(this, element);
            //EventBus.$emit('updateAnnotations');
            element.removeEventListener(Events.TOUCH_END, this._endCallback as unknown as EventListener);
            element.removeEventListener(Events.TOUCH_DRAG, this._dragCallback as unknown as EventListener);
            element.removeEventListener(Events.TOUCH_START, this._mouseDownCallback as unknown as EventListener);
            this.isFirst = true;
        };

        this._deactivateModify = (element: HTMLDivElement) => {
            originalDeactivateModify(element);
            element.removeEventListener(Events.TOUCH_END, this._endCallback as unknown as EventListener);
            element.removeEventListener(Events.TOUCH_DRAG, this._dragCallback as unknown as EventListener);
            element.removeEventListener(Events.TOUCH_START, this._mouseDownCallback as unknown as EventListener);
        }

        const originalMouseDownCallback = this._mouseDownCallback;
        this._mouseDownCallback = (evt: MouseClickEventType) => {
            originalMouseDownCallback(evt);
        }
    }

    override _dragCallback = (evt: MouseDragEventType | MouseMoveEventType) => {
        this.isDrawing = true;
        const eventDetail = evt.detail;
        if (!this.editData) return;
        const { annotation, viewportIdsToRender, handleIndex, movingTextBox, isNearFirstLine, isNearSecondLine } = this.editData;
        const { data } = annotation;

        function updateWorldPosition(position: Point3, delta: Point3): void {
            position[0] += delta[0];
            position[1] += delta[1];
            position[2] += delta[2];
        }

        function updateLinePoints(points: Point3[], delta: Point3): Point3[] | null {
            const clonedPoints = (points);
            clonedPoints.forEach(point => updateWorldPosition(point, delta));
            return (clonedPoints) ? null : clonedPoints;
        }

        if (movingTextBox) {
            const { deltaPoints } = eventDetail as MouseDragEventType['detail'];
            const { textBox } = data.handles as Handles;
            if (!textBox) return;
            updateWorldPosition(textBox.worldPosition, deltaPoints.world);
            textBox.hasMoved = true;
        } else if (handleIndex === undefined && (isNearFirstLine || isNearSecondLine)) {
            if (!data.handles?.points) return;
            const { deltaPoints } = eventDetail as MouseDragEventType['detail'];
            const points = data.handles.points;
            const updatedPoints = isNearFirstLine
                ? updateLinePoints([points[0], points[1]], deltaPoints.world)
                : updateLinePoints([points[2], points[3]], deltaPoints.world);
            if (!updatedPoints) return;
            if (isNearFirstLine) {
                [data.handles.points[0], data.handles.points[1]] = updatedPoints;
            } else {
                [data.handles.points[2], data.handles.points[3]] = updatedPoints;
            }
            annotation.invalidated = true;
        } else {
            const { currentPoints } = eventDetail as MouseDragEventType['detail'];
            const worldPos = (currentPoints.world) || [];
            annotation.invalidated = true;
            if (!data.handles?.points) return;
            if (handleIndex === undefined) return;
            data.handles.points[handleIndex] = [...worldPos];
        }
        this.triggerAnnotationRender(viewportIdsToRender);
    };

    protected renderLinkedTextBox(data: AnnotationData, annotationUID: string, canvasCoordinates: Point2[], tagName: string, options: { visibility: boolean }, svgDrawingHelper: SVGDrawingHelper, renderAllAnnotationsParams: { viewport: Types.IViewport; targetId: string; mid2: Point2; arc1Angle: number; arc2Angle: number; arc1Start: Point2; arc1End: Point2; arc2Start: Point2; arc2End: Point2 }): void {
        let { viewport, targetId, mid2, arc1Angle, arc2Angle, arc1Start, arc1End, arc2Start, arc2End } = renderAllAnnotationsParams;
        const customTextBoxPositionLabel = viewport.worldToCanvas(data.handles?.points[1] as Point3);
        const textBoxLabelUID = "cobbAngleTextLabel";
        if (!data.cachedStats) return
        const angleData = (data?.cachedStats[targetId]?.angle as number).toFixed(2)
        const customTextBoxLabel = tagName || "Angle:" + angleData + "°";
        const textBoxPosition = viewport.worldToCanvas(
            data.handles.textBox.worldPosition
        );





        // Only draw the tag name box
        const boundingBox = drawLinkedTextBox_default(svgDrawingHelper, annotationUID, textBoxLabelUID, [customTextBoxLabel], customTextBoxPositionLabel, canvasCoordinates, options);

        if (!boundingBox) { return }



        const { x: left, y: top, width, height } = boundingBox;
        data.handles.textBox.worldBoundingBox = {
            topLeft: viewport.canvasToWorld([left, top]) as Point3,
            topRight: viewport.canvasToWorld([left + width, top]) as Point3,
            bottomLeft: viewport.canvasToWorld([left, top + height]) as Point3,
            bottomRight: viewport.canvasToWorld([left + width, top + height]) as Point3
        };
        if (this.configuration.showArcLines) {
            const arc1TextBoxUID = "arcAngle1";
            const arc1TextLine = [
                `${arc1Angle.toFixed(2)} ${String.fromCharCode(176)}`
            ];
            const arch1TextPosCanvas = midPoint2(arc1Start, arc1End);
            drawTextBox_default(svgDrawingHelper, annotationUID, arc1TextBoxUID, arc1TextLine, arch1TextPosCanvas as Point2, {
                ...options,
                padding: 3
            });
            const arc2TextBoxUID = "arcAngle2";
            const arc2TextLine = [
                `${arc2Angle.toFixed(2)} ${String.fromCharCode(176)}`
            ];
            const arch2TextPosCanvas = midPoint2(arc2Start, arc2End);
            drawTextBox_default(svgDrawingHelper, annotationUID, arc2TextBoxUID, arc2TextLine, arch2TextPosCanvas as Point2, {
                ...options,
                padding: 3
            });
        }


    }

    protected triggerAnnotationRender(viewportIdsToRender: string[]): void {
        if (!this.editData) return;
        triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        this.editData.hasMoved = true;
    }

    protected renderShowArcLines(svgDrawingHelper: SVGDrawingHelper, annotationUID: string, lineUID: string, renderShowArcLinesParams: { arc1Start: Point2; arc1End: Point2; arc2Start: Point2; arc2End: Point2; color: string }): void {
        let { arc1Start, arc1End, arc2Start, arc2End, color } = renderShowArcLinesParams;
        if (this.configuration.showArcLines) {
            lineUID = "arc1";
            drawLine(svgDrawingHelper, annotationUID, lineUID, arc1Start, arc1End, {
                color,
                lineWidth: "1"
            });
            lineUID = "arc2";
            drawLine(svgDrawingHelper, annotationUID, lineUID, arc2Start, arc2End, {
                color,
                lineWidth: "1"
            });
        }
    }

    protected renderDrawHandles(svgDrawingHelper: SVGDrawingHelper, annotationUID: string, handleGroupUID: string, handleColor: string, lineDash: number[], lineWidth: number, renderDrawHandlesParams: { canvasCoordinates: Point2[]; activeHandleCanvasCoords?: Point2[] }): void {
        let { canvasCoordinates, activeHandleCanvasCoords } = renderDrawHandlesParams;
        const isHighlighted = (activeHandleCanvasCoords?.[0] != null)
            || getAnnotation(annotationUID).highlighted;
        if (isHighlighted) {
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

    protected calculateStats(data: AnnotationData, targetId: string, annotation: CobbAngleAnnotation, renderingEngine: Types.IRenderingEngine, enabledElement: Types.IEnabledElement): void {
        if (!data.cachedStats) {
            data.cachedStats = {};
        }
        if (!data.cachedStats[targetId] || data.cachedStats[targetId].angle == null) {
            data.cachedStats[targetId] = {
                angle: null,
                arc1Angle: null,
                arc2Angle: null,
                points: {
                    world: {
                        arc1Start: [0, 0, 0] as Point3,
                        arc1End: [0, 0, 0] as Point3,
                        arc2Start: [0, 0, 0] as Point3,
                        arc2End: [0, 0, 0] as Point3,
                        arc1Angle: null,
                        arc2Angle: null
                    },
                    canvas: {
                        arc1Start: [0, 0] as Point2,
                        arc1End: [0, 0] as Point2,
                        arc2Start: [0, 0] as Point2,
                        arc2End: [0, 0] as Point2,
                        arc1Angle: null,
                        arc2Angle: null
                    }
                }
            };
            this._calculateCachedStats(annotation, renderingEngine, enabledElement);
        } else if (annotation.invalidated) {
            this._throttledCalculateCachedStats(annotation, renderingEngine, enabledElement);
        }
    }

    protected returnActiveHandleCanvasCoords(activeHandleCanvasCoords: Point2[] | undefined, annotationUID: string, activeHandleIndex: number | null, canvasCoordinates: Point2[]): Point2[] | undefined {
        if (!isAnnotationLocked(annotationUID) && activeHandleIndex !== null) {
            activeHandleCanvasCoords = [canvasCoordinates[activeHandleIndex]];
        }
        return activeHandleCanvasCoords;
    }

    protected getTextBoxWorldPosition(viewport: Types.IViewport, data: AnnotationData, canvasCoordinates: Point2[]): void {
        if (data.handles.textBox.hasMoved) return;
        const canvasTextBoxCoords = getTextBoxCoordsCanvas(canvasCoordinates);
        data.handles.textBox.worldPosition = viewport.canvasToWorld(canvasTextBoxCoords);
    }

    protected renderAllAnnotations(
  annotations: CobbAngleAnnotation[],
  targetId: string,
  renderingEngine: Types.IRenderingEngine,
  styleSpecifier: StyleSpecifier,
  enabledElement: Types.IEnabledElement,
  svgDrawingHelper: SVGDrawingHelper,
  renderAllAnnotationsParams: { viewport: Types.IViewport; renderStatus: boolean }
): boolean {
  let { viewport, renderStatus } = renderAllAnnotationsParams;

  for (const annotation of annotations) {
    const { annotationUID, data, metadata } = annotation;
    let points = data.handles?.points ?? [];
    let activeHandleIndex = data.handles?.activeHandleIndex ?? null;

    styleSpecifier.annotationUID = annotationUID;
    const { color, lineWidth, lineDash } = this.getAnnotationStyle({
      annotation: annotation as Annotation,
      styleSpecifier,
    });

    const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
    this.calculateStats(data, targetId, annotation, renderingEngine, enabledElement);

    let activeHandleCanvasCoords: Point2[] | undefined;
    activeHandleCanvasCoords = this.returnActiveHandleCanvasCoords(
      activeHandleCanvasCoords,
      annotationUID,
      activeHandleIndex,
      canvasCoordinates
    );

    if (!viewport.getRenderingEngine()) {
      console.warn("Rendering Engine has been destroyed");
      return renderStatus;
    }
    if (!isAnnotationVisible(annotationUID)) continue;

    const handleGroupUID = "0";
    const handleColor = "yellow";
    let renderDrawHandlesParams = { canvasCoordinates, activeHandleCanvasCoords };
    this.renderDrawHandles(
      svgDrawingHelper,
      annotationUID,
      handleGroupUID,
      handleColor,
      lineDash as unknown as number[],
      lineWidth as unknown as number,
      renderDrawHandlesParams
    );

    // Draw first line
    if (canvasCoordinates.length >= 2) {
      drawLine(svgDrawingHelper, annotationUID, "line1", canvasCoordinates[0], canvasCoordinates[1], {
        color,
        width: lineWidth,
        lineDash,
      });
      renderStatus = true;
    }

    // Draw second line and linking line only if points available
    if (canvasCoordinates.length >= 4) {
      drawLine(svgDrawingHelper, annotationUID, "line2", canvasCoordinates[2], canvasCoordinates[3], {
        color,
        width: lineWidth,
        lineDash,
      });

      const mid1 = midPoint2(canvasCoordinates[0], canvasCoordinates[1]);
      const mid2 = midPoint2(canvasCoordinates[2], canvasCoordinates[3]);
      drawLine(svgDrawingHelper, annotationUID, "linkLine", mid1, mid2, {
        color,
        lineWidth: 1,
        lineDash: "1,4",
      });

      // Draw arc lines if enabled
      const {
        arc1Start,
        arc1End,
        arc2Start,
        arc2End,
      } = data.cachedStats?.[targetId]?.points?.canvas ?? {
        arc1Start: [0, 0] as Point2,
        arc1End: [0, 0] as Point2,
        arc2Start: [0, 0] as Point2,
        arc2End: [0, 0] as Point2,
      };
      const { arc1Angle, arc2Angle } = data.cachedStats?.[targetId] ?? {
        arc1Angle: 0,
        arc2Angle: 0,
      };
      this.renderShowArcLines(svgDrawingHelper, annotationUID, "arcLines", {
        arc1Start,
        arc1End,
        arc2Start,
        arc2End,
        color,
      });
    }

    // Draw main angle text box near point 1
    if (canvasCoordinates.length >= 2) {
      this.getTextBoxWorldPosition(viewport, data, canvasCoordinates);
      const customTextBoxPositionLabel = viewport.worldToCanvas(data.handles?.points[1] as Point3);
      const textBoxLabelUID = "cobbAngleTextLabel";

      // Compose angle label text (2 decimals)
      const angleValue = data.cachedStats?.[targetId]?.angle;
      const angleText = angleValue !== null && angleValue !== undefined ? angleValue.toFixed(2) + "°" : "";

      const customTextBoxLabel = metadata.tagName || `Angle: ${angleText}`;

      const options = this.getLinkedTextBoxStyle(styleSpecifier, annotation as Annotation);

      drawLinkedTextBox_default(
        svgDrawingHelper,
        annotationUID,
        textBoxLabelUID,
        [customTextBoxLabel],
        customTextBoxPositionLabel,
        canvasCoordinates,
        options
      );

      metadata.measurementValues = [
        { name: "angle", value: angleValue, unit: (this.getToolName() as csjsTools) || "deg" },
      ];
    }

    // Draw second label text box near point 3 if available
    if (
      !this.editData?.newAnnotation && // not currently drawing this annotation
      data.handles?.points.length === 4
    ) {
      if (!data.label) {
        data.label = currentcustomLabel.value?.trim() || "No label";
      }

      if (data.label && data.label !== "No label") {
        const labelBoxPosition = viewport.worldToCanvas(data.handles.points[2] as Point3);

        drawLinkedTextBox_default(
          svgDrawingHelper,
          annotationUID,
          "labelTextBox",
          [data.label],
          labelBoxPosition,
          canvasCoordinates,
          {},
        Option,
        );
      }
    }
  }

  return renderStatus;
}


    protected returnAnnotationStatus(annotations: CobbAngleAnnotation[] | undefined, renderStatus: boolean): boolean | undefined {
    if (!annotations?.length) {
        return renderStatus;
    }
}

    override renderAnnotation = (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper): boolean => {
    const { viewport } = enabledElement;
    const { element } = viewport;
    let annotations = getAnnotations(this.getToolName(), element) as CobbAngleAnnotation[];
    let renderStatus = false;
    this.returnAnnotationStatus(annotations, renderStatus);
    annotations = this.filterInteractableAnnotationsForElement(element, annotations as Annotations) as CobbAngleAnnotation[];
    this.returnAnnotationStatus(annotations, renderStatus);
    const targetId = this.getTargetId(viewport);
    const renderingEngine = viewport.getRenderingEngine();
    const styleSpecifier: StyleSpecifier = {
        toolGroupId: this.toolGroupId,
        toolName: this.getToolName(),
        viewportId: enabledElement.viewport.id,
        annotationUID: ''
    };
    let renderAllAnnotationsParams = { viewport, renderStatus };
    return this.renderAllAnnotations(annotations, targetId as string, renderingEngine, styleSpecifier, enabledElement, svgDrawingHelper, renderAllAnnotationsParams);
}
}