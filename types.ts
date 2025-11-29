export interface ArtPanelData {
  id: string;
  prompt: string;
  imageUrl: string;
  caption?: string;
  isLoading: boolean;
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '3:4' | '4:3';

export interface GenerationSettings {
  model: string;
  aspectRatio: AspectRatio;
  batchCount: number;
}

export interface AudioVisualizerData {
  volume: number;
}