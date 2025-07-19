import { BidirectionalTool } from "@cornerstonejs/tools";
import {
  getAnnotation,
  getAnnotations,
} from "@cornerstonejs/tools/annotation/annotationState";
import { isAnnotationVisible } from "@cornerstonejs/tools/annotation/annotationVisibility";
import type SVGDrawingHelper from "@cornerstonejs/tools/types/SVGDrawingHelper";
import {
  getEnabledElement,
  VolumeViewport,
  type Types,
} from "@cornerstonejs/core";
import type { IEnabledElement, Point2, Point3 } from "@cornerstonejs/core/types";
import {
  defaultGetTextLines4,
  drawHandles_default,
  drawHandles_defaultPlus,
  drawLine,
  drawLinkedTextBox_default,
} from "./CustomLibrary";
import {
  type ExtendedMetadata,
  type AnnotationData,
  type StyleSpecifier,
} from "../types/tools-type";
import type { Annotation } from "@cornerstonejs/tools/types/AnnotationTypes";
import getTextBoxCoordsCanvas from "@cornerstonejs/tools/utilities/drawing/getTextBoxCoordsCanvas";
import type { InteractionEventType } from "@cornerstonejs/tools/types/EventTypes";
import { isAnnotationLocked } from "@cornerstonejs/tools/annotation/annotationLocking";
import { currentcustomLabel } from '~/composables/labelState'

// Read value:
console.log(currentcustomLabel.value)
export class custombidirectional extends BidirectionalTool {
  constructor(
    toolProps = {},
    defaultToolProps = {
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        preventHandleOutsideImage: false,
        getTextLines: defaultGetTextLines4,
      },
    }
  ) {
    super(toolProps, defaultToolProps);
  }

  override renderAnnotation = (enabledElement : IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => {
    let renderStatus = true;
    const { viewport } = enabledElement;
    const { element } = viewport;
    let annotations = getAnnotations(this.getToolName(), element);
    if (!annotations?.length) {
      return renderStatus;
    }
    annotations = this.filterInteractableAnnotationsForElement(
      element,
      annotations
    );
    if (!annotations?.length) {
      return renderStatus;
    }
    const targetId = this.getTargetId(viewport);
    const renderingEngine = viewport.getRenderingEngine();
    const styleSpecifier: StyleSpecifier = {
      toolGroupId: this.toolGroupId,
      toolName: this.getToolName(),
      viewportId: enabledElement.viewport.id,
      annotationUID: '',
    };
    for (let i = 0; i < annotations.length; i++) {
      const annotation = annotations[i];
      const annotationUID = annotation?.annotationUID
      const data = annotation?.data
      const points  = data?.handles?.points;
      const activeHandleIndex = data?.handles?.activeHandleIndex
      if(!points) return false
      const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
      if(!annotationUID) return false
         styleSpecifier.annotationUID = annotationUID;
      
     
      const { color, lineWidth, lineDash, shadow } = this.getAnnotationStyle({
        annotation,
        styleSpecifier,
      });
     
      if (
        !data.cachedStats[targetId] ||
        data.cachedStats[targetId].unit == null
      ) {
        data.cachedStats[targetId] = {
          length: null,
          width: null,
          unit: null,
        };
        this._calculateCachedStats(annotation, renderingEngine, enabledElement);
      } else if (annotation.invalidated) {
        this._throttledCalculateCachedStats(
          annotation,
          renderingEngine,
          enabledElement
        );
      }
      if (!viewport.getRenderingEngine()) {
        console.warn("Rendering Engine has been destroyed");
        return renderStatus;
      }
      let activeHandleCanvasCoords;
      if (!isAnnotationVisible(annotationUID)) {
        continue;
      }
      if (
        !isAnnotationLocked(annotationUID) &&
        !this.editData &&
        activeHandleIndex !== null
      ) {
        activeHandleCanvasCoords = [canvasCoordinates[activeHandleIndex]];
      }

      
      if (activeHandleCanvasCoords) {
        const handleGroupUID = "0";
        drawHandles_default(
          svgDrawingHelper,
          annotationUID,
          handleGroupUID,
          activeHandleCanvasCoords,
          {
            color,
          }
        );

        
      }

      const dataId1 = `${annotationUID}-line-1`;
      const dataId2 = `${annotationUID}-line-2`;
      const lineUID = "0";
        const handleColor = "yellow";
      drawLine(
        svgDrawingHelper,
        annotationUID,
        lineUID,
        canvasCoordinates[0],
        canvasCoordinates[1],
        {
          color,
          lineDash,
          lineWidth,
          shadow,
        },
        dataId1
      );
      const secondLineUID = "1";
      drawLine(
        svgDrawingHelper,
        annotationUID,
        secondLineUID,
        canvasCoordinates[2],
        canvasCoordinates[3],
        {
          color,
          lineDash,
          lineWidth,
          shadow,
        },
        dataId2
      );

      drawHandles_defaultPlus(svgDrawingHelper, annotationUID, "2", canvasCoordinates, {
            handleColor,
            lineDash,
            lineWidth
          });
      renderStatus = true;
      const options = this.getLinkedTextBoxStyle(styleSpecifier, annotation);
      if (!options.visibility) {
        data.handles.textBox = {
          hasMoved: false,
          worldPosition: [0, 0, 0],
          worldBoundingBox: {
            topLeft: [0, 0, 0],
            topRight: [0, 0, 0],
            bottomLeft: [0, 0, 0],
            bottomRight: [0, 0, 0],
          },
        };
        continue;
      }
      const textLines = this.configuration.getTextLines(data, targetId);
      if (!textLines || textLines.length === 0) {
        continue;
      }
      let canvasTextBoxCoords;
      if (!data.handles.textBox.hasMoved) {
        canvasTextBoxCoords = getTextBoxCoordsCanvas(canvasCoordinates);
        data.handles.textBox.worldPosition =
          viewport.canvasToWorld(canvasTextBoxCoords);
      }
     

      const customTextBoxPositionLabel = viewport.worldToCanvas(data.handles?.points[1] as Point3);
      const textBoxUID = "1";
      const boundingBox = drawLinkedTextBox_default(
        svgDrawingHelper,
        annotationUID,
        textBoxUID,
        textLines,
        customTextBoxPositionLabel,
        canvasCoordinates,
        {},
        options
      );
      
      //const customTextBoxPositionLabel2 = viewport.worldToCanvas(data.handles?.points[3] as Point3);

       // Show second textbox only after drawing is completed
const isDrawingThis =
  this.editData?.annotation?.annotationUID === annotationUID &&
  this.editData?.newAnnotation === true;

if (!isDrawingThis && points.length === 4) {
  const customTextBoxPositionLabel2 = viewport.worldToCanvas(
    data.handles?.points[3] as Point3
  );

  // Only assign label if not already set
  if (!data.label) {
    if(currentcustomLabel.value === ''){
      data.label= "No label"
    }
    else{
      data.label = currentcustomLabel.value;
    }
    //data.label = currentcustomLabel.value;
    
  }
  if(data.label != 'No label'){
    const textLines2 = [data.label];

  drawLinkedTextBox_default(
    svgDrawingHelper,
    annotationUID,
    '2',
    textLines2,
    customTextBoxPositionLabel2,
    canvasCoordinates,
    {},
    options
  );
  }
  
}


      const { x: left, y: top, width, height } = boundingBox;
      //const { x: left, y: top, width, height } = boundingBox2;
      data.handles.textBox.worldBoundingBox = {
        topLeft: viewport.canvasToWorld([left, top]),
        topRight: viewport.canvasToWorld([left + width, top]),
        bottomLeft: viewport.canvasToWorld([left, top + height]),
        bottomRight: viewport.canvasToWorld([left + width, top + height]),
      };
    }
    return renderStatus;
  };
}
