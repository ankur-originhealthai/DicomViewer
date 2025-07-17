import type { Point3 } from '@cornerstonejs/core/types'
import { Range } from '@/types/exam'

export type coordinates = {
    points: Point3[]
}

export type Measurement = {
    id: number | string;
    measurementTagId: number;
    measurementToolId: number;
    measurementTagName: string;
    measurementToolAcronym: string;
    tagPosition: number;
    tempTagPosition: number;
    cornerToolName: string;
    frameId: number | null;
    frameIndex: number | null;
    coordinates: coordinates;
    measurementValue: Array<MeasurementValueItem> | null | undefined;
    value?: Array<MeasurementValueItem> | null;
    pixelResolution: number;
    frameIndices: Array<number>;
    frameSequence: number | null;
    optimalRanges: Range[];
    thumbnailId: number | null;
    thumbnailImageType: number;
    trailDecimal: number;
    status :boolean | null;
    isRequired: boolean;
}


export type MeasurementValueItem = {
    name: string,
    value: number,
    unit: string,
    toolName: string
}

export type  Coordinates = {
    points:  Array<number>;
}

export type Value  = {
    name: string;
    unit: string;
    value: number;
    toolName: string;
  }
 
export type MeasurementSequenceValue = {
    coordinates?: Coordinates;
    measurementTagId: number;
    tagName: string;
    toolName: string;
    value: Value[];
} 
  
export type  MeasurementValue = {
    frameId: number | null,
    frameIndex: number | null,
    frameIndices: Array<number>,
    frameSequence: number | null,
    diagnosticViewId: number | null,
    isClipboardImage: number | null,
    measurementTagId: number | null,
    tagcount: number | null
    value: Value
    thumbnailId?: number,
}
  
export type MeasurementKey = "m1" | "m2" | "m3"

export type Biometry = {
    diagnosticViewId: number,
    diagnosticViewInMeasurementsId: number,
    measurementName: string,
    noOfSequence: number,
    noOfAdditionalAcquisitions: number,
    acronym: string,
    threshold: [number, number],
    method: string,
    chart: string,
    m1: MeasurementValue | null,
    m2: MeasurementValue | null,
    m3: MeasurementValue | null,
    trailDecimal: number,
    measurementTagId: number,
    measurementToolId: number,
    isGA?: boolean
}

export type MeasurementData = {
    GP: string | null;
    acronym: string;
    frameId: number;
    frameIndex: number;
    name: string;
    points: number[];
    value: number | string; // Assuming value can be either number or string
}

export type MeasurementMethod = {
    id: number,
    name: string
}

export type MeasurementTags = {
    id: number,
    name: string,
    toolId: number,
    tagPosition: number,
    tagsCount: number,
    trailDecimal: number,
    cornerstoneToolName: string
}

export type MeasurementTools = {
    id: number,
    name: string
    icon: string
    cornerstoneToolName: string
    acronym: string
}

export type ActiveToolType = {
    id: number | null,
    cornerstoneToolName: string | null
}

export type ActiveTagType = {
    id: number | null,
    name: string | null
}

export type SequenceMeasurementData = {
    value: Value[];
    tagName: string;        // e.g., "CRL", "IT"
    tagPosition: number;    // position index
    measurementTagId: number;
  };
  
export type Frame = {
    frameId: number;
    frameIndex: number;
    measurementData: SequenceMeasurementData[];
    isClipboardImage: boolean;
    isBookMarkFrame: boolean;
    trailDecimal: number;
};

export type getMeasuremnetSequence = {
    thumbnail: Frame[];
    bookmark: Frame[];
}

export type Formuladata = {
    id: number,
    name: string,
    referenceKey: string
}

export type TagsWithGA = {
  measurementTagId: number;
  measurementTagName: string;
  formulaId: number;
  formulaName: string;
}

export type ImageLimitState = {
    maxX: number;
    maxY: number;
    minCanvas: number[];
    maxCanvas: number[];
    canvasHeight: number;
    canvasWidth: number;
    imageHeight: number;
    imageWidth: number;
}