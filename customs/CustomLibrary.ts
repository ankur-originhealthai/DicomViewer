import { getEnabledElement, StackViewport, Viewport } from "@cornerstonejs/core";
import CardinalSpline from "@cornerstonejs/tools/tools/annotation/splines/CardinalSpline";
import { getCalibratedLengthUnitsAndScale, getClosestImageIdForStackViewport } from "@cornerstonejs/tools/utilities";
import { roundNumber, transformWorldToIndex, uuidv4 } from "@cornerstonejs/core/utilities";
import getTextBoxCoordsCanvas from "@cornerstonejs/tools/utilities/drawing/getTextBoxCoordsCanvas";
import { annotation } from "@cornerstonejs/tools";
import getContourHolesDataCanvas from "@cornerstonejs/tools/utilities/contours/getContourHolesDataCanvas";
import { addAnnotation } from "@cornerstonejs/tools/annotation/annotationState";
import type { PlanarBoundingBox, SVGDrawingHelper } from "@cornerstonejs/tools/types";
import type { IEnabledElement, IImageData, IStackViewport, IVolumeViewport, Point2, Point3 } from "@cornerstonejs/core/types";
import type { TextBoundingBox } from "./types/CSJSTools";
import type { PlanarFreehandROIAnnotation, SplineROIAnnotation } from "@cornerstonejs/tools/types/ToolSpecificAnnotationTypes";
import { vec2 } from 'gl-matrix';


let ChangeTypes_default = {
    Interaction: "Interaction",
    HandlesUpdated: "HandlesUpdated",
    StatsUpdated: "StatsUpdated",
    InitialSetup: "InitialSetup",
    Completed: "Completed",
    InterpolationUpdated: "InterpolationUpdated",
    History: "History",
    MetadataReferenceModified: "MetadataReferenceModified",
    LabelChange: "LabelChange"
};

let DEFAULT_SPLINE_CONFIG = {
    resolution: 20,
    controlPointAdditionDistance: 6,
    controlPointDeletionDistance: 6,
    showControlPointsConnectors: false,
    controlPointAdditionEnabled: true,
    controlPointDeletionEnabled: true
};

type deleteCircleTypeComman = {
    svgDrawingHelper: any; annotationUID: string; handleGroupUID: string; uniqueIndex: string; opacity: number;
    options?: Record<any, any>
};

type handleDeleteCircleType = deleteCircleTypeComman & { x: number; y: number; radius: number; };
type handleDeleteMinusType = deleteCircleTypeComman & { centerX: number; centerY: number; length: number; };
type TextOptions = Record<string, any>;
type Bounding = { maxX: number; maxY: number; minX: number; minY: number; maxZ?: number; minZ?: number; };

function drawHandle(svgDrawingHelper: SVGDrawingHelper, annotationUID: string, handleGroupUID: string, handle: Point2, uniqueIndex: string, options = {}) {
    const { color, handleRadius, width, lineWidth, fill, type, opacity } = {
        color: "rgb(255, 255, 0)",
        handleRadius: "16",
        width: "2",
        lineWidth: void 0,
        fill: "rgba(255, 255, 0, 0.1)",
        type: "circle",
        opacity: 1,
        ...options
    };
    const strokeWidth = lineWidth ?? width;
    const svgns2 = "http://www.w3.org/2000/svg";
    const svgNodeHash = getHash_default(annotationUID, "handle", `hg-${handleGroupUID}-index-${uniqueIndex}`);
    let attributes;
    if (type === "circle") {
        attributes = {
            cx: `${handle[0]}`,
            cy: `${handle[1]}`,
            r: handleRadius,
            stroke: color,
            fill,
            "stroke-width": strokeWidth,
            opacity
        };
    } else if (type === "rect") {
        const handleRadiusFloat = parseFloat(handleRadius);
        const side = handleRadiusFloat * 1.5;
        const x = handle[0] - side * 0.5;
        const y = handle[1] - side * 0.5;
        attributes = {
            x: `${x}`,
            y: `${y}`,
            width: `${side}`,
            height: `${side}`,
            stroke: color,
            fill,
            "stroke-width": strokeWidth,
            rx: `${side * 0.1}`,
            opacity
        };
    } else {
        throw new Error(`Unsupported handle type: ${type}`);
    }

    // Draw main shape
    const existingHandleElement = svgDrawingHelper.getSvgNode(svgNodeHash);
    if (existingHandleElement) {
        setAttributesIfNecessary_default(attributes, existingHandleElement);
        svgDrawingHelper.setNodeTouched(svgNodeHash);
    } else {
        const newHandleElement = document.createElementNS(svgns2, type);
        setNewAttributesIfValid_default(attributes, newHandleElement);
        svgDrawingHelper.appendNode(newHandleElement, svgNodeHash);
    }



    // Draw inner small circle
    // === Top-right mini circle with minus ===
    const handleRadiusFloat = parseFloat(handleRadius);
    const offset = handleRadiusFloat * 0.8;
    const miniX = handle[0] + offset;
    const miniY = handle[1] - offset;
    const innerCircleRadius = handleRadiusFloat * 0.5;

    // drawHandleDeleteCircle({
    //     svgDrawingHelper,
    //     annotationUID,
    //     handleGroupUID,
    //     uniqueIndex,
    //     x: miniX,
    //     y: miniY,
    //     radius: innerCircleRadius,
    //     opacity
    // });
}

// function drawHandleDeleteCircle(
//     { svgDrawingHelper, annotationUID, handleGroupUID, uniqueIndex, x, y, radius, opacity }
//         : handleDeleteCircleType): void {
//     const innerCircleHash = getHash_default(
//         annotationUID,
//         "handle",
//         `hg-${handleGroupUID}-index-${uniqueIndex}-inner`
//     );

//     const innerCircleAttrs = {
//         cx: `${x}`,
//         cy: `${y}`,
//         r: `${radius}`,
//         fill: "#fff",
//         opacity
//     };

    // const existingInner = svgDrawingHelper.getSvgNode(innerCircleHash);
    // if (existingInner) {
    //     setAttributesIfNecessary_default(innerCircleAttrs, existingInner);
    //     svgDrawingHelper.setNodeTouched(innerCircleHash);
    // } else {
    //     const inner = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    //     setNewAttributesIfValid_default(innerCircleAttrs, inner);
    //     svgDrawingHelper.appendNode(inner, innerCircleHash);
    // }

    // const minusLineLength = radius * 1.2;

    // drawMinusLine({
    //     svgDrawingHelper,
    //     annotationUID,
    //     handleGroupUID,
    //     uniqueIndex,
    //     centerX: x,
    //     centerY: y,
    //     length: minusLineLength,
    //     opacity
    // });
//}

// function drawMinusLine(
//     { svgDrawingHelper, annotationUID, handleGroupUID, uniqueIndex, centerX, centerY, length, opacity }
//         : handleDeleteMinusType): void {
//     const x1 = centerX - length / 2;
//     const x2 = centerX + length / 2;
//     const y = centerY;

//     const minusLineHash = getHash_default(annotationUID, "handle", `hg-${handleGroupUID}-index-${uniqueIndex}-minus`);
//     const minusAttrs = {
//         x1: `${x1}`,
//         y1: `${y}`,
//         x2: `${x2}`,
//         y2: `${y}`,
//         stroke: "#000",
//         "stroke-width": "2",
//         opacity
//     };

//     const existingMinus = svgDrawingHelper.getSvgNode(minusLineHash);
//     if (existingMinus) {
//         setAttributesIfNecessary_default(minusAttrs, existingMinus);
//         svgDrawingHelper.setNodeTouched(minusLineHash);
//     }
//     else {
//         const minus = document.createElementNS("http://www.w3.org/2000/svg", "line");
//         setNewAttributesIfValid_default(minusAttrs, minus);
//         svgDrawingHelper.appendNode(minus, minusLineHash);
//     }
// };

function drawHandles(svgDrawingHelper: SVGDrawingHelper, annotationUID: string, handleGroupUID: string, handlePoints: Point2[], options = {}) {
    handlePoints.forEach((handle, i) => {
        drawHandle_default(svgDrawingHelper, annotationUID, handleGroupUID, handle, i.toString(), options);
    });
}

function drawHandlesPlus(svgDrawingHelper: SVGDrawingHelper, annotationUID: string, handleGroupUID: string, handlePoints: Point2[], options = {}) {
    handlePoints.forEach((handle, i) => {
        const UIDOne = "1" + i;
        const UIDTwo = "2" + i;
        const plusRadius = 9;
        const verticalPoint1 = [handle[0], handle[1] - plusRadius];
        const horizontalPoint1 = [handle[0] + plusRadius, handle[1]];
        const verticalPoint2 = [handle[0], handle[1] + plusRadius];
        const horizontalPoint2 = [handle[0] - plusRadius, handle[1]];

        const polylinePointsHorizontal = [horizontalPoint1, horizontalPoint2] as Point2[];
        const polylinePointsVertical = [verticalPoint1, verticalPoint2] as Point2[];
        const polylineOption = {
            lineWidth: 2,
            textBoxLinkLineDash: [0, 1],
            lineDash: [0, 0],
        };

        drawPolyline(svgDrawingHelper, annotationUID, UIDOne, polylinePointsHorizontal, polylineOption);
        drawPolyline(svgDrawingHelper, annotationUID, UIDTwo, polylinePointsVertical, polylineOption);
    });
}

function drawLine(svgDrawingHelper: SVGDrawingHelper, annotationUID: string, lineUID: string, start: Point2, end: Point2, options: TextOptions = {}, dataId = "") {
    if (isNaN(start[0]) || isNaN(start[1]) || isNaN(end[0]) || isNaN(end[1])) {
        return;
    }
    let { color = "rgb(0, 255, 0)", width = 10, lineWidth, lineDash, markerStartId = null, markerEndId = null } = options;
    const annotationState = annotation.state.getAnnotation(annotationUID);
    if (annotationState.highlighted && annotationState?.isSelected) {
        color = '#00ff00';
    }
    const strokeWidth = lineWidth ?? width;
    const svgns2 = "http://www.w3.org/2000/svg";
    const svgNodeHash = getHash_default(annotationUID, "line", lineUID);
    const existingLine = svgDrawingHelper.getSvgNode(svgNodeHash);
    const dropShadowStyle = "";
    const attributes = {
        x1: `${start[0]}`,
        y1: `${start[1]}`,
        x2: `${end[0]}`,
        y2: `${end[1]}`,
        stroke: color,
        style: dropShadowStyle,
        "stroke-width": strokeWidth,
        "stroke-dasharray": lineDash,
        "marker-start": markerStartId ? `url(#${markerStartId})` : "",
        "marker-end": markerEndId ? `url(#${markerEndId})` : ""
    };
    if (existingLine) {
        setAttributesIfNecessary_default(attributes, existingLine);
        svgDrawingHelper.setNodeTouched(svgNodeHash);
    } else {
        const newLine = document.createElementNS(svgns2, "line");
        if (dataId !== "") {
            newLine.setAttribute("data-id", dataId);
        }
        setNewAttributesIfValid_default(attributes, newLine);
        svgDrawingHelper.appendNode(newLine, svgNodeHash);
    }
}

function _getHash(annotationUID: string, drawingElementType: string, nodeUID: string) {
    return `${annotationUID}::${drawingElementType}::${nodeUID}`;
}

function setAttributesIfNecessary(attributes: Record<string, any>, svgNode: SVGElement) {
    Object.keys(attributes).forEach((key) => {
        const currentValue = svgNode.getAttribute(key);
        const newValue = attributes[key];
        if (newValue === void 0 || newValue === "") {
            svgNode.removeAttribute(key);
        } else if (currentValue !== newValue) {
            svgNode.setAttribute(key, newValue);
        }
    });
}

function setNewAttributesIfValid(attributes: Record<string, any>, svgNode: SVGElement) {
    Object.keys(attributes).forEach((key) => {
        const newValue = attributes[key];
        if (newValue !== void 0 && newValue !== "") {
            svgNode.setAttribute(key, newValue);
        }
    });
}

function drawLinkedTextBox(svgDrawingHelper: SVGDrawingHelper, annotationUID: string, textBoxUID: string, textLines: string[],
    textBoxPosition: Point2, annotationAnchorPoints: Point2[], options = {}) {
    const mergedOptions = {
        handleRadius: "9",
        centering: {
            x: false,
            y: true
        },
        isLinkRequired: false,
        ...options
    };
    if (textLines?.[0] == undefined || textLines[0] == 'undefined') return;
    const canvasBoundingBox = drawTextBox_default(svgDrawingHelper, annotationUID, textBoxUID, textLines, textBoxPosition, mergedOptions);
    if (mergedOptions.isLinkRequired)
        drawLink_default(svgDrawingHelper, annotationUID, textBoxUID, annotationAnchorPoints, textBoxPosition, canvasBoundingBox, mergedOptions);
    return canvasBoundingBox;
}

function drawTextBox(svgDrawingHelper: SVGDrawingHelper, annotationUID: string, textUID: string, textLines: string[],
    position: Point2, options = {}) {
    const mergedOptions = {
        fontFamily: "Helvetica, Arial, sans-serif",
        fontSize: "14px",
        color: "rgb(255, 255, 0)",
        background: "",
        padding: 7,
        centerX: false,
        centerY: true,
        isLeftDown: false,
        ...options
    };
    const textGroupBoundingBox = _drawTextGroup(svgDrawingHelper, annotationUID, textUID, position, mergedOptions, textLines);
    return textGroupBoundingBox;
}

function _drawTextGroup(svgDrawingHelper: SVGDrawingHelper, annotationUID: string, textUID: string, position: Point2, options: TextOptions, textLines = [""]) {
    const { padding, color, fontFamily, fontSize, background, isLeftDown, opacity = 1 } = options;
    let textGroupBoundingBox;
    const absPadding = isLeftDown ? (padding * -5.5) : padding + 2;
    const [x, y] = [position[0] - 3, position[1] + absPadding];
    const svgns2 = "http://www.w3.org/2000/svg";
    const svgNodeHash = getHash_default(annotationUID, "text", textUID);
    const existingTextGroup = svgDrawingHelper.getSvgNode(svgNodeHash);

    if (existingTextGroup) {
        const textElement = existingTextGroup.querySelector("text");
        if (!textElement) {
            throw new Error("Text element not found in existing text group");
        }
        const textSpans = Array.from(textElement.children);
        for (const [i, textSpanElement] of textSpans.entries()) {
            const text = textLines[i] || "";
            textSpanElement.textContent = text;
        }
        if (textLines.length > textSpans.length) {
            for (const textLine of textLines.slice(textSpans.length)) {
                const textSpan = _createTextSpan(textLine);
                textElement.appendChild(textSpan);
            }
        }

        const textAttributes = {
            fill: color,
            "font-size": fontSize,
            "font-family": fontFamily,
            opacity
        };
        const textGroupAttributes = {
            transform: `translate(${x} ${y})`
        };
        setAttributesIfNecessary_default(textAttributes, textElement);
        setAttributesIfNecessary_default(textGroupAttributes, existingTextGroup);
        existingTextGroup.setAttribute("data-annotation-uid", annotationUID);
        textGroupBoundingBox = _drawTextBackground(existingTextGroup, background);
        svgDrawingHelper.setNodeTouched(svgNodeHash);
    } else {
        const textGroup = document.createElementNS(svgns2, "g");
        textGroup.setAttribute("data-annotation-uid", annotationUID);
        textGroup.setAttribute("transform", `translate(${x} ${y})`);
        const textElement = _createTextElement(svgDrawingHelper, options);
        for (const textLine of textLines) {
            const textSpan = _createTextSpan(textLine);
            textElement.appendChild(textSpan);
        }
        textGroup.appendChild(textElement);
        svgDrawingHelper.appendNode(textGroup, svgNodeHash);
        textGroupBoundingBox = _drawTextBackground(textGroup, background);
    }
    return {
        x,
        y,
        height: textGroupBoundingBox?.height + padding,
        width: textGroupBoundingBox?.width + padding,
        ...textGroupBoundingBox
    };
}

function _createTextElement(svgDrawingHelper: SVGDrawingHelper, options: TextOptions) {
    const { color, fontFamily, fontSize } = options;
    const svgns2 = "http://www.w3.org/2000/svg";
    const textElement = document.createElementNS(svgns2, "text");
    const noSelectStyle = "user-select: none; pointer-events: none; -webkit-tap-highlight-color:  rgba(255, 255, 255, 0);";
    const dropShadowStyle = "";
    const combinedStyle = `${noSelectStyle}${dropShadowStyle}`;
    textElement.setAttribute("x", "0");
    textElement.setAttribute("y", "0");
    textElement.setAttribute("fill", color);
    textElement.setAttribute("font-family", fontFamily);
    textElement.setAttribute("font-size", fontSize);
    textElement.setAttribute("style", combinedStyle);
    textElement.setAttribute("pointer-events", "visible");

    return textElement;
}

function _createTextSpan(text: string) {
    const svgns2 = "http://www.w3.org/2000/svg";
    const textSpanElement = document.createElementNS(svgns2, "tspan");
    textSpanElement.setAttribute("x", "0");
    textSpanElement.setAttribute("dy", "1.2em");
    textSpanElement.textContent = text;
    return textSpanElement;
}

function _drawTextBackground(textGroup: SVGElement, background: any) {
    // Get the bounding box of the text element
    const textElement = textGroup.querySelector('text');
    const textBBox = textElement?.getBBox();

    // Find existing background rectangle or create a new one
    let backgroundRect = textGroup.querySelector('rect.text-background');

    if (!backgroundRect) {
        backgroundRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        backgroundRect.setAttribute("class", "text-background");
        // Insert the rect before the text element so text appears on top
        textGroup.insertBefore(backgroundRect, textElement);
    }

    // Set background properties
    if (background && textBBox) {
        const { color = 'white', border = null, pillShape = true, showDeleteButton = true } = background;

        // Apply background color
        backgroundRect.setAttribute("fill", color);

        // Set dimensions with padding
        const padding = 6; // Slightly more padding for pill shape
        const rectX = textBBox.x - padding;
        const rectY = textBBox.y - padding;
        const rectWidth = textBBox.width + padding * 2;
        const rectHeight = textBBox.height + padding * 2;

        backgroundRect.setAttribute("x", rectX.toString());
        backgroundRect.setAttribute("y", rectY.toString());
        backgroundRect.setAttribute("width", rectWidth.toString());
        backgroundRect.setAttribute("height", rectHeight.toString());

        // For pill shape, set border radius to half the height
        if (pillShape) {
            const radius = (rectHeight / 2).toString();
            backgroundRect.setAttribute("rx", radius);
            backgroundRect.setAttribute("ry", radius);
        } else {
            // Default border radius if not a pill shape
            const defaultRadius = "4"
            backgroundRect.setAttribute("rx", defaultRadius);
            backgroundRect.setAttribute("ry", defaultRadius);
        }

        // Apply border if specified
        if (border) {
            const { color: borderColor = 'black', width: borderWidth = 1 } = border;
            backgroundRect.setAttribute("stroke", borderColor);
            backgroundRect.setAttribute("stroke-width", borderWidth);
        } else {
            // Remove border if not specified
            backgroundRect.removeAttribute("stroke");
            backgroundRect.removeAttribute("stroke-width");
        }

        // Add the delete button ("-" symbol) at top right corner
        if (showDeleteButton) {
            const deleteButtonX = (rectX - 2) + rectWidth;
            const deleteButtonY = (rectY + 2);
            _createDeleteButton(textGroup, {
                show: true,
                radius: 8,
                bgColor: "white",
                strokeColor: "black",
                x: deleteButtonX,
                y: deleteButtonY
            });
        } else {
            _createDeleteButton(textGroup, { show: false });
        }

        // Return the updated bounding box with border width consideration
        const borderWidth = border?.width ?? 0;
        return {
            x: rectX - borderWidth / 2,
            y: rectY - borderWidth / 2,
            width: rectWidth + borderWidth,
            height: rectHeight + borderWidth
        };
    } else {
        // If no background is specified, hide the rect
        backgroundRect.setAttribute("fill", "none");
        backgroundRect.removeAttribute("stroke");
        backgroundRect.removeAttribute("rx");
        backgroundRect.removeAttribute("ry");

        // Remove delete button if it exists
        const existingButton = textGroup.querySelector('g.delete-button');
        if (existingButton) {
            textGroup.removeChild(existingButton);
        }

        // Return the original text bounding box
        return textBBox;
    }
}

function drawLink(svgDrawingHelper: SVGDrawingHelper, annotationUID: string, linkUID: string,
    annotationAnchorPoints: Point2[], refPoint: Point2, boundingBox: TextBoundingBox, options = {}) {
    const start =
        (annotationAnchorPoints.length > 0
            ? findClosestPoint(annotationAnchorPoints, refPoint) : refPoint);
    const boundingBoxPoints = _boundingBoxPoints(boundingBox);
    const end = findClosestPoint(boundingBoxPoints, start);
    const mergedOptions = {
        color: "rgb(255, 255, 0)",
        lineWidth: "1",
        lineDash: "2,3",
        ...options
    };
    drawLine(svgDrawingHelper, annotationUID, `link-${linkUID}`, start, end, mergedOptions);
}

function _boundingBoxPoints(
    boundingBox: PlanarBoundingBox
): Array<Point2> {
    const { x: left, y: top, height, width } = boundingBox;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const topMiddle = [left + halfWidth, top] as Point2;
    const leftMiddle = [left, top + halfHeight] as Point2;
    const bottomMiddle = [left + halfWidth, top + height] as Point2;
    const rightMiddle = [left + width, top + halfHeight] as Point2;

    return [topMiddle, leftMiddle, bottomMiddle, rightMiddle];
}

function findClosestPoint(
    sourcePoints: Array<Point2>,
    targetPoint: Point2
): Point2 {
    let minPoint = [0, 0];
    let minDistance = Number.MAX_SAFE_INTEGER;

    sourcePoints.forEach(function (sourcePoint) {
        const distance = _distanceBetween(targetPoint, sourcePoint);

        if (distance < minDistance) {
            minDistance = distance;
            minPoint = [...sourcePoint];
        }
    });

    return minPoint as Point2;
}

function _distanceBetween(p1: Point2, p2: Point2) {
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function drawPolyline(svgDrawingHelper: SVGDrawingHelper, annotationUID: string, polylineUID: string, points: Point2[], options: TextOptions) {
    if (points.length < 2) {
        return;
    }
    const { color = "rgb(255, 255, 0)", width = 10, fillColor = "none",
        fillOpacity = 0, lineWidth, lineDash, closePath = false, markerStartId = null, markerEndId = null } = options;
    const strokeWidth = lineWidth ?? width;
    const svgns2 = "http://www.w3.org/2000/svg";
    const svgNodeHash = getHash_default(annotationUID, "polyline", polylineUID);
    const existingPolyLine = svgDrawingHelper.getSvgNode(svgNodeHash);
    let pointsAttribute = "";
    for (const point of points) {
        pointsAttribute += `${point[0].toFixed(1)}, ${point[1].toFixed(1)} `;
    }
    if (closePath) {
        const firstPoint = points[0];
        pointsAttribute += `${firstPoint[0]}, ${firstPoint[1]}`;
    }
    const attributes = {
        points: pointsAttribute,
        stroke: color,
        fill: fillColor,
        "fill-opacity": fillOpacity,
        "stroke-width": strokeWidth,
        "stroke-dasharray": lineDash,
        "marker-start": markerStartId ? `url(#${markerStartId})` : "",
        "marker-end": markerEndId ? `url(#${markerEndId})` : ""
    };
    if (existingPolyLine) {
        setAttributesIfNecessary_default(attributes, existingPolyLine);
        svgDrawingHelper.setNodeTouched(svgNodeHash);
    } else {
        const newPolyLine = document.createElementNS(svgns2, "polyline");
        setNewAttributesIfValid_default(attributes, newPolyLine);
        svgDrawingHelper.appendNode(newPolyLine, svgNodeHash);
    }
}

const midPoint = (...args: (Point2 | Point3)[]): Point2 | Point3 => {
    const ret =
        args[0].length === 2 ? <Point2>[0, 0] : <Point3>[0, 0, 0];
    const len = args.length;
    for (const arg of args) {
        ret[0] += arg[0] / len;
        ret[1] += arg[1] / len;
        if (ret.length === 3) {
            ret[2] += (arg[2] ?? 0) / len;
        }
    }
    return ret;
};

function drawCircle(svgDrawingHelper: SVGDrawingHelper, annotationUID: string,
    circleUID: string, center: Point2, radius: number, options = {}, dataId = '') {
    const { color, fill, width, lineWidth, lineDash, fillOpacity, strokeOpacity, } = {
        color: 'rgb(0, 255, 0)',
        fill: 'transparent',
        width: '2',
        lineDash: undefined,
        lineWidth: undefined,
        strokeOpacity: 1,
        fillOpacity: 1,
        ...options
    };
    const strokeWidth = lineWidth ?? width;
    const svgns = 'http://www.w3.org/2000/svg';
    const svgNodeHash = _getHash(annotationUID, 'circle', circleUID);
    const existingCircleElement = svgDrawingHelper.getSvgNode(svgNodeHash);
    const attributes = {
        cx: `${center[0]}`,
        cy: `${center[1]}`,
        r: `${radius}`,
        stroke: color,
        fill,
        'stroke-width': strokeWidth,
        'stroke-dasharray': lineDash,
        'fill-opacity': fillOpacity,
        'stroke-opacity': strokeOpacity,
    };
    if (existingCircleElement) {
        setAttributesIfNecessary(attributes, existingCircleElement);
        svgDrawingHelper.setNodeTouched(svgNodeHash);
    }
    else {
        const newCircleElement = document.createElementNS(svgns, 'circle');
        if (dataId !== '') {
            newCircleElement.setAttribute('data-id', dataId);
        }
        setNewAttributesIfValid(attributes, newCircleElement);
        svgDrawingHelper.appendNode(newCircleElement, svgNodeHash);
    }
}

function drawEllipseByCoordinates(svgDrawingHelper: SVGDrawingHelper, annotationUID: string,
    ellipseUID: string, canvasCoordinates: Point2[], options = {}, dataId = '') {
    let { color, width, lineWidth, lineDash } = {
        color: 'rgb(0, 255, 0)',
        width: '2',
        lineWidth: undefined,
        lineDash: undefined,
        ...options
    };
    const annotationState = annotation.state.getAnnotation(annotationUID);
    if (annotationState.highlighted && annotationState?.isSelected) {
        color = '#00ff00';
    }
    const strokeWidth = lineWidth ?? width;
    const svgns = 'http://www.w3.org/2000/svg';
    const svgNodeHash = _getHash(annotationUID, 'ellipse', ellipseUID);
    const existingEllipse = svgDrawingHelper.getSvgNode(svgNodeHash);
    const [bottom, top, left, right] = canvasCoordinates;
    const w = Math.hypot(left[0] - right[0], left[1] - right[1]);
    const h = Math.hypot(top[0] - bottom[0], top[1] - bottom[1]);
    const angle = (Math.atan2(left[1] - right[1], left[0] - right[0]) * 180) / Math.PI;
    const center = [(left[0] + right[0]) / 2, (top[1] + bottom[1]) / 2];
    const radiusX = w / 2;
    const radiusY = h / 2;
    const attributes = {
        cx: `${center[0]}`,
        cy: `${center[1]}`,
        rx: `${radiusX}`,
        ry: `${radiusY}`,
        stroke: color,
        fill: 'transparent',
        transform: `rotate(${angle} ${center[0]} ${center[1]})`,
        'stroke-width': strokeWidth,
        'stroke-dasharray': lineDash,
    };
    if (existingEllipse) {
        setAttributesIfNecessary(attributes, existingEllipse);
        svgDrawingHelper.setNodeTouched(svgNodeHash);
    }
    else {
        const svgEllipseElement = document.createElementNS(svgns, 'ellipse');
        if (dataId !== '') {
            svgEllipseElement.setAttribute('data-id', dataId);
        }
        setNewAttributesIfValid(attributes, svgEllipseElement);
        svgDrawingHelper.appendNode(svgEllipseElement, svgNodeHash);
    }
}

function _createDeleteButton(textGroup: SVGElement, options: any = {}) {
    const {
        show = true,
        radius = 8,
        bgColor = "white",
        strokeColor = "black",
        x = 0,
        y = 0
    } = options;

    // If not showing, remove any existing button and return null
    if (!show) {
        const existingButton = textGroup.querySelector('g.delete-button');
        if (existingButton) {
            textGroup.removeChild(existingButton);
        }
        return null;
    }

    // Find existing delete button or create a new one
    let deleteButtonGroup = textGroup.querySelector('g.delete-button');

    if (!deleteButtonGroup) {
        // Create the button group
        deleteButtonGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        deleteButtonGroup.setAttribute("class", "delete-button");

        // Create white circle background
        const buttonCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        buttonCircle.setAttribute("r", radius);
        deleteButtonGroup.appendChild(buttonCircle);

        // Create minus symbol
        const minusSymbol = document.createElementNS("http://www.w3.org/2000/svg", "line");
        minusSymbol.setAttribute("stroke-width", (2).toString());
        minusSymbol.setAttribute("x1", (-radius / 2).toString());
        minusSymbol.setAttribute("y1", (0).toString());
        minusSymbol.setAttribute("x2", (radius / 2).toString());
        minusSymbol.setAttribute("y2", (0).toString());
        deleteButtonGroup.appendChild(minusSymbol);

        // Add to the textGroup
        textGroup.appendChild(deleteButtonGroup);

        // Make button clickable with a pointer cursor
        deleteButtonGroup.setAttribute("style", "cursor: pointer;");
        deleteButtonGroup.setAttribute("pointer-events", "all");
    }

    // Update visual properties
    const buttonCircle = deleteButtonGroup.querySelector('circle')!;
    buttonCircle.setAttribute("fill", bgColor);

    const minusSymbol = deleteButtonGroup.querySelector('line')!;
    minusSymbol.setAttribute("stroke", strokeColor);

    // Position the delete button
    deleteButtonGroup.setAttribute("transform", `translate(${x}, ${y})`);

    return deleteButtonGroup;
}

function _calculateCachedStats(annotation: SplineROIAnnotation, element: HTMLDivElement,
    targetImageData: IImageData, triggerAnnotationModified: Function) {
    const data = annotation.data;
    if (!data.contour.closed) {
        return;
    }
    const enabledElement = getEnabledElement(element);
    if (!enabledElement) {
        return;
    }
    const { viewport } = enabledElement;
    const { cachedStats } = data;
    if (!cachedStats) return;
    const { polyline: points } = data.contour;
    const targetIds = Object.keys(cachedStats);
    for (const targetId of targetIds) {
        const image = targetImageData;
        if (!image) {
            continue;
        }
        const { metadata } = image;
        const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));

        const canvasPoint = canvasCoordinates[0];
        const originalWorldPoint = viewport.canvasToWorld(canvasPoint);
        const deltaXPoint = viewport.canvasToWorld([
            canvasPoint[0] + 1,
            canvasPoint[1]
        ]);
        const deltaYPoint = viewport.canvasToWorld([
            canvasPoint[0],
            canvasPoint[1] + 1
        ]);
        const deltaInX = distance(originalWorldPoint, deltaXPoint);
        const deltaInY = distance(originalWorldPoint, deltaYPoint);
        const { imageData } = image;
        const { scale, areaUnit } = getCalibratedLengthUnitsAndScale(image, () => {
            const { maxX: canvasMaxX, maxY: canvasMaxY, minX: canvasMinX, minY: canvasMinY } = getAABB(canvasCoordinates);
            const topLeftBBWorld = viewport.canvasToWorld([
                canvasMinX,
                canvasMinY
            ]);
            const topLeftBBIndex = transformWorldToIndex(imageData, topLeftBBWorld);
            const bottomRightBBWorld = viewport.canvasToWorld([
                canvasMaxX,
                canvasMaxY
            ]);
            const bottomRightBBIndex = transformWorldToIndex(imageData, bottomRightBBWorld);
            return [topLeftBBIndex, bottomRightBBIndex];
        });
        let area = getArea(canvasCoordinates) / scale / scale;
        area *= deltaInX * deltaInY;
        cachedStats[targetId] = {
            Modality: metadata.Modality,
            area,
            areaUnit
        };
    }
    triggerAnnotationModified(annotation, enabledElement, ChangeTypes_default.StatsUpdated);
    return cachedStats;
};

function convertToPolylineArray(polyline: any, numDimensions: number) {
    if (Array.isArray(polyline[0])) return polyline;

    const totalPoints = polyline.length / numDimensions;
    return Array.from({ length: totalPoints }, (_, i) => {
        const point = [polyline[i * numDimensions], polyline[i * numDimensions + 1]];
        if (numDimensions === 3) point.push(polyline[i * numDimensions + 2]);
        return point;
    });
}

function updateBounds(x: number, y: number, z: number | undefined, bounds: Bounding, is3D: boolean) {
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
    if (is3D && z != undefined && bounds.minZ !== undefined && bounds.maxZ !== undefined) {
        bounds.minZ = Math.min(bounds.minZ, z);
        bounds.maxZ = Math.max(bounds.maxZ, z);
    }
}

function getAABB(polyline: Point2[], options: TextOptions = {}) {
    const numDimensions = options.numDimensions ?? 2;
    const is3D = numDimensions === 3;
    const polylineToUse = convertToPolylineArray(polyline, numDimensions);

    const bounds = {
        minX: Infinity, maxX: -Infinity,
        minY: Infinity, maxY: -Infinity,
        minZ: Infinity, maxZ: -Infinity
    };

    for (const [x, y, z] of polylineToUse) {
        updateBounds(x, y, z, bounds, is3D);
    }

    return is3D ? bounds : (({ minX, maxX, minY, maxY }) => ({ minX, maxX, minY, maxY }))(bounds);
}

function getArea(points: Point2[]) {
    const n = points.length;
    let area = 0;
    let j = n - 1;
    for (const [i, point] of points.entries()) {
        area += (points[j][0] + point[0]) * (points[j][1] - point[1]);
        j = i;
    }
    return Math.abs(area / 2);
}

function distance(a: Point3, b: Point3) {
    let x = b[0] - a[0];
    let y = b[1] - a[1];
    let z = b[2] - a[2];
    return Math.hypot(x, y, z);
}

function _renderStats(annotation: SplineROIAnnotation,
    viewport: Viewport, svgDrawingHelper: SVGDrawingHelper, textboxStyle: TextOptions, targetId: string,
    textLines: string[], renderStatsParams?: any[]) {
    const data = annotation.data;
    const metadata = annotation.metadata;
    if (data?.handles?.points == null || !data.handles.textBox) return;
    const canvasCoordinates = data.handles.points.map((p) => viewport.worldToCanvas(p));
    const textPosition = data.contour.closed ? data.handles?.points[1] : (data.handles.textBox?.worldPosition ?? data.handles?.points[0]);
    const textBoxPosition = viewport.worldToCanvas(textPosition);
    const textBoxUID = "textBox";
    const textBoxLabelUID = "labelBox";
    const customTextBoxPositionLabel = viewport.worldToCanvas(data.handles?.points[0]);
    //if (!('tagName' in metadata) || typeof metadata.tagName != 'string') return;
    const customTextBoxLabel = '';
    
    drawLinkedTextBox_default(svgDrawingHelper, annotation.annotationUID ?? "", textBoxLabelUID, [customTextBoxLabel], textBoxPosition, canvasCoordinates, textboxStyle);
    if (!data.spline.instance.closed || !textboxStyle.visibility) {
        return;
    }
    if (!textLines || textLines.length === 0) {
        return;
    }
    if (!data.handles.textBox.hasMoved) {
        const canvasTextBoxCoords = getTextBoxCoordsCanvas(canvasCoordinates);
        data.handles.textBox.worldPosition = viewport.canvasToWorld(canvasTextBoxCoords);
    }
    const boundingBox = drawLinkedTextBox_default(svgDrawingHelper, annotation.annotationUID ?? "", textBoxUID, textLines, textBoxPosition, canvasCoordinates, {});
    if (!boundingBox) return;
    const { x: left, y: top, width, height } = boundingBox;
    data.handles.textBox.worldBoundingBox = {
        topLeft: viewport.canvasToWorld([left, top]),
        topRight: viewport.canvasToWorld([left + width, top]),
        bottomLeft: viewport.canvasToWorld([left, top + height]),
        bottomRight: viewport.canvasToWorld([left + width, top + height])
    };
};

function _getSplineConfig(type: string, config: TextOptions) {
    const splineConfigs = config.spline.configuration;
    return { DEFAULT_SPLINE_CONFIG, ...splineConfigs[type] };
}

function _updateSplineInstance(element: HTMLDivElement, annotation: SplineROIAnnotation, config: TextOptions) {
    const enabledElement = getEnabledElement(element) as IEnabledElement & { viewport: Viewport };
    const { viewport } = enabledElement;
    if (!viewport) return;
    const { worldToCanvas } = viewport;
    const { data } = annotation;
    const { type: splineType, instance: spline } = annotation.data.spline;
    const splineConfig = _getSplineConfig(splineType, config);
    const worldPoints = data?.handles?.points ?? [[0, 0, 0]];
    const canvasPoints = worldPoints.map(worldToCanvas);
    const resolution = splineConfig.resolution !== void 0 ? parseInt(splineConfig.resolution) : void 0;
    const scale = splineConfig.scale !== void 0 ? parseFloat(splineConfig.scale) : void 0;
    spline.setControlPoints(canvasPoints);
    spline.closed = !!data.contour.closed;
    if (!spline.fixedResolution && resolution !== void 0 && spline.resolution !== resolution) {
        spline.resolution = resolution;
        annotation.invalidated = true;
    }
    if (spline instanceof CardinalSpline && !spline.fixedScale && scale !== void 0 && spline.scale !== scale) {
        spline.scale = scale;
        annotation.invalidated = true;
    }
    return spline;
}

function ContourSegmentRenderAnnotationInstance(renderContext: any) {
    const renderResult = ContourBaseRenderAnnotationInstance(renderContext);
    return renderResult;
}

function ContourBaseRenderAnnotationInstance(renderContext: any) {
    const { enabledElement, annotationStyle, svgDrawingHelper } = renderContext;
    const annotation = renderContext.annotation;
    if (annotation.parentAnnotationUID) {
        return;
    }
    const { annotationUID } = annotation;
    const { viewport } = enabledElement;
    const { worldToCanvas } = viewport;
    const polylineCanvasPoints = getPolylinePoints(annotation).map((point) => worldToCanvas(point));
    const { lineWidth, lineDash, color, fillColor, fillOpacity } = annotationStyle;
    const childContours = getContourHolesDataCanvas(annotation, viewport);
    const allContours = [polylineCanvasPoints, ...childContours];
    drawPath(svgDrawingHelper, annotationUID, "contourPolyline", allContours, {
        color,
        lineDash,
        lineWidth: Math.max(0.1, lineWidth),
        fillColor,
        fillOpacity
    });
    return true;
}

function getPolylinePoints(annotation: SplineROIAnnotation) {
    return annotation.data.contour?.polyline ?? annotation.data.polyline;
}

function drawPath(svgDrawingHelper: any, annotationUID: any, pathUID: any, points: any, options: any = {}) {
    const hasSubArrays = points.length && points[0].length && Array.isArray(points[0][0]);
    const pointsArrays = hasSubArrays ? points : [points];
    let { color = "rgb(0, 255, 0)", width = 10, fillColor = "none", fillOpacity = 0, lineWidth, lineDash, closePath = false } = options;
    const annotationState = annotation.state.getAnnotation(annotationUID) as SplineROIAnnotation;
    if (annotationState.highlighted && (annotationState?.isSelected || !annotationState.data.contour?.closed)) {
        color = '#00ff00';
    }

    const strokeWidth = lineWidth ?? width;
    const svgns2 = "http://www.w3.org/2000/svg";
    const svgNodeHash = getHash_default(annotationUID, "path", pathUID);
    const existingNode = svgDrawingHelper.getSvgNode(svgNodeHash);
    let pointsAttribute = pointsAttributeUpdatation(closePath, pointsArrays);
    if (!pointsAttribute) {
        return;
    }
    const attributes = {
        d: pointsAttribute,
        stroke: color,
        fill: fillColor,
        "fill-opacity": fillOpacity,
        "stroke-width": strokeWidth,
        "stroke-dasharray": lineDash
    };
    if (existingNode) {
        setAttributesIfNecessary_default(attributes, existingNode);
        svgDrawingHelper.setNodeTouched(svgNodeHash);
    } else {
        const newNode = document.createElementNS(svgns2, "path");
        setNewAttributesIfValid_default(attributes, newNode);
        svgDrawingHelper.appendNode(newNode, svgNodeHash);
    }
}

function pointsAttributeUpdatation(closePath: any, pointsArrays: any) {
    let pointsAttribute = "";
    for (let i = 0, numArrays = pointsArrays.length; i < numArrays; i++) {
        const points2 = pointsArrays[i];
        const numPoints = points2.length;
        if (numPoints < 2) {
            continue;
        }
        for (let j = 0; j < numPoints; j++) {
            const point = points2[j];
            const cmd = j ? "L" : "M";
            pointsAttribute += `${cmd} ${point[0].toFixed(1)}, ${point[1].toFixed(1)} `;
        }
        if (closePath) {
            pointsAttribute += "Z ";
        }
    }

    return pointsAttribute;
}

function defaultGetTextLines3(data: any, targetId: any) {
    const cachedVolumeStats = data.cachedStats[targetId];
    const { area, mean, stdDev, length, perimeter, max, isEmptyArea, unit, areaUnit, modalityUnit } = cachedVolumeStats ?? {};
    const textLines = [];
    if (area) {
        const areaLine = isEmptyArea ? `Area: Oblique not supported` : `Area: ${roundNumber(area)} ${areaUnit}`;
        textLines.push(areaLine);
    }
    if (mean) {
        textLines.push(`Mean: ${roundNumber(mean)} ${modalityUnit}`);
    }
    if (Number.isFinite(max)) {
        textLines.push(`Max: ${roundNumber(max)} ${modalityUnit}`);
    }
    if (stdDev) {
        textLines.push(`Std Dev: ${roundNumber(stdDev)} ${modalityUnit}`);
    }
    if (perimeter) {
        textLines.push(`Perimeter: ${roundNumber(perimeter)} ${unit}`);
    }
    if (length) {
        textLines.push(`${roundNumber(length)} ${unit}`);
    }
    return textLines;
}

function freeHandROIHydration(viewport: StackViewport, toolName: string, worldPoints: Point3[], options: TextOptions, closed: boolean = false) {
    const viewReference = viewport.getViewReference();
    const { viewPlaneNormal = [0, 0, 1], FrameOfReferenceUID } = viewReference;
    const annotation = {
        annotationUID: options?.annotationUID ?? uuidv4(),
        data: {
            handles: {
                points: []
            }
        },
        contour: {
            closed: closed,
            polyline: worldPoints,
            windingDirection: 1,
            label: ''
        },
        highlighted: false,
        autoGenerated: false,
        invalidated: false,
        isLocked: false,
        isVisible: true,
        metadata: {
            toolName,
            viewPlaneNormal,
            FrameOfReferenceUID,
            worldPoints: worldPoints,
            closed: closed,
            referencedImageId: getReferencedImageId(viewport, worldPoints[0], viewPlaneNormal),
            ...options
        }
    };
    addAnnotation(annotation, viewport.element);
    return annotation;
}

function getReferencedImageId(viewport: StackViewport, worldPos: Point3, viewPlaneNormal: Point3) {
    let referencedImageId;
    referencedImageId = getClosestImageIdForStackViewport(viewport, worldPos, viewPlaneNormal);
    return referencedImageId;
}

const pointsAreWithinCloseContourProximity = (p1: Point2, p2: Point2, closeContourProximity: number) => {
    return distance3(p1, p2) <= closeContourProximity;
};

function distance3(a: Point2, b: Point2) {
    const x = b[0] - a[0], y = b[1] - a[1];
    return Math.hypot(x, y);
}

function calculateUShapeContourVectorToPeakIfNotPresent(
    enabledElement: IEnabledElement,
    annotation: PlanarFreehandROIAnnotation
): void {
    annotation.data.openUShapeContourVectorToPeak ??=
        findOpenUShapedContourVectorToPeakOnRender(enabledElement, annotation);
}

function findOpenUShapedContourVectorToPeakOnRender(
    enabledElement: IEnabledElement,
    annotation: PlanarFreehandROIAnnotation
): Point3[] {
    const { viewport } = enabledElement;
    const canvasPoints = annotation.data.contour.polyline.map(
        viewport.worldToCanvas
    );

    return findOpenUShapedContourVectorToPeak(canvasPoints, viewport);
}

function findOpenUShapedContourVectorToPeak(
    canvasPoints: Point2[],
    viewport: IStackViewport | IVolumeViewport
): Point3[] {
    // Find chord from first to last point.
    const first = canvasPoints[0];
    const last = canvasPoints[canvasPoints.length - 1];

    const firstToLastUnitVector = vec2.create();

    vec2.set(firstToLastUnitVector, last[0] - first[0], last[1] - first[1]);
    vec2.normalize(firstToLastUnitVector, firstToLastUnitVector);

    // Get the two possible normal vector to this vector
    // Note: Use the identity that the perpendicular line must have a gradient of
    // 1 / gradient of the line.

    const normalVector1 = vec2.create();
    const normalVector2 = vec2.create();

    vec2.set(normalVector1, -firstToLastUnitVector[1], firstToLastUnitVector[0]);
    vec2.set(normalVector2, firstToLastUnitVector[1], -firstToLastUnitVector[0]);

    // Find the center of the chord.
    const centerOfFirstToLast: Point2 = [
        (first[0] + last[0]) / 2,
        (first[1] + last[1]) / 2,
    ];

    // Get furthest point.

    const furthest = {
        dist: 0,
        index: 0,
    };

    for (let i = 0; i < canvasPoints.length; i++) {
        const canvasPoint = canvasPoints[i];

        const distance = vec2.dist(canvasPoint, <vec2>centerOfFirstToLast);

        if (distance > furthest.dist) {
            furthest.dist = distance;
            furthest.index = i;
        }
    }

    const toFurthest: [Point2, Point2] = [
        canvasPoints[furthest.index],
        centerOfFirstToLast,
    ];
    const toFurthestWorld = toFurthest.map(viewport.canvasToWorld);

    return toFurthestWorld;
}

function defaultGetTextLines4(data, targetId) {
  const { cachedStats, label } = data;
  const { length, width, unit } = cachedStats[targetId];
  const textLines = [];
  if (label) {
    textLines.push(label);
  }
  if (length === void 0) {
    return textLines;
  }
  textLines.push(`L: ${roundNumber2(length)} ${unit || unit}`, `W: ${roundNumber2(width)} ${unit}`);
  return textLines;
}

function roundNumber2(value, precision = 2) {
  if (Array.isArray(value)) {
    return value.map((v) => roundNumber2(v, precision)).join(", ");
  }
  if (value === void 0 || value === null || value === "") {
    return "NaN";
  }
  value = Number(value);
  const absValue = Math.abs(value);
  if (absValue < 1e-4) {
    return `${value}`;
  }
  const fixedPrecision = absValue >= 100 ? precision - 2 : absValue >= 10 ? precision - 1 : absValue >= 1 ? precision : absValue >= 0.1 ? precision + 1 : absValue >= 0.01 ? precision + 2 : absValue >= 1e-3 ? precision + 3 : precision + 4;
  return value.toFixed(fixedPrecision);
}

const pointsAreWithinCloseContourProximity2 = pointsAreWithinCloseContourProximity;
const drawCircle_default = drawCircle;
const drawEllipseSvg_default = drawEllipseByCoordinates;
const drawHandle_default = drawHandle;
const getHash_default = _getHash;
const setAttributesIfNecessary_default = setAttributesIfNecessary;
const setNewAttributesIfValid_default = setNewAttributesIfValid;
const drawTextBox_default = drawTextBox;
const drawLink_default = drawLink;

const drawHandles_default = drawHandles;
const drawHandles_defaultPlus = drawHandlesPlus;
const drawLinkedTextBox_default = drawLinkedTextBox;
const midPoint2 = midPoint;

export {
    drawHandles_default, drawHandles_defaultPlus, drawLinkedTextBox_default, drawLine, midPoint2, drawTextBox_default,
    drawCircle_default, drawEllipseSvg_default, drawPolyline, _updateSplineInstance, _renderStats, _calculateCachedStats, _getSplineConfig,
    ContourSegmentRenderAnnotationInstance, defaultGetTextLines3, freeHandROIHydration, pointsAreWithinCloseContourProximity2,
    calculateUShapeContourVectorToPeakIfNotPresent, drawHandle_default, //drawHandleDeleteCircle, drawMinusLine, 
    getHash_default,
    setAttributesIfNecessary_default, setNewAttributesIfValid_default, convertToPolylineArray,
    updateBounds, getAABB, getArea, distance, distance3, _createDeleteButton,defaultGetTextLines4
}

export function addParamIfMissing(input: string): string {
  const pattern = /^([A-Za-z.]+)(\d+)$/;
  const match = pattern.exec(input); // use RegExp.exec()

  if (/\(\d+\)/.test(input)) {
    return input; // already has param
  }

  if (match) {
    const [, prefix, number] = match;
    return `${prefix}(${number})`;
  }

  return input;
};
