
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlideData, SlideAnalysis, SelectionRect } from '../types';
import { Play, ChevronRight, ChevronLeft, Layout, Sparkles, MessageSquare, Download, Loader2, AlertCircle, Trash2, Video, RefreshCw, Zap, Maximize2, BrainCircuit, CloudCheck, CloudUpload, Film, FileImage, Settings2, X, Image as ImageIcon, Plus, MousePointer2, Wand2, Type, Eraser, Globe, ExternalLink, Activity } from 'lucide-react';
import { Button } from './Button';
import { exportToPptx } from '../services/pptxService';
import { clearProject } from '../services/storageService';

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

export const PresentationEditor: React.FC<PresentationEditorProps> = ({ 
  slides, 
  onPlay, 
  onReset, 
  onUpdateSlide, 
  onGenerateVideo,
  onGenerateTransitionFromPhoto,
  onUpgradeHD,
  onDeepAnalyze,
  onEditArea,
  isSaving,
  lastSavedAt
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [videoMode, setVideoMode] = useState<'background' | 'intro'>('background');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportRange, setExportRange] = useState("");
  
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [currentRect, setCurrentRect] = useState<SelectionRect | null>(null);
  const [showAreaPrompt, setShowAreaPrompt] = useState(false);
  const [areaPromptText, setAreaPromptText] = useState("");
  
  const filmstripRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);

  const currentSlide = slides[currentIndex];

  const nextSlide = () => { setCurrentIndex(p => Math.min(slides.length - 1, p + 1)); resetSelection(); }
  const prevSlide = () => { setCurrentIndex(p => Math.max(0, p - 1)); resetSelection(); }

  const resetSelection = () => {
    setIsSelecting(false);
    setStartPos(null);
    setCurrentRect(null);
    setShowAreaPrompt(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSelecting || !slideRef.current) return;
    const rect = slideRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setStartPos({ x, y });
    setCurrentRect({ x, y, width: 0, height: 0 });
    setShowAreaPrompt(false);
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
    if (currentRect && currentRect.width > 1 && currentRect.height > 1) {
      setShowAreaPrompt(true);
    } else {
      resetSelection();
    }
    setStartPos(null);
  };

  const handleAreaPromptSubmit = (promptOverride?: string) => {
      const finalPrompt = promptOverride || areaPromptText;
      if (onEditArea && currentRect && finalPrompt.trim()) {
          onEditArea(currentSlide.id, currentRect, finalPrompt);
          resetSelection();
          setAreaPromptText("");
      }
  };

  // Fix: Completely automate motion by removing the manual prompt. 
  // It uses the AI's suggested motion from analysis.
  const handleSynthesizeMotion = () => {
    const motionPrompt = currentSlide.analysis?.suggestedMotion || "Smooth cinematic transition";
    onGenerateVideo(currentSlide.id, motionPrompt, videoMode);
  };

  const handleTextChange = (field: keyof SlideAnalysis, value: any) => {
      if (!currentSlide.analysis) return;
      onUpdateSlide(currentSlide.id, { 
          analysis: { ...currentSlide.analysis, [field]: value } 
      });
  };

  const getStatusIcon = (status: SlideData['status']) => {
      switch(status) {
          case 'analyzing': return <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />;
          case 'generating_image': return <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />;
          case 'generating_video': return <Loader2 className="w-3 h-3 text-purple-600 animate-spin" />;
          case 'complete': return <div className="w-2 h-2 rounded-full bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />;
          default: return <div className="w-2 h-2 rounded-full bg-slate-300" />;
      }
  };

  const renderConsultingOverlay = (analysis: SlideAnalysis, status?: SlideData['status']) => {
      const layout = analysis.consultingLayout || 'data-evidence';
      
      return (
          <div className="absolute inset-0 bg-white z-10 font-sans pointer-events-none select-none">
              <div className="absolute top-0 left-0 w-full h-24 bg-white border-b border-slate-200 px-12 flex flex-col justify-center z-20">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{analysis.actionTitle}</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">{analysis.subtitle}</p>
              </div>

              <div className="absolute top-24 left-0 w-full bottom-12 flex px-12 pt-8 gap-12">
                  <div className={`flex-1 ${layout === 'data-evidence' ? 'w-2/3' : 'w-full'} flex flex-col gap-6`}>
                      {analysis.keyTakeaways.map((point, i) => (
                          <div key={i} className="flex gap-4">
                              <div className="w-1.5 h-1.5 bg-blue-900 mt-2 flex-shrink-0" />
                              <p className="text-sm text-slate-700 font-medium leading-relaxed">{point}</p>
                          </div>
                      ))}
                  </div>
              </div>

              {currentSlide.groundingSources && currentSlide.groundingSources.length > 0 && (
                <div className="absolute bottom-16 left-12 flex flex-wrap gap-2 z-30">
                  {currentSlide.groundingSources.map((src, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-[8px] font-bold text-blue-700 rounded border border-blue-100">
                      <Globe className="w-2 h-2" />
                      {src.title || "Source"}
                    </div>
                  ))}
                </div>
              )}

              <div className="absolute bottom-0 left-0 w-full h-12 border-t border-slate-200 bg-white px-12 flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                  <div className="flex items-center gap-4">
                    <span>Lumina Strategy Group</span>
                    <span className="w-px h-3 bg-slate-200" />
                    <span>Verified Insight</span>
                  </div>
                  <span>Slide {currentIndex + 1}</span>
              </div>
          </div>
      );
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-900 font-sans">
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-950 flex items-center justify-center rounded">
                <Layout className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold text-xs uppercase tracking-widest text-slate-900">Lumina Agent</h1>
            <div className="flex items-center gap-2 ml-4">
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-tighter text-slate-400">
                    {isSaving ? <><Loader2 className="w-3 h-3 animate-spin text-blue-500" /><span>Syncing to Supabase</span></> : <><CloudCheck className="w-3 h-3 text-emerald-500" /><span>History Secure</span></>}
                </div>
            </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-sm">
             <button onClick={() => setIsSelecting(!isSelecting)} className={`p-2 rounded transition-all flex items-center gap-2 ${isSelecting ? 'bg-blue-600 text-white shadow-inner' : 'text-slate-500 hover:bg-slate-200'}`}>
                <MousePointer2 className="w-4 h-4" />
                {isSelecting && <span className="text-[9px] font-bold uppercase tracking-widest pr-1">Spatial Co-pilot</span>}
             </button>
             <div className="w-px h-4 bg-slate-300 mx-1" />
             <button onClick={() => setShowOriginal(false)} className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded ${!showOriginal ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500'}`}>Agent View</button>
             <button onClick={() => setShowOriginal(true)} className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded ${showOriginal ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500'}`}>Raw Data</button>
        </div>

        <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onPlay} className="h-9 px-3 text-[10px] uppercase tracking-widest font-black"><Play className="w-3 h-3 mr-2" /> Preview</Button>
            <Button variant="primary" onClick={() => setShowExportModal(true)} className="h-9 px-4 text-[10px] uppercase tracking-widest font-black bg-blue-950 text-white">Export</Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-slate-100 relative flex flex-col">
            <div className="flex-1 flex items-center justify-center p-12 relative group">
                <button onClick={prevSlide} disabled={currentIndex === 0} className="absolute left-6 p-4 rounded-full text-slate-400 hover:text-slate-900 hover:bg-white transition-all disabled:opacity-0 z-20 shadow-xl border border-white/40 backdrop-blur-md"><ChevronLeft className="w-8 h-8" /></button>
                
                <div 
                  ref={slideRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className={`relative w-full max-w-5xl aspect-video bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden ${isSelecting ? 'cursor-crosshair' : 'cursor-default'}`}
                >
                    <img src={currentSlide.originalImage} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${showOriginal ? 'opacity-100' : 'opacity-0'}`} alt="Original" />
                    {!showOriginal && (
                        <>
                            {currentSlide.videoUrl && (
                                <video src={currentSlide.videoUrl} autoPlay loop muted className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply" />
                            )}
                            {currentSlide.enhancedImage && !currentSlide.videoUrl && (
                                <img src={currentSlide.enhancedImage} className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-multiply" alt="Enhanced" />
                            )}
                            {currentSlide.analysis ? renderConsultingOverlay(currentSlide.analysis, currentSlide.status) : (
                                <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center gap-4">
                                    <div className="w-12 h-12 border-2 border-blue-900/20 border-t-blue-900 rounded-full animate-spin" />
                                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">Synthesizing Insight...</p>
                                </div>
                            )}
                        </>
                    )}

                    {currentRect && (
                        <motion.div className="absolute border-2 border-blue-500 bg-blue-500/10 z-50 pointer-events-none" style={{ left: `${currentRect.x}%`, top: `${currentRect.y}%`, width: `${currentRect.width}%`, height: `${currentRect.height}%` }} />
                    )}

                    <AnimatePresence>
                        {showAreaPrompt && currentRect && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute z-[60] bg-white rounded-2xl shadow-2xl p-5 w-80 border border-slate-200" style={{ left: `${currentRect.x}%`, top: `${currentRect.y + currentRect.height}%` }}>
                                <div className="flex items-center gap-2 mb-4 text-blue-600">
                                    <Activity className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Logic Refinement</span>
                                </div>
                                <textarea value={areaPromptText} onChange={(e) => setAreaPromptText(e.target.value)} className="w-full h-20 p-3 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-4" placeholder="Update logic for this region..." />
                                <div className="flex gap-2">
                                  <button onClick={() => handleAreaPromptSubmit()} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase">Apply Change</button>
                                  <button onClick={resetSelection} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <button onClick={nextSlide} disabled={currentIndex === slides.length - 1} className="absolute right-6 p-4 rounded-full text-slate-400 hover:text-slate-900 hover:bg-white transition-all disabled:opacity-0 z-20 shadow-xl border border-white/40 backdrop-blur-md"><ChevronRight className="w-8 h-8" /></button>
            </div>

            <div className="h-28 bg-white border-t border-slate-200 flex flex-col">
                <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Globe className="w-3 h-3" /> Live Analysis Pipeline</span>
                </div>
                <div ref={filmstripRef} className="flex-1 flex items-center gap-3 px-4 overflow-x-auto scrollbar-hide">
                    {slides.map((s, idx) => (
                        <button key={s.id} onClick={() => setCurrentIndex(idx)} className={`relative flex-shrink-0 w-28 aspect-video border-2 transition-all rounded overflow-hidden ${idx === currentIndex ? 'border-blue-900 scale-105 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}>
                            <img src={s.originalImage} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                            <div className="absolute top-1 right-1">{getStatusIcon(s.status)}</div>
                            <div className="absolute bottom-0 left-0 bg-blue-950 text-white px-1.5 py-0.5 text-[8px] font-bold">{idx + 1}</div>
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <div className="w-80 bg-white border-l border-slate-200 flex flex-col">
            <div className="h-14 border-b border-slate-200 flex items-center px-6 bg-slate-50 justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Motion Sequence</h3>
                <Settings2 className="w-4 h-4 text-slate-300" />
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Synthesis Mode</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button onClick={() => setVideoMode('background')} className={`px-3 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-all ${videoMode === 'background' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Background</button>
                      <button onClick={() => setVideoMode('intro')} className={`px-3 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-all ${videoMode === 'intro' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Intro</button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={handleSynthesizeMotion}
                      disabled={currentSlide.status === 'generating_video'}
                      className="group relative w-full p-6 bg-slate-900 rounded-2xl overflow-hidden flex flex-col items-center justify-center border-2 border-transparent hover:border-blue-500 transition-all disabled:opacity-50"
                    >
                      <Sparkles className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase text-white tracking-[0.2em]">Automated Synthesis</span>
                      <p className="mt-1 text-[8px] text-blue-300/60 font-medium uppercase">{currentSlide.analysis?.suggestedMotion || "Smart Transition"}</p>
                      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    
                    <p className="text-[9px] text-slate-400 font-medium leading-relaxed px-1">
                      {videoMode === 'intro' 
                        ? "Generates a high-fidelity cinematic sequence played before the slide content."
                        : "Creates a subtle loop that plays behind the strategy logic during presentation."
                      }
                    </p>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                    <Button onClick={() => onDeepAnalyze(currentSlide.id)} disabled={currentSlide.status === 'analyzing'} className="w-full bg-slate-900 text-white rounded-2xl h-12 text-[10px] uppercase font-bold tracking-[0.2em] shadow-xl shadow-slate-900/20">
                        <BrainCircuit className="w-4 h-4 mr-2" /> 32K Thinking
                    </Button>
                    <p className="mt-3 text-[8px] text-center text-slate-400 font-bold uppercase tracking-widest">Execute Pro-Logic reasoning</p>
                </div>
            </div>
        </div>
      </div>

      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-xl text-blue-600"><Settings2 className="w-6 h-6" /></div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Export Deck</h2>
                </div>
                <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={async () => {
                    setIsExporting(true);
                    await exportToPptx(slides);
                    setIsExporting(false);
                    setShowExportModal(false);
                  }} disabled={isExporting} className="flex flex-col items-center justify-center p-8 border border-slate-100 rounded-3xl hover:bg-blue-50 hover:border-blue-100 transition-all gap-3 group">
                    {isExporting ? <Loader2 className="w-8 h-8 animate-spin text-blue-600" /> : <Download className="w-8 h-8 text-blue-600" />}
                    <span className="text-[10px] font-bold uppercase tracking-widest">Powerpoint</span>
                  </button>
                  <button onClick={() => setShowExportModal(false)} className="flex flex-col items-center justify-center p-8 border border-slate-100 rounded-3xl hover:bg-slate-50 transition-all gap-3 group">
                    <FileImage className="w-8 h-8 text-indigo-600" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Image Archive</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
