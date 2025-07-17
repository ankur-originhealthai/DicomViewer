import type { Types } from '@cornerstonejs/core';
import type { MouseDragEventDetail, MouseMoveEventDetail, MouseClickEventDetail } from '@cornerstonejs/tools/types/EventTypes';
import type { Annotation } from '@cornerstonejs/tools/types/AnnotationTypes';

export interface ViewReference {
    toolName: string;
    cameraPosition?: Types.Point3;
    viewUp?: Types.Point3;
}

export interface ExtendedMetadata extends ViewReference {
    tagName?: string;
    tagPosition?: string;
    measurementTagId?: string;
    measurementTagName?: string;
    measurementValues?: Array<{
        name: string;
        value: number | null;
        unit: string;
    }>;
    referencedImageId?: string;
    tempTagPosition?: string;
}

export interface CachedStats {
    [key: string]: {
        angle?: number | null;
        arc1Angle?: number | null;
        arc2Angle?: number | null;
        points?: {
            world: {
                arc1Start: Types.Point3;
                arc1End: Types.Point3;
                arc2Start: Types.Point3;
                arc2End: Types.Point3;
                arc1Angle: number | null;
                arc2Angle: number | null;
            };
            canvas: {
                arc1Start: Types.Point2;
                arc1End: Types.Point2;
                arc2Start: Types.Point2;
                arc2End: Types.Point2;
                arc1Angle: number | null;
                arc2Angle: number | null;
            };
        };
        length?: number | null;
        width?: number | null;
        breadth?: number | null;
        volume?: number | null; 
        unit?: string | null;
        area?: number | null;
        areaUnit?: string | null;
        Modality?: string | null;
        max?: number | null;
        mean?: number | null;
        stdDev?: number | null;
        circumference?: number | null;
        circumferenceUnit?: string | null;
    };
}

export interface TextBox {
    hasMoved: boolean;
    worldPosition: Types.Point3;
    worldBoundingBox?: {
        topLeft: Types.Point3;
        topRight: Types.Point3;
        bottomLeft: Types.Point3;
        bottomRight: Types.Point3;
    };
}

export interface Handles {
    points: Types.Point3[];
    activeHandleIndex: number | null;
    textBox: TextBox;
    [key: string]: any;
}

export interface AnnotationData {
    handles: Handles;
    cachedStats?: CachedStats;
    label?: string;
    spline?: {
        type?: string;
        instance?: any;
    };
    [key: string]: any;
}

export interface StyleSpecifier {
    toolGroupId: string;
    toolName: string;
    viewportId: string;
    annotationUID: string;
}

export interface EditData {
    annotation: Annotation;
    viewportIdsToRender: string[];
    handleIndex?: number;
    movingTextBox?: boolean;
    newAnnotation?: boolean;
    hasMoved?: boolean;
    isNearFirstLine?: boolean;
    isNearSecondLine?: boolean;
    lastCanvasPoint?: Types.Point2;
    centerWorld?: Types.Point3;
    canvasWidth?: number;
    canvasHeight?: number;
    originalHandleCanvas?: Types.Point2;
}

export interface CobbAngleAnnotation {
    annotationUID: string;
    metadata: ExtendedMetadata;
    data: AnnotationData;
    highlighted: boolean;
    invalidated: boolean;
}

export interface ContourAnnotationData extends Annotation {
    data: AnnotationData & {
        contour?: {
            polyline: Types.Point3[];
            closed: boolean;
            windingDirection?: number;
            pointsManager?: any;
        };
    };
}

export interface CustomAnnotationData extends Annotation {
    annotationId?: string | number;
    points: [number, number];
    annotationName: string;
    isSelected?: boolean;
    isRequired?: boolean;
    frameIndex?: number;
    index?: number | null;
    annotationMasterId?: string | number;
    metadata: ExtendedMetadata;
    data: AnnotationData;
    highlighted?: boolean;
    invalidated?: boolean;
}

export type DragEventDetail = MouseDragEventDetail | MouseMoveEventDetail;
export type ClickEventDetail = MouseClickEventDetail;