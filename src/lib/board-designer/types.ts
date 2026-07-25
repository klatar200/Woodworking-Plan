export type Grain = 'edge' | 'end';

export interface WoodSpecies {
  id: string;
  name: string;
  colorHex: string;
}

export interface Strip {
  id: string;
  speciesId: string;
  widthIn: number;
  repeat: number;
}

export interface BoardDesignConfig {
  schemaVersion: 1;
  name: string;
  grain: Grain;
  sourceLengthIn: number; // panel length
  stockThicknessIn: number; // dressed stock thickness
  sliceThicknessIn: number; // end grain only; ignored (but present) when grain === 'edge'
  kerfIn: number;
  wasteFactor: number;
  flipEveryOtherSlice: boolean; // RENDER ONLY — never touches metrics math
  strips: Strip[];
}

export interface SpeciesBoardFeet {
  speciesId: string;
  name: string;
  boardFeet: number;
}

export interface BoardMetrics {
  panelWidthIn: number;
  panelLengthIn: number;
  panelThicknessIn: number;
  finishedLengthIn: number;
  finishedWidthIn: number;
  finishedThicknessIn: number;
  sliceCount: number;
  leftoverIn: number;
  boardFeetBySpecies: SpeciesBoardFeet[];
  totalBoardFeet: number;
  warnings: string[];
  complete: boolean;
}
