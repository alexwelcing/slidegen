
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileType, Key, ExternalLink } from 'lucide-react';
import { convertPdfToImages } from './services/pdfService';
import { analyzeSlideContent, generateSlideVisual, generateAssetImage, generateVideoFromImage, generateSlideVisualPro, deepAnalyzeSlide } from './services/geminiService';
import { loadProject, saveProject, updatePersistentSlide } from './services/storageService';
import { SlideData, AppMode, ProcessingStats, GeneratedAsset } from './types';
import { Button } from './components/Button';
import { ProcessingView } from './components/ProcessingView';
import { PresentationEditor } from './components/PresentationEditor';
import { Player } from './components/Player';

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.UPLOAD);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const slidesRef = useRef<SlideData[]>([]); 
  const [stats, setStats] = useState<ProcessingStats>({ totalSlides: 0, processedSlides: 0, currentOperation: '', startTime: 0 });
  const [hasApiKey, setHasApiKey] = useState(false);
  const [keyCheckLoading, setKeyCheckLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => { slidesRef.current = slides; }, [slides]);

  useEffect(() => {
    const init = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        setHasApiKey(await window.aistudio.hasSelectedApiKey());
      } else { setHasApiKey(true); }
      setKeyCheckLoading(false);
      const saved = await loadProject();
      if (saved?.length) { 
        setSlides(saved); 
        setMode(AppMode.EDITOR); 
        setLastSavedAt(new Date());
      }
    };
    init();
  }, []);

  // Durable Checkpoint Saver
  const durableCheckpoint = async (id: string, updates: Partial<SlideData>) => {
    const currentSlides = slidesRef.current;
    const idx = currentSlides.findIndex(s => s.id === id);
    if (idx === -1) return;
    
    const updatedSlide = { ...currentSlides[idx], ...updates };
    await updatePersistentSlide(updatedSlide);
  };

  useEffect(() => {
    if (slides.length === 0) return;
    setIsSaving(true);
    const timeout = setTimeout(async () => {
      try {
        await saveProject(slides);
        setIsSaving(false);
        setLastSavedAt(new Date());
      } catch (err) {
        console.error("Auto-save failed", err);
        setIsSaving(false);
      }
    }, 2000); 
    return () => clearTimeout(timeout);
  }, [slides]);

  const handleSelectKey = async () => { 
    if (window.aistudio) { 
      await window.aistudio.openSelectKey(); 
      setHasApiKey(true); 
    } 
  };
  
  const handleReset = () => { setSlides([]); setMode(AppMode.UPLOAD); };

  const processingSlideIds = useRef<Set<string>>(new Set());
  const activeRequests = useRef(0);
  const MAX_CONCURRENT = 5;

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
    const interval = setInterval(processQueue, 300);
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
          const analysis = await analyzeSlideContent(slide.originalImage);
          const updates: Partial<SlideData> = { status: 'analyzed', analysis };
          await durableCheckpoint(slide.id, updates);
          await updateSlideState(index, updates);
      } catch (e: any) {
          await updateSlideState(index, { status: 'error', error: e.message });
      }
  };

  const processSlideVisuals = async (index: number) => {
      const slide = slidesRef.current[index];
      if (!slide?.analysis) return;
      await updateSlideState(index, { status: 'generating_image' });

      try {
          const bgPromise = generateSlideVisual(slide.analysis.visualPrompt);
          const assetsPromise = (async () => {
             const prompts = (slide.analysis?.assetPrompts || []).slice(0, 2);
             if (prompts.length === 0) return [];
             const results = await Promise.all(prompts.map(async p => {
                 try { 
                   const url = await generateAssetImage(p); 
                   return url ? ({ id: crypto.randomUUID(), prompt: p, imageUrl: url } as GeneratedAsset) : null; 
                 } catch { return null; }
             }));
             return results.filter((r): r is GeneratedAsset => r !== null);
          })();

          const [enhancedImage, generatedAssets] = await Promise.all([bgPromise, assetsPromise]);
          const updates: Partial<SlideData> = { status: 'complete', enhancedImage, generatedAssets };
          await durableCheckpoint(slide.id, updates);
          await updateSlideState(index, updates);
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
          if (updates.analysis && newSlides[index].analysis) {
             newSlides[index].analysis = { ...newSlides[index].analysis, ...updates.analysis };
          }
          return newSlides;
      });
      await durableCheckpoint(id, updates);
  };

  const handleGenerateVideo = async (id: string, prompt: string, isTransition: boolean = false) => {
      const index = slidesRef.current.findIndex(s => s.id === id);
      if (index === -1) return;
      await updateSlideState(index, { status: 'generating_video' });
      try {
          const slide = slidesRef.current[index];
          // Use original image as base if no enhanced one exists
          const baseImg = slide.enhancedImage || slide.originalImage;
          const videoUrl = await generateVideoFromImage(baseImg, prompt);
          
          if (isTransition) {
             await handleUpdateSlide(id, { status: 'complete', transitionVideoUrl: videoUrl, transitionType: 'cinematic' });
          } else {
             await handleUpdateSlide(id, { status: 'complete', videoUrl });
          }
      } catch (e: any) { 
          handleUpdateSlide(id, { status: 'complete', error: "Veo generation failed: " + e.message }); 
      }
  };

  const handleGenerateTransitionFromPhoto = async (id: string, file: File, prompt: string) => {
      const index = slidesRef.current.findIndex(s => s.id === id);
      if (index === -1) return;
      await updateSlideState(index, { status: 'generating_video' });
      try {
          const reader = new FileReader();
          const base64: string = await new Promise((resolve) => {
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
          });
          const videoUrl = await generateVideoFromImage(base64, prompt);
          await handleUpdateSlide(id, { status: 'complete', transitionVideoUrl: videoUrl, transitionType: 'cinematic' });
      } catch (e: any) {
          handleUpdateSlide(id, { status: 'complete', error: "Transition fail: " + e.message });
      }
  };

  const handleUpgradeHD = async (id: string) => {
      const index = slidesRef.current.findIndex(s => s.id === id);
      if (index === -1) return;
      await updateSlideState(index, { status: 'generating_image' });
      try {
          const slide = slidesRef.current[index];
          if (slide.analysis) {
            const hdImage = await generateSlideVisualPro(slide.analysis.visualPrompt, "2K");
            handleUpdateSlide(id, { status: 'complete', enhancedImage: hdImage });
          }
      } catch { handleUpdateSlide(id, { status: 'complete' }); }
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

  const handleGenerateAssets = async (id: string) => {
    const index = slidesRef.current.findIndex(s => s.id === id);
    if (index === -1) return;
    const slide = slidesRef.current[index];
    if (!slide.analysis) return;
    
    await updateSlideState(index, { status: 'generating_assets' });
    try {
      const prompts = (slide.analysis?.assetPrompts || []).slice(0, 2);
      const results = await Promise.all(prompts.map(async p => {
          try { 
            const url = await generateAssetImage(p); 
            return url ? ({ id: crypto.randomUUID(), prompt: p, imageUrl: url } as GeneratedAsset) : null; 
          } catch { return null; }
      }));
      const generatedAssets = results.filter((r): r is GeneratedAsset => r !== null);
      handleUpdateSlide(id, { status: 'complete', generatedAssets });
    } catch {
      handleUpdateSlide(id, { status: 'complete' });
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

  if (mode === AppMode.PROCESSING) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><ProcessingView stats={stats} /></div>;
  if (mode === AppMode.EDITOR) return (
    <PresentationEditor 
        slides={slides} 
        onPlay={() => setMode(AppMode.PRESENT)} 
        onReset={handleReset} 
        onUpdateSlide={handleUpdateSlide} 
        onGenerateVideo={handleGenerateVideo} 
        onGenerateTransitionFromPhoto={handleGenerateTransitionFromPhoto}
        onUpgradeHD={handleUpgradeHD} 
        onDeepAnalyze={handleDeepAnalyze}
        onGenerateAssets={handleGenerateAssets}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
    />
  );
  if (mode === AppMode.PRESENT) return <Player slides={slides} onExit={() => setMode(AppMode.EDITOR)} />;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 mb-6 tracking-tight">Lumina Deck</h1>
        <p className="text-slate-400 text-lg mb-12 font-light">Transform PDFs into cinematic strategy presentations with Gemini Multimodal AI.</p>
        {!keyCheckLoading && !hasApiKey ? (
            <div className="border border-amber-500/30 bg-slate-900/50 rounded-2xl p-12 backdrop-blur-sm">
                <Button onClick={handleSelectKey} className="w-full bg-amber-600">Connect Google Cloud</Button>
            </div>
        ) : (
            <div className="border-2 border-dashed border-slate-700 bg-slate-900/50 rounded-2xl p-12 transition-all hover:border-blue-500/50 group">
                <FileType className="w-12 h-12 text-slate-500 group-hover:text-blue-400 mx-auto mb-6 transition-colors" />
                <h3 className="text-xl font-semibold mb-8">Upload Strategy PDF</h3>
                <div className="relative">
                    <input type="file" accept="application/pdf" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Button className="w-full">Select File</Button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
