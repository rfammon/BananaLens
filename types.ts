
export enum ModelType {
  FLASH = 'gemini-2.5-flash-image',
  PRO = 'gemini-3-pro-image-preview'
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type ImageSize = '1K' | '2K' | '4K';

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  model: ModelType;
  aspectRatio: AspectRatio;
  size?: ImageSize;
}

export interface AppState {
  prompt: string;
  model: ModelType;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  batchSize: number;
  isGenerating: boolean;
  history: GeneratedImage[];
  error: string | null;
  loadingMessage: string;
}
