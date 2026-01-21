
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlideData, SlideAnalysis, SelectionRect } from '../types';
import { Play, Layout, Sparkles, Download, Loader2, Video, Maximize2, BrainCircuit, MousePointer2, X, ChevronLeft, ChevronRight, Eye, Type, Palette, Film, Globe, ArrowRight, AlertTriangle, Bug, Layers, Image as ImageIcon, RefreshCcw, Wand2 } from 'lucide-react';
import { Button } from './Button';
import { exportToPptx } from '../services/pptxService';

interface PresentationEditorProps {
  slides: SlideData[];
  onPlay: () => void;
  onReset: () => void;
  onUpdateSlide: (id: string, updates: Partial<SlideData>) => void;
  onGenerateVideo: (id: string, prompt: string, type: 'background' | 'intro') => void;
  onGenerateTransitionFromPhoto: (id: string, file: File, prompt: string) => void;
  onUpgradeHD: (id: string) => void;
  onDeepAnalyze: (id: string) => void;
  onEditArea?: (id: string, rect: SelectionRect, prompt: string) => void;
  isSaving?: boolean;
  lastSavedAt?: Date | null;
}

type EditorLens = 'narrative' | 'cinematic';

export const PresentationEditor: React.FC<PresentationEditorProps> = ({ 
  slides, 
  onPlay, 
  onUpdateSlide, 
  onGenerateVideo,
  onDeepAnalyze,
  onEditArea,
  isSaving
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lens, setLens] = useState<EditorLens>('narrative');
  const [showOriginal, setShowOriginal] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  // Debug State Controls
  const [debugLayerText, setDebugLayerText] = useState(true);
  const [debugLayerImage, setDebugLayerImage] = useState(true);

  // Image State
  const [enhancedLoaded, setEnhancedLoaded] = useState(false);
  const [enhancedError, setEnhancedError] = useState(false);
  const [transitionPrompt, setTransitionPrompt] = useState("");

  // Selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [currentRect, setCurrentRect] = useState<SelectionRect | null>(null);
  const [showAreaPrompt, setShowAreaPrompt] = useState(false);
  const [areaPromptText, setAreaPromptText] = useState("");
  
  const slideRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  
  const currentSlide = slides[currentIndex];

  useEffect(() => {
    setEnhancedLoaded(false);
    setEnhancedError(false);
    if (currentSlide.analysis?.suggestedMotion) {
       setTransitionPrompt(`Cinematic transition: ${currentSlide.analysis.suggestedMotion}`);
    }
    if (filmstripRef.current) {
        const activeItem = filmstripRef.current.children[currentIndex] as HTMLElement;
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }
  }, [currentIndex, currentSlide.id, currentSlide.enhancedImage]);

  const handleNext = () => setCurrentIndex(prev => Math.min(slides.length - 1, prev + 1));
  const handlePrev = () => setCurrentIndex(prev => Math.max(0, prev - 1));

  const shouldUseEnhanced = !showOriginal && !!currentSlide.enhancedImage && !enhancedError;
  const shouldBlurBaseLayer = shouldUseEnhanced && !enhancedLoaded;

  const resetSelection = () => { setIsSelecting(false); setStartPos(null); setCurrentRect(null); setShowAreaPrompt(false); };
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSelecting || !slideRef.current) return;
    const rect = slideRef.current.getBoundingClientRect();
    setStartPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
    setCurrentRect({ x: 0, y: 0, width: 0, height: 0 });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!startPos || !slideRef.current) return;
    const rect = slideRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCurrentRect({
      x: Math.min(x, startPos.x),
      y: Math.min(y, startPos.y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y)
    });
  };
  const handleMouseUp = () => {
    if (!isSelecting) return;
    if (currentRect && currentRect.width > 2 && currentRect.height > 2) setShowAreaPrompt(true);
    else resetSelection();
    setStartPos(null);
  };
  const submitAreaEdit = () => {
    if (onEditArea && currentRect && areaPromptText) {
      onEditArea(currentSlide.id, currentRect, areaPromptText);
      resetSelection();
      setAreaPromptText("");
    }
  };

  const forceAnalysisData = () => {
    onUpdateSlide(currentSlide.id, {
      status: 'complete',
      // Fix: Added missing required property 'assetPrompts' to satisfy SlideAnalysis interface.
      analysis: {
        actionTitle: "Debug: Strategic Convergence",
        subtitle: "Lumina Recovery Subsystem v1.0",
        keyTakeaways: ["Analysis forced via debug panel", "Layout system re-initialized", "Visual layers verified"],
        script: "Testing recovery mode.",
        visualPrompt: "Abstract blue architecture",
        assetPrompts: [],
        consultingLayout: 'editorial-left',
        keywords: ["debug", "recovery"]
      }
    });
  };

  const renderStatusHUD = () => {
    const status = currentSlide.status;
    if (!['analyzing', 'generating_image', 'generating_video', 'editing_area'].includes(status)) return null;
    
    return (
      <div className="absolute top-6 right-6 z-[60] bg-black/90 border border-white/20 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-slide-up">
        <div className="relative w-6 h-6">
           <div className="absolute inset-0 rounded-full border-2 border-white/10" />
           <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin" />
        </div>
        <div>
           <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-0.5">Gemini Processing</p>
           <p className="text-xs text-white font-medium">
              {status === 'analyzing' && "Reading rhetorical structure..."}
              {status === 'generating_image' && "Painting cinematic visuals..."}
              {status === 'generating_video' && "Animating transitions..."}
              {status === 'editing_area' && "Applying magic edit..."}
           </p>
        </div>
      </div>
    );
  };

  const renderSmartLayout = () => {
    if (!debugLayerText || showOriginal) return null;
    const analysis = currentSlide.analysis;
    if (!analysis) return null;

    const layout = analysis.consultingLayout || 'editorial-left';

    const ContentWrapper = ({ children }: { children: React.ReactNode }) => (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[50] pointer-events-none">
        {children}
      </motion.div>
    );

    if (layout === 'minimal-centered') {
      return (
        <ContentWrapper>
          <div className="h-full flex flex-col items-center justify-center text-center p-20">
             <h1 className="font-serif text-7xl text-white font-bold mb-8 max-w-4xl drop-shadow-2xl">{analysis.actionTitle}</h1>
             <div className="h-1 w-32 bg-blue-500 mb-8" />
             <p className="font-sans text-sm font-bold uppercase tracking-[0.3em] text-blue-200 mb-12">{analysis.subtitle}</p>
             <div className="flex gap-4">
               {analysis.keyTakeaways.map((pt, i) => (
                  <div key={i} className="max-w-[200px] text-white/80 text-sm bg-black/50 p-4 rounded-xl border border-white/10">{pt}</div>
               ))}
             </div>
          </div>
        </ContentWrapper>
      );
    }

    if (layout === 'editorial-left') {
      return (
        <ContentWrapper>
          <div className="h-full w-[45%] bg-gradient-to-r from-black/95 via-black/80 to-transparent p-12 flex flex-col justify-center">
             <div className="mb-auto mt-12">
               <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 mb-4">{analysis.subtitle}</p>
               <h1 className="font-serif text-5xl text-white font-medium mb-6 drop-shadow-lg">{analysis.actionTitle}</h1>
               <div className="h-1 w-16 bg-white/20 mb-8" />
             </div>
             <div className="space-y-6">
               {analysis.keyTakeaways.map((pt, i) => (
                 <div key={i} className="flex gap-4 items-start"><span className="font-mono text-white/30 text-xs mt-1.5">0{i+1}</span><p className="font-sans text-base text-white/80 font-light leading-relaxed">{pt}</p></div>
               ))}
             </div>
          </div>
        </ContentWrapper>
      );
    }

    // Default Fallback Layout
    return (
      <ContentWrapper>
        <div className="h-full flex flex-col justify-between">
          <div className="bg-gradient-to-b from-black/90 to-transparent p-12"><h1 className="font-serif text-4xl text-white font-semibold mb-2">{analysis.actionTitle}</h1><p className="text-sm font-sans text-white/70 uppercase tracking-widest">{analysis.subtitle}</p></div>
          <div className="bg-gradient-to-t from-black/95 to-transparent p-12 grid grid-cols-3 gap-8">
             {analysis.keyTakeaways.slice(0,3).map((pt, i) => (
               <div key={i} className="border-t border-blue-500/50 pt-4"><p className="text-sm text-white/90 leading-relaxed">{pt}</p></div>
             ))}
          </div>
        </div>
      </ContentWrapper>
    );
  };

  return (
    <div className="h-screen bg-black text-white overflow-hidden flex flex-col font-sans selection:bg-blue-500/30">
      
      {/* GLOBAL DEBUG OVERLAY */}
      {showDebug && (
        <div className="fixed top-20 left-4 z-[100] bg-zinc-900 text-green-400 font-mono text-[10px] p-5 rounded-2xl border border-white/10 max-w-sm shadow-2xl pointer-events-auto">
          <h4 className="font-bold border-b border-white/10 mb-3 pb-2 flex justify-between items-center text-white">
            <span className="flex items-center gap-2"><Bug className="w-3 h-3 text-green-500" /> INSPECTOR</span>
            <span className="opacity-50">{currentIndex + 1}/{slides.length}</span>
          </h4>
          <div className="space-y-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 opacity-80">
                 <div>STATUS: <span className="text-white">{currentSlide.status}</span></div>
                 <div>ANALYSIS: <span className={currentSlide.analysis ? "text-green-500" : "text-red-500"}>{currentSlide.analysis ? "YES" : "NO"}</span></div>
                 <div>VIEW: <span className="text-white">{showOriginal ? "RAW" : "LUMINA"}</span></div>
                 <div>LENS: <span className="text-white">{lens}</span></div>
              </div>

              <div className="pt-2 border-t border-white/10">
                  <p className="text-white/50 mb-2 font-bold">TROUBLESHOOTING</p>
                  <div className="flex flex-wrap gap-2">
                     <button onClick={() => setDebugLayerText(!debugLayerText)} className={`px-2 py-1 border rounded ${debugLayerText ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-white/20 text-white/40'}`}>Toggle Text</button>
                     <button onClick={() => setDebugLayerImage(!debugLayerImage)} className={`px-2 py-1 border rounded ${debugLayerImage ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-white/20 text-white/40'}`}>Toggle Gfx</button>
                     <button onClick={forceAnalysisData} className="px-2 py-1 bg-blue-600 text-white rounded flex items-center gap-1"><Wand2 className="w-3 h-3" /> Force Layout</button>
                  </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                  <p className="text-white/50 mb-2 font-bold">RAW ASSET PREVIEW</p>
                  <div className="w-full aspect-video bg-black rounded border border-white/10 overflow-hidden">
                     <img src={currentSlide.originalImage} className="w-full h-full object-contain" />
                  </div>
              </div>
          </div>
        </div>
      )}

      <header className="h-16 flex items-center justify-between px-8 bg-black border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Layout className="w-4 h-4 text-white" />
          </div>
          <span className="font-serif text-lg tracking-tight">Lumina Studio</span>
        </div>
        
        <div className="flex items-center gap-4">
          {isSaving && <span className="text-[10px] font-mono text-white/40 animate-pulse uppercase tracking-widest">Saving...</span>}
          <button onClick={() => setShowDebug(!showDebug)} className={`p-2 rounded-full transition-colors ${showDebug ? 'bg-red-500 text-white' : 'hover:bg-white/10 text-white/30'}`}><Bug className="w-4 h-4" /></button>
          <button onClick={() => exportToPptx(slides)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70"><Download className="w-4 h-4" /></button>
          <Button onClick={onPlay} className="h-9 px-6 rounded-full bg-white text-black font-bold text-[10px] uppercase tracking-widest">Present</Button>
        </div>
      </header>

      <main className="flex-1 relative flex items-center justify-center p-8 bg-[#0a0a0a]">
        
        <button onClick={handlePrev} className="absolute left-8 p-4 rounded-full hover:bg-white/5 text-white/20 hover:text-white transition-all z-[70]"><ChevronLeft className="w-8 h-8" /></button>
        <button onClick={handleNext} className="absolute right-8 p-4 rounded-full hover:bg-white/5 text-white/20 hover:text-white transition-all z-[70]"><ChevronRight className="w-8 h-8" /></button>

        <div 
          ref={slideRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="relative aspect-video w-full max-w-[1280px] bg-black rounded-lg shadow-2xl overflow-hidden border border-white/10"
          style={{
             backgroundImage: 'linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%)',
             backgroundSize: '20px 20px',
             backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
          }}
        >
            {renderStatusHUD()}

            {/* BASE IMAGE LAYER */}
            {debugLayerImage && (
                <div className="absolute inset-0">
                    <img 
                      src={currentSlide.originalImage} 
                      className={`absolute inset-0 w-full h-full object-contain transition-all duration-700 ${shouldBlurBaseLayer ? 'blur-2xl opacity-40 scale-105' : 'opacity-100'}`} 
                      alt="Original"
                    />

                    {shouldUseEnhanced && (
                      <img 
                        src={currentSlide.enhancedImage} 
                        onLoad={() => setEnhancedLoaded(true)}
                        onError={() => setEnhancedError(true)}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${enhancedLoaded ? 'opacity-100' : 'opacity-0'}`} 
                        alt="Enhanced"
                      />
                    )}

                    {!showOriginal && <div className="absolute inset-0 bg-black/30 pointer-events-none" />}
                </div>
            )}

            {renderSmartLayout()}
            
            {/* Cinematic Lens */}
            {!showOriginal && lens === 'cinematic' && (
              <div className="absolute inset-0 z-[60] flex items-center justify-center p-8 bg-black/60 pointer-events-auto">
                <div className="bg-zinc-900 p-8 rounded-3xl border border-white/10 w-full max-w-lg shadow-2xl flex flex-col gap-6">
                   <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                      <Film className="w-5 h-5 text-blue-400" />
                      <h3 className="font-serif text-xl">Transition Director</h3>
                   </div>
                   <textarea 
                     value={transitionPrompt} onChange={(e) => setTransitionPrompt(e.target.value)}
                     className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-xs text-white outline-none focus:border-blue-500 h-24"
                     placeholder="Camera motion prompt..."
                   />
                   <div className="flex gap-2">
                      <Button onClick={() => onGenerateVideo(currentSlide.id, transitionPrompt, 'intro')} disabled={currentSlide.status === 'generating_video'} className="flex-1 text-[10px] uppercase font-bold tracking-widest bg-blue-600">
                        {currentSlide.status === 'generating_video' ? "Generating..." : "Generate Motion"}
                      </Button>
                   </div>
                </div>
              </div>
            )}
        </div>
      </main>

      <footer className="h-20 border-t border-white/5 bg-black flex items-center justify-between px-8 z-[80]">
         <div className="flex items-center gap-6">
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
               <button onClick={() => setLens('narrative')} className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${lens === 'narrative' ? 'bg-white text-black' : 'text-white/40'}`}>Narrative</button>
               <button onClick={() => setLens('cinematic')} className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${lens === 'cinematic' ? 'bg-blue-600 text-white' : 'text-white/40'}`}>Cinematic</button>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <button onClick={() => setShowOriginal(!showOriginal)} className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${showOriginal ? 'text-blue-400' : 'text-white/40 hover:text-white'}`}>
               <Eye className="w-3 h-3" /> {showOriginal ? 'Raw PDF' : 'Lumina View'}
            </button>
         </div>

         <div 
            ref={filmstripRef}
            className="flex items-center gap-2 h-14 overflow-x-auto px-4 max-w-[40vw] scrollbar-hide"
         >
             {slides.map((s, i) => (
               <button key={s.id} onClick={() => setCurrentIndex(i)} className={`h-full aspect-video rounded-md overflow-hidden border transition-all flex-shrink-0 ${i === currentIndex ? 'border-white scale-110 z-10 shadow-lg' : 'border-white/10 opacity-30 hover:opacity-100'}`}>
                 <img src={s.originalImage} className="w-full h-full object-cover" />
               </button>
             ))}
         </div>

         <div className="flex items-center gap-6">
            <button onClick={() => onDeepAnalyze(currentSlide.id)} className="text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-blue-400 flex items-center gap-2">
               <BrainCircuit className="w-3 h-3" /> Re-Analyze
            </button>
            <div className="text-[10px] text-white/20 font-mono">SLIDE {currentIndex + 1} OF {slides.length}</div>
         </div>
      </footer>
    </div>
  );
};
