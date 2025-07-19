import type { Biometry, Value } from "./Measurement";

const FetusColorCode='#4978ce'
const FaceColorCode='#6acdd3'

export enum AnalysisStatus {
    Optimal = 'Optimal',
    SubOptimal = 'Sub Optimal',
    NotAcquired = 'Not Acquired',
    InProcess = 'In Process',
    Acquired = 'Acquired'
}

export enum AiVerificationStatus {
    YetToStart = 'Not Acquired',
    InProgress = 'In Process',
    ImageAcquired = 'Acquired'
}

export enum ClinicalAccuracy {
    Visualized = 'Visualized',
    LowConfidence = 'Low Confidence',
    NotVisualized = 'Not Visualized'
}

export enum ImageType {
    NativeFrame = 1,
    AnnotationFrame = 2,
    MeasurementFrame = 3,
    MeasurementAnnotationFrame = 4
}

export enum ToolSelectType {
    Annotation = 'annotation',
    Measurement = 'measurement',
    MeasurementTag = 'measurement-tag',
    ResetAllTools = 'reset-all-tools'
}

export interface AnnotationItems {
    annotationMasterId: number;
    annotationName: string;
    isSelected?: boolean;
}

export type Annotation = {
    index: number;
    annotationId: number;
    annotationMasterId: number
    frameIndex: number
    annotationName: string
    points: [number, number]
    isSelected: boolean
    annotationUID?: string
    isRequired?: boolean
}

export type Section = {
    title: string
    image: string
    techniques: string[]
    landmarks: string[]
    references: {
        text:  string
        link: string
    }
}
export type References = {
    text: string
    link: string
}


export type FrameIndices = [number, number]
export type BookmarkItem = {
    bookmarkId: number
    bookmarkName: string
    bookmarkIndex: number
}
export type measuremnetValue = {
    value: Value[]
    measurementTagId: number;
    measurementToolId: number;
}

export type ThumbnailMeasurementData = {
    measurementAcronym: string
    measurementTagName: string
    measurementName: string
    measurementValue: measuremnetValue[],
    measurementTrailDecimal: number
    measurementGa: string
    measurementTagId?: number
}

export type Thumbnail = {
    frames?: Thumbnail[],
    frameId: number,
    frameIndex: number,
    frameSequence: number,
    frameIndices: FrameIndices
    frameBase64: string,
    style?: Partial<CSSStyleDeclaration>,
    progressStyle?: Partial<CSSStyleDeclaration>,
    thumbnailId?: number,
    status?: boolean,
    clipboardId?: number,
    imageType?: number,
    isClipboardImage: boolean
    inProgress: boolean
    isStarredImage?: boolean
    measurementSequence?: string
    bookmarkIndices?: number[]
    bookmarkList?: BookmarkItem[]
    measurements: ThumbnailMeasurementData[]
    isSelected?: boolean
    value?: number
    unit?: string
    brightness?: number
    contrast?: number
    isCroppedImage?: boolean
}

export type DiagnosticView = {
    isSelected?: boolean;
    diagnosticViewId: number,
    diagnosticViewName: string,
    diagnosticViewStatusId: number,
    diagnosticViewStatusName: string,
    acquiredCount: number,
    label:string,
    detailedViewLabel:string,
    noOfSequence: number,
    slotStatus: object,
    slotsPerSequence: number,
    thumbnails: Thumbnail[],
    clipboards?: Thumbnail[],
    additionalAcquisitions: Thumbnail[],
    noOfAdditionalAcquisitions: number,
    thumbnailTemplateName: string,
    isAnimated?: boolean,
    isGA?: boolean
}

export type Anatomy = {
    anatomyName: string,
    anatomyId: number,
    status: AiVerificationStatus,
    id: number,
    isVisible:boolean
    diagnosticViewData: DiagnosticView[]
    frameIndices: FrameIndices
    video: {
        src: string
        metadata: {
            width: number
            height: number
            pixelResolution: number
        }
    };
    measurements: Biometry[]
    annotations: Annotation[]
    info: {
        title: string
        type?: string
        sections?: Section[]
        label?:string
        image?:string
        keyInformation?: string[]
        actions?:string[]
        references?:References[]
    }[],
    anatomyStatusName:string
    manualMeasure?: boolean
    erase?: boolean
    annotateText?: Annotation
    annotatePoints?: [number, number]
    redo?: boolean
    undo?: boolean
    reset?: boolean
    name?: string
    noOfSequence: number
    acquiredCount: number
}

export type SuggestedLoop = {
    id: number
    anatomyName: string
    diagnosticViewName: string
    frameBase64:  string
    frameSequence: number
    startFrameIndex: number
    endFrameIndex: number
    label?: string
}

export type AdditionalLoop = {
    startIndex: number
    endIndex: number
    frameBase64:  string
    examId: number
    name: string
    id: number
}


export type FilteredAnatomyResult = {
  [key: string]: {
    images: Anatomy[];
    cines: Anatomy[];
    charts: any[];
}
};


export type OptimalFramesResult = {
      OptimalFrameDetails: Anatomy[];
      inProcess:number;
      notAcquired:number;
      acquired:number
  };

export type DatailedViewQualityCriteria = {
    diagnosticViewId: number,
    diagnosticViewName: string,
    imageMagnification: number,
    sequences: Sequences[],
}

export type Sequences = {
    sequenceNo: number,
    qualityCriteria: QualityCriteria[]
}

export type QualityCriteria = {
    criteriaInSequenceId: number,
    isVisible: boolean,
    qualityCriteriaId: number,
    qualityCriteriaName: string
    qualityCriteriaDescription?: string
}


export type AdditionalDiagnosticView = {
    diagnosticViewId: number;
    diagnosticViewName: string;
    isSelected: boolean;
    noOfAdditionalAcquisitions: number;
}

export type AdditionalAnatomy = {
  anatomyId: number;
  anatomyName: string;
  isSelected: boolean;
  indeterminateState: boolean;
  diagnosticViews: AdditionalDiagnosticView[];
}

export type AdditionalAcquisition = AdditionalAnatomy[];

export const anatomyTheme: Record<string, string> = {
    Fetus: FetusColorCode,
    CRL: FetusColorCode,
    Heart: '#ceab51',
    Abdomen: '#db6d36',
    Uterus: '#115d5e',
    Head: '#c4e458',
    Neck: '#378ebb',
    Spine: '#ce5758',
    Extremities: '#c97287',
    Cervix: '#af55f3',
    Profile: FaceColorCode,
    Face: FaceColorCode,
};
