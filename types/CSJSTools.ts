import type { Point3 } from "@cornerstonejs/core/types";

export enum csjsTools {
  Erase = 'manual-erase',
  Annotate = 'manual-annotate',
  Label = 'Label',
  Length = 'Length',
  CobbAngle = 'CobbAngle',
  Spline = 'SplineROI',
  Reset = 'ai-reset',
  Rotate = 'RotateTool',
  HFlip = 'hFlip',
  VFlip = 'vFlip',
  Pan = 'PanTool',
  Zoom = 'ZoomRool',
  Redo = 'ai-redo',
  Undo = 'ai-undo',
  Crop = 'crop',
  Ellipse = 'EllipticalROI',
  Angle = 'Angle',
  VolumeLengthTool = 'VolumeLengthTool',
  VolumeEllipseTool = 'VolumeEllipseTool',
  PlanarFreehandROI = 'PlanarFreehandROI'
};

export const CornerStoneIDs = {
  viewportId: 'COLOR_STACK',
  cornerstoneElementId: 'cornerstone-element-id',
  renderingEngineId: 'detailedViewEngine',
  toolGroupId: 'manualToolGroup',
  fullScaleElementId: 'full-scale-element-for-capture-image',
  fullScaleViewpotId: 'full-scale-viewpotId',
};


export const csjsToolsWith = {
  TwoPoints: [csjsTools.Length],
  FourPoints: [csjsTools.Ellipse, csjsTools.CobbAngle, csjsTools.Angle, csjsTools.VolumeLengthTool, csjsTools.VolumeEllipseTool],
  MeasurementTags: [csjsTools.Length, csjsTools.CobbAngle, csjsTools.Ellipse,
                    csjsTools.Spline, csjsTools.Angle, csjsTools.VolumeLengthTool, csjsTools.VolumeEllipseTool, csjsTools.PlanarFreehandROI],
  RoughMeasurements: [csjsTools.VolumeLengthTool, csjsTools.Ellipse, csjsTools.VolumeEllipseTool]
};

export const toolsAcronyms: Record<string, string> = {
  Length: 'D',
  EllipticalROI: '',
  CobbAngle: 'CAx',
  SplineROI: 'Sp.D',
  Angle: 'Angle',
  VolumeEllipseTool: '',
  VolumeLengthTool: '',
  PlanarFreehandROI: 'FreeHand'
};

export const ToolValueTags = {
  VolumeEllipseTool : {
    area: 'Vol.A',
    circumference: 'Vol.Circ',
    length: 'Vol.B',
    volume: 'Volume'
  },
  VolumeLengthTool : {
    width: 'Vol.W',
    length: 'Vol.L',
    breadth: 'Vol.B',
    volume: 'Volume'
  },
};

export const MEASUREMENT_PAIRS = {
  HC : ["BPD", "OFD"],
  AC : ["TAD", "APAD"]
};

export const CORNERSTONE_HYDRATION_DELAY = 100;

export type TextBoundingBox = { x:number, y:number, width:number, height:number };

export type PairTagValue = {
  UID : string,
  value: number,
  unit: string,
  tagName: string,
  isComplete: boolean,
  lines: [{
    UID: string,
    tagName: string,
    points: Point3[],
  }]
}