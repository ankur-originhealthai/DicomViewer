import { EllipticalROITool } from "@cornerstonejs/tools";
import { getAnnotation, getAnnotations } from "@cornerstonejs/tools/annotation/annotationState";
import { isAnnotationVisible } from "@cornerstonejs/tools/annotation/annotationVisibility";
import type SVGDrawingHelper from '@cornerstonejs/tools/types/SVGDrawingHelper';
import getCanvasEllipseCorners from "@cornerstonejs/tools/utilities/math/ellipse/getCanvasEllipseCorners";
import { VolumeViewport, type Types } from '@cornerstonejs/core';
import type{  Point2, Point3 } from "@cornerstonejs/core/types";
import { drawHandles_defaultPlus, drawEllipseSvg_default, drawHandles_default, drawCircle_default, drawLinkedTextBox_default } from './CustomLibrary';
import { type ExtendedMetadata, type AnnotationData, type StyleSpecifier } from './types/tools-type';
import type{ Annotation } from '@cornerstonejs/tools/types/AnnotationTypes';
import getArea from "@cornerstonejs/tools/utilities/math/polyline/getArea";
import type { PlanarBoundingBox } from "@cornerstonejs/tools/types";
import getTextBoxCoordsCanvas from "@cornerstonejs/tools/utilities/drawing/getTextBoxCoordsCanvas";
//import { useToolStore } from "@/store/use-tool-store";
//const { isEraserToolActive } = useToolStore.getState();
export class customellipse extends EllipticalROITool {
    constructor(toolProps: object, defaultToolProps: object) {
        super(toolProps, defaultToolProps);
        // Override renderAnnotation with simplified logic
        this.renderAnnotation = (
            enabledElement: Types.IEnabledElement,
            svgDrawingHelper: SVGDrawingHelper
        ): boolean => {
            const { viewport } = enabledElement;
            const { element } = viewport;
            let annotations = getAnnotations(this.getToolName(), element);
            if (!annotations?.length) return false;
            annotations = this.filterInteractableAnnotationsForElement(element, annotations);
            if (!annotations?.length) return false;
            const styleSpecifierBase: StyleSpecifier = {
                toolGroupId: this.toolGroupId,
                toolName: this.getToolName(),
                viewportId: enabledElement.viewport.id,
                annotationUID: ''
            };
            let renderStatus = false;
            for (const annotation of annotations) {
                if (!annotation.data?.handles?.points) continue;
                if (!annotation.annotationUID) continue;
                const targetid = this.getTargetId(viewport)
                const renderingEngine = viewport.getRenderingEngine();
                this._ensureStats(annotation, viewport, renderingEngine, targetid, enabledElement);
                //console.log(m)
                const styleSpecifier = { ...styleSpecifierBase, annotationUID: annotation.annotationUID ?? '' };
                if (!viewport.getRenderingEngine()) {
                    console.warn('Rendering Engine has been destroyed');
                    return false;
                }
                if (!annotation.annotationUID || !isAnnotationVisible(annotation.annotationUID)) continue;
                this._drawAnnotation(svgDrawingHelper, viewport, annotation, styleSpecifier,enabledElement);
                renderStatus = true;
            }
            return renderStatus;
        };
    }
            private _hasValidCachedStats(data: AnnotationData, targetId: string): boolean {
            return !!data.cachedStats?.[targetId]?.areaUnit;
        }
        private _initializeStats(data: AnnotationData, targetId: string): void {
            if (!data.cachedStats) data.cachedStats = {} as any;
            data.cachedStats[targetId] = {
                Modality: null,
                area: null,
                max: null,
                mean: null,
                stdDev: null,
                areaUnit: null,
            };
        }
        private _ensureStats(annotation: Annotation, viewport: Types.IViewport, renderingEngine: Types.IRenderingEngine, targetId: string, enabledElement: Types.IEnabledElement): void {
            const { data, metadata } = annotation;
            const dataWithTypes = data as AnnotationData;
            const metadataWithTypes = metadata as ExtendedMetadata;
            if (!this._hasValidCachedStats(dataWithTypes, targetId)) {
                this._initializeStats(dataWithTypes, targetId);
                this._calculateCachedStats(annotation, viewport, renderingEngine);
                return;
            }
            if (!annotation.invalidated) return;
            this._throttledCalculateCachedStats(annotation, viewport, renderingEngine, enabledElement);
        }
    private _drawAnnotation(
        svgDrawingHelper: SVGDrawingHelper,
        viewport: Types.IViewport,
        annotation: Annotation,
        styleSpecifier: StyleSpecifier,
        enabledElement: Types.IEnabledElement
    ): void {
        const { annotationUID, data } = annotation;
        const dataWithTypes = data as AnnotationData;
        const { points, activeHandleIndex } = dataWithTypes.handles;
        // Ensure we have 4 points for the ellipse
        const safePoints = points.length === 4 ? points : [
            points[0], points[1],
            points[2] ?? points[0],
            points[3] ?? points[1]
        ];
        const canvasCoordinates = safePoints.map((p: Point3) => viewport.worldToCanvas(p));
        const canvasCorners = getCanvasEllipseCorners(canvasCoordinates as [Point2, Point2, Point2, Point2]);
        const { color, lineWidth, lineDash } = this.getAnnotationStyle({ annotation, styleSpecifier });
        const handleColor = "yellow";
        const annUID = annotationUID ?? '';
        const annObj = getAnnotation(annUID);
        // Draw handles when active or highlighted
        if (activeHandleIndex != null || (annObj && annObj.highlighted) ) {
            drawHandles_default(svgDrawingHelper, annUID, "0", canvasCoordinates, {
                handleColor, lineDash, lineWidth
            });
        }
        // Draw additional handle graphics
        drawHandles_defaultPlus(svgDrawingHelper, annUID, "0", canvasCoordinates, {
            handleColor, lineDash, lineWidth
        });
        // Draw the ellipse
        drawEllipseSvg_default(svgDrawingHelper, annUID, "0", canvasCoordinates, {
            color, lineDash, lineWidth
        }, `${annUID}-ellipse`);
        // Draw center point if configured
        if (this.configuration.centerPointRadius > 0) {
            const minRadius = Math.min(
                Math.abs(canvasCorners[0][0] - canvasCorners[1][0]) / 2,
                Math.abs(canvasCorners[0][1] - canvasCorners[1][1]) / 2
            );
            if (minRadius > 3 * this.configuration.centerPointRadius) {
                const centerPoint = this._getCanvasEllipseCenter(canvasCoordinates);
                drawCircle_default(svgDrawingHelper, annUID, "0-center", centerPoint,
                    this.configuration.centerPointRadius, { color, lineDash, lineWidth });
            }
        }
        const renderTextBoxesParams = { styleSpecifier, enabledElement };
        this._renderTextBoxes(svgDrawingHelper, annUID, annotation, viewport, canvasCorners, canvasCoordinates, renderTextBoxesParams);
    }
    private _renderTextBoxes(
            svgDrawingHelper: SVGDrawingHelper,
            annotationUID: string,
            annotation: Annotation,
            viewport: Types.IViewport,
            canvasCorners: Point2[],
            canvasCoordinates: Point2[],
            renderTextBoxesParams: { styleSpecifier: StyleSpecifier; enabledElement: Types.IEnabledElement },
        ): void {
            const { styleSpecifier, enabledElement } = renderTextBoxesParams;
            const { data, metadata } = annotation;
            const dataWithTypes = data as AnnotationData;
            const ExtendedMetadata = metadata as ExtendedMetadata;
            const options = this.getLinkedTextBoxStyle(styleSpecifier, annotation);
            if (!options.visibility) {
                dataWithTypes.handles.textBox = {
                    hasMoved: false,
                    worldPosition: [0, 0, 0] as Point3,
                    worldBoundingBox: {
                        topLeft: [0, 0, 0] as Point3,
                        topRight: [0, 0, 0] as Point3,
                        bottomLeft: [0, 0, 0] as Point3,
                        bottomRight: [0, 0, 0] as Point3
                    }
                };
                return;
            }
            if (!data.handles?.points) {
                return;
            }
            const textBoxCoords = data.handles?.textBox?.hasMoved
                ? viewport.worldToCanvas(data.handles.textBox.worldPosition as Point3)
                : getTextBoxCoordsCanvas(canvasCorners);
            if (data.handles?.textBox && !data.handles.textBox.hasMoved) {
                data.handles.textBox.worldPosition = viewport.canvasToWorld(textBoxCoords);
            }
            //const tagName = getTagWithPosition(ExtendedMetadata, this.getToolName(), enabledElement);
            //const tagPosition = getTagPosition(ExtendedMetadata, this.getToolName(), enabledElement);
            const targetId = this.getTargetId(viewport);
            if(!data.cachedStats) return
            const label = Math.round(data.cachedStats[targetId]?.area)
            const customTextBoxPosition = viewport.worldToCanvas(data.handles?.points?.[2] ?? [0, 0, 0]);
            const dataArea = 'Area:' + (label) + data.cachedStats[targetId]?.areaUnit
            // Only draw the tag name box
            const boundingBox = drawLinkedTextBox_default(svgDrawingHelper, annotationUID, '2', [dataArea ], customTextBoxPosition, canvasCoordinates, options);
            if (boundingBox && data.handles?.textBox) {
                data.handles.textBox.worldBoundingBox = this._getWorldBoundingBox(viewport, boundingBox);
            }
        }
        private _getWorldBoundingBox(viewport: Types.IViewport, { x, y, width, height }: PlanarBoundingBox): { topLeft: Point3; topRight: Point3; bottomLeft: Point3; bottomRight: Point3 } {
            return {
                topLeft: viewport.canvasToWorld([x, y]),
                topRight: viewport.canvasToWorld([x + width, y]),
                bottomLeft: viewport.canvasToWorld([x, y + height]),
                bottomRight: viewport.canvasToWorld([x + width, y + height])
            };
        }
    getCanvasEllipseCenter(canvasCoordinates: Point2[]): Point2 {
        // Calculate center from the 4 ellipse points
        const centerX = (canvasCoordinates[2][0] + canvasCoordinates[3][0]) / 2;
        const centerY = (canvasCoordinates[0][1] + canvasCoordinates[1][1]) / 2;
        return [centerX, centerY];
    }
}