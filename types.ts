
export interface SlideData {
  id: string;
  originalImage: string; // Base64
  enhancedImage?: string; // Base64 from Gemini
  generatedAssets?: GeneratedAsset[];
  videoUrl?: string; // Content background video (Blob URL)
  transitionVideoUrl?: string; // Cinematic transition video (Blob URL)
  pageIndex: number;
  status: 'pending' | 'analyzing' | 'analyzed' | 'generating_image' | 'generating_assets' | 'generating_video' | 'complete' | 'error';
  analysis?: SlideAnalysis;
  error?: string;
  transitionType?: 'fade' | 'slide' | 'zoom' | 'cinematic';
}

export interface GeneratedAsset {
  id: string;
  prompt: string;
  imageUrl: string; // Base64
}

export interface SlideAnalysis {
  // Consulting Principle: Headline Discipline
  actionTitle: string; // Full sentence assertion
  subtitle: string; // Context/Source
  
  // Consulting Principle: Pyramid Principle / MECE
  keyTakeaways: string[]; // 3-4 Mutually Exclusive, Collectively Exhaustive points
  
  script: string; 
  
  // Visual Strategy
  visualPrompt: string; 
  assetPrompts: string[]; 
  keywords: string[];
  
  // Layout Frameworks
  consultingLayout: 'data-evidence' | 'strategic-pillars' | 'executive-summary' | 'process-flow';
}

export interface ProcessingStats {
  totalSlides: number;
  processedSlides: number;
  currentOperation: string;
  startTime: number;
}

// PDF.js and PptxGenJS types augmentations
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
  UPLOAD = 'UPLOAD',
  PROCESSING = 'PROCESSING',
  EDITOR = 'EDITOR',
  PRESENT = 'PRESENT'
}
