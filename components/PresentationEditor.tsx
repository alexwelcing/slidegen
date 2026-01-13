
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlideData, SlideAnalysis } from '../types';
import { Play, ChevronRight, ChevronLeft, Layout, Sparkles, MessageSquare, Download, Loader2, AlertCircle, Trash2, Video, RefreshCw, Zap, Maximize2, BrainCircuit, CloudCheck, CloudUpload, Film, FileImage, Settings2, X, Image as ImageIcon, Plus } from 'lucide-react';
import { Button } from './Button';
import { exportToPptx } from '../services/pptxService';
import { clearProject } from '../services/storageService';

interface PresentationEditorProps {
  slides: SlideData[];
  onPlay: () => void;
  onReset: () => void;
  onUpdateSlide: (id: string, updates: Partial<SlideData>) => void;
  onGenerateVideo: (id: string, prompt: string, isTransition?: boolean) => void;
  onGenerateTransitionFromPhoto: (id: string, file: File, prompt: string) => void;
  onUpgradeHD: (id: string) => void;
  onDeepAnalyze: (id: string) => void;
  onGenerateAssets?: (id: string) => void;
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
  onGenerateAssets,
  isSaving,
  lastSavedAt
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showVideoPrompt, setShowVideoPrompt] = useState(false);
  const [videoMode, setVideoMode] = useState<'background' | 'transition'>('background');
  const [showExportModal, setShowExportModal] = useState(false);
  const [videoPromptText, setVideoPromptText] = useState("");
  const [exportRange, setExportRange] = useState("");
  const filmstripRef = useRef<HTMLDivElement>(null);

  const currentSlide = slides[currentIndex];

  const nextSlide = () => setCurrentIndex(p => Math.min(slides.length - 1, p + 1));
  const prevSlide = () => setCurrentIndex(p => Math.max(0, p - 1));

  const handleExportRange = async () => {
    setIsExporting(true);
    let indices: number[] | undefined;
    
    if (exportRange.trim()) {
      indices = exportRange.split(',').flatMap(part => {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(n => parseInt(n.trim()) - 1);
          return Array.from({ length: end - start + 1 }, (_, i) => start + i);
        }
        return [parseInt(part.trim()) - 1];
      }).filter(n => !isNaN(n) && n >= 0 && n < slides.length);
    }

    await exportToPptx(slides, indices);
    setIsExporting(false);
    setShowExportModal(false);
  };

  const handleDownloadImage = () => {
    const link = document.createElement('a');
    link.href = currentSlide.enhancedImage || currentSlide.originalImage;
    link.download = `slide-${currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = async () => {
      if (confirm("Reset current deck? This will clear all progress.")) {
          await clearProject();
          onReset();
      }
  };

  const handleTextChange = (field: keyof SlideAnalysis, value: any) => {
      if (!currentSlide.analysis) return;
      onUpdateSlide(currentSlide.id, { 
          analysis: { ...currentSlide.analysis, [field]: value } 
      });
  };

  const handleTransitionChange = (value: 'fade' | 'slide' | 'zoom' | 'cinematic') => {
      onUpdateSlide(currentSlide.id, { transitionType: value });
  };

  const handleVideoSubmit = () => {
    if (videoPromptText.trim()) {
        onGenerateVideo(currentSlide.id, videoPromptText, videoMode === 'transition');
        setShowVideoPrompt(false);
        setVideoPromptText("");
    }
  };

  // Fixed error: Block-scoped variable 'prompt' used before its declaration by renaming it to 'userPrompt' and using window.prompt explicitly.
  const handleTransitionPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const userPrompt = window.prompt("Describe the animation for this transition photo:") || "Smooth cinematic transition";
      onGenerateTransitionFromPhoto(currentSlide.id, file, userPrompt);
    }
  };

  useEffect(() => {
    if (filmstripRef.current?.children[currentIndex]) {
        filmstripRef.current.children[currentIndex].scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest', 
            inline: 'center' 
        });
    }
  }, [currentIndex]);

  const getStatusIcon = (status: SlideData['status']) => {
      switch(status) {
          case 'analyzing': return <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />;
          case 'generating_image': return <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />;
          case 'generating_assets': return <Loader2 className="w-3 h-3 text-cyan-600 animate-spin" />;
          case 'generating_video': return <Loader2 className="w-3 h-3 text-purple-600 animate-spin" />;
          case 'complete': return <div className="w-2 h-2 rounded-full bg-emerald-600" />;
          default: return <div className="w-2 h-2 rounded-full bg-slate-300" />;
      }
  };

  const getLoadingMessage = (status: SlideData['status']) => {
      switch(status) {
          case 'analyzing': return "Synthesizing Strategy...";
          case 'generating_image': return "Rendering Visual Narrative...";
          case 'generating_assets': return "Creating Visual Assets...";
          case 'generating_video': return "Generating Cinematic Motion (Veo 3.1)...";
          default: return "Processing...";
      }
  };

  const renderConsultingOverlay = (analysis: SlideAnalysis, assets?: any[], status?: SlideData['status']) => {
      const layout = analysis.consultingLayout || 'data-evidence';
      const isGeneratingVisuals = status === 'generating_image' || status === 'generating_assets';
      
      const renderHeader = () => (
          <div className="absolute top-0 left-0 w-full h-24 bg-white border-b border-slate-200 px-12 flex flex-col justify-center z-20">
              <input 
                value={analysis.actionTitle} 
                onChange={(e) => handleTextChange('actionTitle', e.target.value)} 
                className="text-2xl font-bold text-slate-900 w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-1 -ml-1 outline-none" 
                placeholder="Action Title"
              />
              <input 
                value={analysis.subtitle || ""} 
                onChange={(e) => handleTextChange('subtitle', e.target.value)} 
                className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1 bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-1 -ml-1 outline-none" 
                placeholder="Subtitle / Context" 
              />
          </div>
      );

      const renderAsset = (asset: any, index: number) => {
        if (asset?.imageUrl) {
            return <img src={asset.imageUrl} className="w-full h-full object-contain mix-blend-multiply" alt="Asset" />;
        }
        if (isGeneratingVisuals) {
            return <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />;
        }
        
        const assetExpected = analysis.assetPrompts && analysis.assetPrompts[index];
        if (!assetExpected) {
             return <div className="w-full h-full flex items-center justify-center opacity-10"><ImageIcon className="w-8 h-8 text-slate-400" /></div>;
        }

        if (status === 'complete' || status === 'error') {
             return <div className="w-full h-full flex items-center justify-center opacity-10"><ImageIcon className="w-8 h-8 text-slate-400" /></div>;
        }
        return <span className="text-slate-300 text-xs italic">Pending...</span>;
      };

      const renderBody = () => {
          if (layout === 'strategic-pillars') {
            return (
                <div className="absolute top-24 left-0 w-full bottom-12 flex px-12 pt-8 gap-8">
                    {(analysis.keyTakeaways || []).slice(0, 3).map((point, i) => (
                        <div key={i} className="flex-1 border-t-2 border-slate-900 pt-4">
                            <h3 className="text-lg font-bold text-slate-800 mb-2">0{i+1}</h3>
                            <p className="text-sm text-slate-600 leading-relaxed font-medium">{point}</p>
                            <div className="mt-6 aspect-video bg-slate-50 border border-slate-200 p-4 flex items-center justify-center">
                                {renderAsset(assets?.[i], i)}
                            </div>
                        </div>
                    ))}
                </div>
            );
          }

          if (layout === 'data-evidence') {
            return (
                <div className="absolute top-24 left-0 w-full bottom-12 flex px-12 pt-8 gap-12">
                    <div className="w-2/3 h-full bg-slate-50 border border-slate-200 flex items-center justify-center relative p-8">
                        {renderAsset(assets?.[0], 0)}
                        <div className="absolute bottom-4 right-4 text-[10px] text-slate-400">FIGURE 1.1</div>
                    </div>
                    <div className="w-1/3 flex flex-col justify-center space-y-6">
                        {(analysis.keyTakeaways || []).map((point, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="w-1.5 h-1.5 bg-blue-900 mt-2 flex-shrink-0" />
                                <p className="text-sm text-slate-700 font-medium leading-relaxed">{point}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );
          }

          return (
              <div className="absolute top-24 left-0 w-full bottom-12 flex px-12 pt-8 gap-12">
                  <div className="max-w-2xl space-y-6">
                      {(analysis.keyTakeaways || []).map((point, i) => (
                          <div key={i} className="flex gap-4 pb-6 border-b border-slate-100 last:border-0">
                              <div className="text-blue-900 font-bold text-lg">0{i+1}</div>
                              <p className="text-lg text-slate-800 font-medium leading-relaxed">{point}</p>
                          </div>
                      ))}
                  </div>
                  <div className="flex-1 flex items-start justify-end pt-4">
                     <div className="w-48 h-48 border border-slate-200 bg-white p-2 shadow-sm flex items-center justify-center">
                        {renderAsset(assets?.[0], 0)}
                     </div>
                  </div>
              </div>
          );
      };

      const renderFooter = () => (
          <div className="absolute bottom-0 left-0 w-full h-12 border-t border-slate-200 bg-white px-12 flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              <div className="flex items-center gap-4">
                <span>Lumina Strategy Group</span>
                <span className="w-px h-3 bg-slate-200" />
                <span>Strictly Confidential</span>
              </div>
              <span>Slide {currentIndex + 1} of {slides.length}</span>
          </div>
      );

      return (
          <div className="absolute inset-0 bg-white z-10 font-sans">
              {renderHeader()}
              {renderBody()}
              {renderFooter()}
          </div>
      );
  };

  const hasAssets = currentSlide.generatedAssets && currentSlide.generatedAssets.length > 0;
  const isGeneratingAssets = currentSlide.status === 'generating_assets';

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-900 font-sans">
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-900 flex items-center justify-center">
                <Layout className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold text-xs uppercase tracking-widest text-slate-900">Lumina Deck</h1>
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-tighter text-slate-400">
                    {isSaving ? (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <CloudCheck className="w-3 h-3 text-emerald-500" />
                            <span>Saved</span>
                        </>
                    )}
                </div>
                {lastSavedAt && !isSaving && (
                  <span className="text-[8px] text-slate-400/60 uppercase font-medium">
                    At {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
            </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-sm">
             <button onClick={() => setShowOriginal(false)} className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded ${!showOriginal ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500'}`}>Consulting View</button>
             <button onClick={() => setShowOriginal(true)} className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded ${showOriginal ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500'}`}>Original PDF</button>
        </div>

        <div className="flex items-center gap-3">
            <button onClick={handleReset} className="p-2 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <Button variant="ghost" onClick={onPlay} className="h-9 px-3 text-[10px] uppercase tracking-widest font-bold"><Play className="w-3 h-3 mr-2" /> Present</Button>
            <Button variant="primary" onClick={() => setShowExportModal(true)} className="h-9 px-4 text-[10px] uppercase tracking-widest font-bold bg-blue-900 text-white rounded-none shadow-none"><Download className="w-3 h-3 mr-2" /> Export</Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-slate-200/50 relative flex flex-col">
            <div className="flex-1 flex items-center justify-center p-8 relative group">
                <button onClick={prevSlide} disabled={currentIndex === 0} className="absolute left-4 p-4 rounded-full text-slate-400 hover:text-slate-900 hover:bg-white transition-all disabled:opacity-0 z-20 shadow-sm"><ChevronLeft className="w-8 h-8" /></button>
                
                <div className="relative w-full max-w-5xl aspect-video bg-white shadow-2xl overflow-hidden group/canvas">
                    <img src={currentSlide.originalImage} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${showOriginal ? 'opacity-100' : 'opacity-0'}`} alt="Original" />
                    
                    {!showOriginal && (
                        <>
                            {currentSlide.videoUrl ? (
                                <video src={currentSlide.videoUrl} autoPlay loop muted className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply" />
                            ) : currentSlide.enhancedImage ? (
                                <img src={currentSlide.enhancedImage} className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-multiply" alt="Enhanced" />
                            ) : null}

                            {currentSlide.analysis ? renderConsultingOverlay(currentSlide.analysis, currentSlide.generatedAssets, currentSlide.status) : (
                                <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center gap-4">
                                    <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-900 rounded-full animate-spin" />
                                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">{getLoadingMessage(currentSlide.status)}</p>
                                </div>
                            )}
                        </>
                    )}

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-slate-900/90 text-white p-2 rounded-full opacity-0 group-hover/canvas:opacity-100 transition-all translate-y-4 group-hover/canvas:translate-y-0 z-50 shadow-xl backdrop-blur">
                        <button onClick={() => onUpgradeHD(currentSlide.id)} className="p-2 hover:bg-blue-600 rounded-full transition-colors group/btn relative">
                            <Zap className="w-4 h-4" />
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-[8px] px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 whitespace-nowrap">Upgrade to 4K</span>
                        </button>
                        <button onClick={() => { setVideoMode('background'); setShowVideoPrompt(true); }} className="p-2 hover:bg-purple-600 rounded-full transition-colors group/btn relative">
                            <Video className="w-4 h-4" />
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-[8px] px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 whitespace-nowrap">Animate Background</span>
                        </button>
                    </div>
                </div>

                <button onClick={nextSlide} disabled={currentIndex === slides.length - 1} className="absolute right-4 p-4 rounded-full text-slate-400 hover:text-slate-900 hover:bg-white transition-all disabled:opacity-0 z-20 shadow-sm"><ChevronRight className="w-8 h-8" /></button>
            </div>

            <div className="h-28 bg-white border-t border-slate-200 flex flex-col">
                <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pipeline Explorer</span>
                    <span className="text-[9px] font-bold text-slate-900">{currentIndex + 1} / {slides.length}</span>
                </div>
                <div ref={filmstripRef} className="flex-1 flex items-center gap-3 px-4 overflow-x-auto scrollbar-hide">
                    {slides.map((s, idx) => (
                        <button key={s.id} onClick={() => setCurrentIndex(idx)} className={`relative flex-shrink-0 w-28 aspect-video border-2 transition-all ${idx === currentIndex ? 'border-blue-900 opacity-100' : 'border-transparent opacity-40 hover:opacity-100'}`}>
                            <img src={s.originalImage} className="w-full h-full object-cover grayscale" alt={`Thumb ${idx}`} />
                            <div className="absolute top-1 right-1">{getStatusIcon(s.status)}</div>
                            <div className="absolute bottom-0 left-0 bg-white px-1 text-[8px] font-bold">{idx + 1}</div>
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-xl">
            <div className="h-14 border-b border-slate-200 flex items-center px-6 bg-slate-50">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2"><Sparkles className="w-3 h-3" /> Argument Editor</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-2"><MessageSquare className="w-3 h-3" /> Narrative Script</label>
                    <textarea 
                        className="w-full h-24 p-4 bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 leading-relaxed focus:ring-1 focus:ring-blue-500 outline-none rounded resize-none"
                        value={currentSlide.analysis?.script || ""}
                        onChange={(e) => handleTextChange('script', e.target.value)}
                        placeholder="Strategizing..."
                    />
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-2"><Layout className="w-3 h-3" /> Framework & Layout</label>
                    <select 
                        value={currentSlide.analysis?.consultingLayout || 'data-evidence'}
                        onChange={(e) => handleTextChange('consultingLayout', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 text-[10px] font-bold uppercase outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="data-evidence">Data & Evidence</option>
                        <option value="strategic-pillars">Strategic Pillars</option>
                        <option value="executive-summary">Executive Summary</option>
                        <option value="process-flow">Process Flow</option>
                    </select>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-6">
                    <div className="flex items-center justify-between">
                         <label className="text-[10px] font-bold uppercase text-slate-900 flex items-center gap-2"><Film className="w-3 h-3 text-purple-600" /> Transition Studio</label>
                         {currentSlide.transitionVideoUrl && <div className="p-1 bg-emerald-100 text-emerald-600 rounded"><CloudCheck className="w-3 h-3" /></div>}
                    </div>
                    
                    <div className="space-y-3">
                        <Button 
                            variant="secondary"
                            onClick={() => { setVideoMode('transition'); setShowVideoPrompt(true); }}
                            className="w-full h-10 text-[9px] uppercase font-bold"
                        >
                            <Video className="w-3 h-3 mr-2" /> Animate Current View
                        </Button>
                        
                        <div className="relative group">
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleTransitionPhotoUpload}
                              className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                            />
                            <div className="w-full h-10 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center gap-2 group-hover:border-purple-300 group-hover:bg-purple-50 transition-all">
                                <Plus className="w-3 h-3 text-slate-400 group-hover:text-purple-600" />
                                <span className="text-[9px] font-bold uppercase text-slate-500 group-hover:text-purple-600">Upload Transition Photo</span>
                            </div>
                        </div>
                    </div>

                    <select 
                        value={currentSlide.transitionType || 'fade'}
                        onChange={(e) => handleTransitionChange(e.target.value as any)}
                        className="w-full p-2 bg-white border border-slate-200 text-[10px] font-bold uppercase outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="fade">Fade (Standard)</option>
                        <option value="slide">Slide</option>
                        <option value="zoom">Zoom</option>
                        <option value="cinematic">Cinematic (Veo Powered)</option>
                    </select>
                </div>

                <div className="pt-8 border-t border-slate-100">
                    <Button 
                        onClick={() => onDeepAnalyze(currentSlide.id)}
                        disabled={currentSlide.status === 'analyzing'}
                        className="w-full bg-slate-900 text-white rounded-lg h-10 text-[10px] uppercase font-bold"
                    >
                        <BrainCircuit className="w-4 h-4 mr-2" /> Deep Analysis (Pro 3)
                    </Button>
                    <p className="mt-2 text-[9px] text-slate-400 text-center italic font-medium">Re-evaluate slide logic with Gemini Pro.</p>
                </div>
            </div>
        </div>
      </div>

      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-xl text-blue-600"><Settings2 className="w-6 h-6" /></div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Export Strategy Deck</h2>
                </div>
                <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-2">PPTX Export Range</label>
                  <input 
                    type="text" 
                    placeholder="E.g. 1-3, 5 (Leave empty for all)" 
                    value={exportRange}
                    onChange={(e) => setExportRange(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                  <p className="mt-1 text-[9px] text-slate-400 font-bold uppercase">Total slides: {slides.length}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={handleDownloadImage} className="flex flex-col items-center justify-center p-6 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all gap-2 group">
                    <FileImage className="w-8 h-8 text-indigo-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase text-slate-600">Download Slide</span>
                  </button>
                  <button onClick={handleExportRange} disabled={isExporting} className="flex flex-col items-center justify-center p-6 border border-slate-100 rounded-2xl hover:bg-blue-50 hover:border-blue-100 transition-all gap-2 group">
                    {isExporting ? <Loader2 className="w-8 h-8 animate-spin text-blue-600" /> : <Download className="w-8 h-8 text-blue-600 group-hover:translate-y-1 transition-transform" />}
                    <span className="text-[10px] font-bold uppercase text-blue-900">Generate PPTX</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVideoPrompt && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl border border-white/20">
                  <div className="flex items-center gap-4 mb-8">
                      <div className="p-4 bg-purple-100 rounded-2xl text-purple-600"><Video className="w-8 h-8" /></div>
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Veo 3.1 Fast Engine</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{videoMode === 'transition' ? 'Generate Cinematic Transition' : 'Generate Cinematic Background'}</p>
                      </div>
                  </div>
                  <textarea 
                    autoFocus
                    className="w-full h-40 p-6 bg-slate-50 border border-slate-200 text-base focus:ring-2 focus:ring-purple-500 outline-none rounded-2xl resize-none mb-8 font-medium"
                    placeholder="Describe cinematic motion: E.g. 'Dynamic camera sweep through city streets', 'Neon highlights pulsing on data grids', 'Ethereal flight through geometric structures'..."
                    value={videoPromptText}
                    onChange={(e) => setVideoPromptText(e.target.value)}
                  />
                  <div className="flex justify-end gap-3">
                      <Button variant="ghost" onClick={() => setShowVideoPrompt(false)}>Cancel</Button>
                      <Button onClick={handleVideoSubmit} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold px-8">Animate Strategy</Button>
                  </div>
              </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
