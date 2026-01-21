
export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GroundingSource {
  title?: string;
  uri?: string;
}

export interface SlideData {
  id: string;
  originalImage: string; // Base64
  enhancedImage?: string; // Base64
  generatedAssets?: GeneratedAsset[];
  videoUrl?: string; // Content background video
  transitionVideoUrl?: string; // Cinematic transition video
  videoPosition?: 'background' | 'intro'; // Automated sequence choice
  pageIndex: number;
  status: 'pending' | 'analyzing' | 'analyzed' | 'generating_image' | 'generating_assets' | 'generating_video' | 'complete' | 'error' | 'editing_area';
  analysis?: SlideAnalysis;
  error?: string;
  transitionType?: 'fade' | 'slide' | 'zoom' | 'cinematic';
  groundingSources?: GroundingSource[];
}

export interface GeneratedAsset {
  id: string;
  prompt: string;
  imageUrl: string; // Base64 or Supabase URL
  position?: SelectionRect;
}

export interface SlideAnalysis {
  actionTitle: string;
  subtitle: string;
  keyTakeaways: string[];
  script: string; 
  visualPrompt: string; 
  assetPrompts: string[]; 
  keywords: string[];
  consultingLayout: 'editorial-left' | 'editorial-right' | 'minimal-centered' | 'mckinsey-insight';
  suggestedMotion?: string; // AI suggested motion for video
  colorPalette?: string[]; // Hex codes suggested by AI
  mood?: string;
}

export interface ProcessingStats {
  totalSlides: number;
  processedSlides: number;
  currentOperation: string;
  startTime: number;
}

export interface SupabaseConfig {
  url: string;
  key: string;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    pdfjsLib: any;
    PptxGenJS: any;
    aistudio?: AIStudio;
  }
}

export enum AppMode {
  SETUP = 'SETUP',
  UPLOAD = 'UPLOAD',
  PROCESSING = 'PROCESSING',
  EDITOR = 'EDITOR',
  PRESENT = 'PRESENT'
}
