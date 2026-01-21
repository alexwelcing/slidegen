
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileType, Key, ExternalLink, Sparkles } from 'lucide-react';
import { convertPdfToImages } from './services/pdfService';
import { analyzeSlideContent, generateSlideVisual, generateVideoFromImage, deepAnalyzeSlide, performAreaEdit } from './services/geminiService';
import { loadProject, saveProject, updatePersistentSlide } from './services/storageService';
import { uploadMedia, logTask, persistDeck, isSupabaseConfigured } from './services/supabaseService';
import { createDemoDeck } from './services/demoService';
import { SlideData, AppMode, ProcessingStats, GeneratedAsset, SelectionRect } from './types';
import { Button } from './components/Button';
import { ProcessingView } from './components/ProcessingView';
import { PresentationEditor } from './components/PresentationEditor';
import { Player } from './components/Player';
import { SetupFlow } from './components/SetupFlow';

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.SETUP);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const slidesRef = useRef<SlideData[]>([]); 
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => { slidesRef.current = slides; }, [slides]);

  useEffect(() => {
    const init = async () => {
      // Check for Gemini API Key (standard aistudio check)
      if (window.aistudio?.hasSelectedApiKey) {
        setHasApiKey(await window.aistudio.hasSelectedApiKey());
      } else { setHasApiKey(true); }

      // Check if project exists
      const saved = await loadProject();
      if (saved?.length && isSupabaseConfigured()) { 
        setSlides(saved); 
        setMode(AppMode.EDITOR); 
        setLastSavedAt(new Date());
      } else if (!isSupabaseConfigured()) {
        setMode(AppMode.SETUP);
      } else {
        setMode(AppMode.UPLOAD);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (slides.length === 0 || mode === AppMode.SETUP) return;
    setIsSaving(true);
    const timeout = setTimeout(async () => {
      try {
        await saveProject(slides);
        await persistDeck(slides);
        setIsSaving(false);
        setLastSavedAt(new Date());
      } catch (err) {
        setIsSaving(false);
      }
    }, 3000); 
    return () => clearTimeout(timeout);
  }, [slides, mode]);

  const processingSlideIds = useRef<Set<string>>(new Set());
  const activeRequests = useRef(0);
  const MAX_CONCURRENT = 3;

  useEffect(() => {
    if (mode !== AppMode.EDITOR) return;
    const processQueue = async () => {
        if (activeRequests.current >= MAX_CONCURRENT) return;
        const currentSlides = slidesRef.current;
        const nextTaskSlide = currentSlides.find(s => 
          (s.status === 'pending' || s.status === 'analyzed') && !processingSlideIds.current.has(s.id)
        );

        if (nextTaskSlide) {
            const idx = currentSlides.indexOf(nextTaskSlide);
            processingSlideIds.current.add(nextTaskSlide.id);
            activeRequests.current++;

            if (nextTaskSlide.status === 'pending') {
                processSlideAnalysis(idx).finally(() => { 
                  processingSlideIds.current.delete(nextTaskSlide.id); 
                  activeRequests.current--; 
                });
            } else if (nextTaskSlide.status === 'analyzed') {
                processSlideVisuals(idx).finally(() => { 
                  processingSlideIds.current.delete(nextTaskSlide.id); 
                  activeRequests.current--; 
                });
            }
        }
    };
    const interval = setInterval(processQueue, 500);
    return () => clearInterval(interval);
  }, [mode]);

  const updateSlideState = async (index: number, updates: Partial<SlideData>) => {
      setSlides(prev => {
          const newSlides = [...prev];
          if (!newSlides[index]) return prev;
          newSlides[index] = { ...newSlides[index], ...updates };
          return newSlides;
      });
  };

  const processSlideAnalysis = async (index: number) => {
      const slide = slidesRef.current[index];
      if (!slide) return;
      await updateSlideState(index, { status: 'analyzing' });
      try {
          const { analysis, citations } = await analyzeSlideContent(slide.originalImage);
          await handleUpdateSlide(slide.id, { status: 'analyzed', analysis, groundingSources: citations });
      } catch (e: any) {
          await updateSlideState(index, { status: 'error', error: e.message });
      }
  };

  const processSlideVisuals = async (index: number) => {
      const slide = slidesRef.current[index];
      if (!slide?.analysis) return;
      await updateSlideState(index, { status: 'generating_image' });

      try {
          const bgUrl = await generateSlideVisual(slide.analysis.visualPrompt);
          let finalBg = bgUrl;
          if (bgUrl) {
            const publicUrl = await uploadMedia('media', `slides/${slide.id}_bg.png`, bgUrl);
            if (publicUrl) finalBg = publicUrl;
          }

          const updates: Partial<SlideData> = { status: 'complete', enhancedImage: finalBg };
          await handleUpdateSlide(slide.id, updates);
          await logTask(slide.id, 'complete', updates);
      } catch (e: any) {
          await updateSlideState(index, { status: 'error', error: e.message });
      }
  };

  const handleUpdateSlide = async (id: string, updates: Partial<SlideData>) => {
      setSlides(prev => {
          const index = prev.findIndex(s => s.id === id);
          if (index === -1) return prev;
          const newSlides = [...prev];
          newSlides[index] = { ...newSlides[index], ...updates };
          return newSlides;
      });
      const current = slidesRef.current.find(s => s.id === id);
      if (current) await updatePersistentSlide({ ...current, ...updates });
  };

  const handleGenerateVideo = async (id: string, prompt: string, type: 'background' | 'intro') => {
      const index = slidesRef.current.findIndex(s => s.id === id);
      if (index === -1) return;
      await updateSlideState(index, { status: 'generating_video' });
      try {
          const slide = slidesRef.current[index];
          const baseImg = slide.enhancedImage || slide.originalImage;
          const videoUrl = await generateVideoFromImage(baseImg, prompt);
          
          let finalVideo = videoUrl;
          if (videoUrl) {
            const publicUrl = await uploadMedia('media', `videos/${slide.id}_${type}.mp4`, videoUrl);
            if (publicUrl) finalVideo = publicUrl;
          }

          if (type === 'intro') {
             await handleUpdateSlide(id, { status: 'complete', transitionVideoUrl: finalVideo, transitionType: 'cinematic', videoPosition: 'intro' });
          } else {
             await handleUpdateSlide(id, { status: 'complete', videoUrl: finalVideo, videoPosition: 'background' });
          }
      } catch (e: any) { 
          handleUpdateSlide(id, { status: 'complete', error: "Veo fail: " + e.message }); 
      }
  };

  const handleDeepAnalyze = async (id: string) => {
      const index = slidesRef.current.findIndex(s => s.id === id);
      if (index === -1) return;
      await updateSlideState(index, { status: 'analyzing' });
      try {
          const slide = slidesRef.current[index];
          const analysis = await deepAnalyzeSlide(slide.originalImage);
          handleUpdateSlide(id, { status: 'analyzed', analysis });
      } catch (e: any) {
          handleUpdateSlide(id, { status: 'complete', error: "Deep analysis failed" });
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type === 'application/pdf') {
       try {
         setMode(AppMode.PROCESSING);
         const images = await convertPdfToImages(file);
         const initial = images.map((img, i) => ({ id: crypto.randomUUID(), originalImage: img, pageIndex: i, status: 'pending' as any }));
         setSlides(initial);
         setMode(AppMode.EDITOR);
       } catch { setMode(AppMode.UPLOAD); }
    }
  };
  
  const handleLoadDemo = () => {
    const demoSlides = createDemoDeck();
    setSlides(demoSlides);
    setMode(AppMode.EDITOR);
  };

  const stats: ProcessingStats = {
    totalSlides: slides.length,
    processedSlides: slides.filter(s => s.status === 'complete' || s.status === 'error').length,
    currentOperation: slides.find(s => !['pending', 'complete', 'error'].includes(s.status))?.status || 'Processing PDF...',
    startTime: Date.now()
  };

  if (mode === AppMode.SETUP) return <SetupFlow onComplete={() => setMode(AppMode.UPLOAD)} />;
  if (mode === AppMode.PROCESSING) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><ProcessingView stats={stats} /></div>;
  if (mode === AppMode.EDITOR) return (
    <PresentationEditor 
        slides={slides} 
        onPlay={() => setMode(AppMode.PRESENT)} 
        onReset={() => { setSlides([]); setMode(AppMode.UPLOAD); }} 
        onUpdateSlide={handleUpdateSlide} 
        onGenerateVideo={handleGenerateVideo} 
        onGenerateTransitionFromPhoto={() => {}} 
        onUpgradeHD={() => {}}
        onDeepAnalyze={handleDeepAnalyze}
        onEditArea={async (id, rect, prompt) => {
          const index = slidesRef.current.findIndex(s => s.id === id);
          if (index === -1) return;
          const slide = slidesRef.current[index];
          await updateSlideState(index, { status: 'editing_area' });
          const updates = await performAreaEdit(slide.originalImage, rect, prompt);
          if (slide.analysis) {
            handleUpdateSlide(id, { analysis: { ...slide.analysis, ...updates }, status: 'complete' });
          }
        }}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
    />
  );
  if (mode === AppMode.PRESENT) return <Player slides={slides} onExit={() => setMode(AppMode.EDITOR)} />;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />

      <div className="max-w-xl w-full text-center relative z-10">
        <div className="mb-8 inline-block p-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <FileType className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-6xl font-serif font-bold text-white mb-6 tracking-tighter">Lumina Agent</h1>
        <p className="text-slate-400 text-lg mb-12 font-light leading-relaxed">
          Upload your strategy deck. <br/>
          <span className="text-blue-400 font-mono text-sm uppercase tracking-widest">Gemini 3 Pro + Veo 3.1</span> will handle the rest.
        </p>
        
        <div className="flex flex-col gap-4">
            <div className="relative group">
                <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative border border-dashed border-white/20 bg-black/40 backdrop-blur-xl rounded-3xl p-16 transition-all hover:border-blue-500/50 hover:bg-black/60 flex flex-col items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-slate-300" />
                    </div>
                    <div className="text-center">
                        <p className="text-white font-bold uppercase tracking-widest text-sm mb-2">Drag & Drop PDF</p>
                        <p className="text-slate-500 text-xs">or click to browse filesystem</p>
                    </div>
                    <input type="file" accept="application/pdf" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
            </div>

            <Button onClick={handleLoadDemo} variant="secondary" className="w-full text-xs uppercase tracking-widest bg-white/5 hover:bg-white/10 border-white/10">
                <Sparkles className="w-4 h-4 mr-2" /> Load Demo Deck (Agentic Engineering)
            </Button>
        </div>
      </div>
    </div>
  );
}
