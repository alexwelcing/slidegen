
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlideData } from '../types';
import { X, Globe } from 'lucide-react';

interface PlayerProps {
  slides: SlideData[];
  onExit: () => void;
}

export const Player: React.FC<PlayerProps> = ({ slides, onExit }) => {
  const [index, setIndex] = useState(0);
  const [isPlayingIntro, setIsPlayingIntro] = useState(false);
  const [enhancedLoaded, setEnhancedLoaded] = useState(false);
  const [enhancedError, setEnhancedError] = useState(false);
  
  const currentSlide = slides[index];

  useEffect(() => {
    if (currentSlide.transitionVideoUrl && currentSlide.videoPosition === 'intro') {
      setIsPlayingIntro(true);
    } else {
      setIsPlayingIntro(false);
    }
    setEnhancedLoaded(false);
    setEnhancedError(false);
  }, [index, currentSlide]);

  const handleNext = () => { if (index < slides.length - 1) setIndex(index + 1); };
  const handlePrev = () => { if (index > 0) setIndex(index - 1); };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [index]);

  const shouldUseEnhanced = !!currentSlide.enhancedImage && !enhancedError;
  const shouldBlurBaseLayer = shouldUseEnhanced && !enhancedLoaded;

  const renderSmartLayout = () => {
    const analysis = currentSlide.analysis;
    if (!analysis) return null;

    const layout = analysis.consultingLayout || 'editorial-left';

    // 1. Minimal Centered
    if (layout === 'minimal-centered') {
      return (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-20">
           <motion.h1 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="font-serif text-7xl md:text-9xl text-white font-bold leading-tight drop-shadow-2xl tracking-tighter mb-8 max-w-5xl">
             {analysis.actionTitle}
           </motion.h1>
           <motion.div initial={{ width: 0 }} animate={{ width: 128 }} className="h-2 bg-blue-500 mb-12" />
           <p className="font-sans text-xl font-bold uppercase tracking-[0.3em] text-blue-200 mb-16">{analysis.subtitle}</p>
           <div className="flex gap-12 justify-center">
             {analysis.keyTakeaways.slice(0, 3).map((pt, i) => (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + (i * 0.1) }} key={i} className="max-w-xs text-white/90 text-lg font-medium leading-relaxed bg-black/40 p-6 rounded-2xl backdrop-blur-xl border border-white/20">
                   {pt}
                </motion.div>
             ))}
           </div>
        </div>
      );
    }

    // 2. Editorial Left
    if (layout === 'editorial-left') {
      return (
        <div className="absolute inset-0 z-20 flex">
          <div className="w-[45%] h-full bg-gradient-to-r from-black/95 via-black/80 to-transparent p-16 flex flex-col justify-center pl-24">
             <div className="mb-auto mt-20">
               <p className="font-sans text-sm font-bold uppercase tracking-[0.2em] text-blue-400 mb-6">{analysis.subtitle}</p>
               <motion.h1 initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} className="font-serif text-6xl md:text-7xl text-white font-medium leading-none drop-shadow-lg tracking-tight mb-8">
                 {analysis.actionTitle}
               </motion.h1>
               <div className="h-1 w-24 bg-white/20 mb-12" />
             </div>
             <div className="space-y-8 mb-20">
               {analysis.keyTakeaways.slice(0, 3).map((pt, i) => (
                 <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + (i * 0.1) }} key={i} className="flex gap-6 items-start">
                   <span className="font-mono text-blue-500 text-sm mt-2">0{i+1}</span>
                   <p className="font-sans text-xl text-white/90 font-light leading-relaxed drop-shadow-md">{pt}</p>
                 </motion.div>
               ))}
             </div>
             {currentSlide.groundingSources?.[0] && (
                <div className="flex items-center gap-3 text-xs text-white/40 uppercase tracking-widest mt-auto">
                   <Globe className="w-4 h-4" /> {currentSlide.groundingSources[0].title}
                </div>
             )}
          </div>
          <div className="w-[55%]" />
        </div>
      );
    }

    // 3. Editorial Right
    if (layout === 'editorial-right') {
      return (
        <div className="absolute inset-0 z-20 flex">
           <div className="w-[55%]" />
           <div className="w-[45%] h-full bg-gradient-to-l from-black/95 via-black/80 to-transparent p-16 flex flex-col justify-center text-right items-end pr-24">
             <div className="mb-auto mt-20">
               <p className="font-sans text-sm font-bold uppercase tracking-[0.2em] text-blue-400 mb-6">{analysis.subtitle}</p>
               <motion.h1 initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="font-serif text-6xl md:text-7xl text-white font-medium leading-none drop-shadow-lg tracking-tight mb-8">
                 {analysis.actionTitle}
               </motion.h1>
               <div className="h-1 w-24 bg-white/20 mb-12 ml-auto" />
             </div>
             <div className="space-y-8 mb-20">
               {analysis.keyTakeaways.slice(0, 3).map((pt, i) => (
                 <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + (i * 0.1) }} key={i} className="flex gap-6 items-start justify-end">
                   <p className="font-sans text-xl text-white/90 font-light leading-relaxed drop-shadow-md">{pt}</p>
                   <span className="font-mono text-blue-500 text-sm mt-2">0{i+1}</span>
                 </motion.div>
               ))}
             </div>
             {currentSlide.groundingSources?.[0] && (
                <div className="flex items-center gap-3 text-xs text-white/40 uppercase tracking-widest mt-auto">
                   {currentSlide.groundingSources[0].title} <Globe className="w-4 h-4" />
                </div>
             )}
           </div>
        </div>
      );
    }

    // 4. McKinsey Insight
    return (
      <div className="absolute inset-0 z-20 flex flex-col justify-between">
          <div className="bg-gradient-to-b from-black/90 to-transparent p-16 pb-32">
             <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="font-serif text-5xl md:text-6xl text-white font-semibold tracking-tight mb-4 drop-shadow-xl">{analysis.actionTitle}</motion.h1>
             <p className="text-lg font-sans text-white/70 uppercase tracking-widest">{analysis.subtitle}</p>
          </div>
          <div className="bg-gradient-to-t from-black/95 via-black/80 to-transparent p-16 pt-32 grid grid-cols-3 gap-12">
             {analysis.keyTakeaways.slice(0,3).map((pt, i) => (
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + (i * 0.1) }} key={i} className="border-t-2 border-blue-500/50 pt-6">
                  <span className="text-sm font-bold text-blue-400 block mb-3">KEY POINT {i+1}</span>
                  <p className="text-xl text-white/90 leading-relaxed font-light">{pt}</p>
               </motion.div>
             ))}
          </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] cursor-none overflow-hidden font-sans">
      <AnimatePresence mode="wait">
        {isPlayingIntro ? (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
            <video src={currentSlide.transitionVideoUrl} autoPlay muted onEnded={() => setIsPlayingIntro(false)} className="w-full h-full object-cover" />
          </motion.div>
        ) : (
          <motion.div key={`slide-${index}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.8 }} className="absolute inset-0">
             {/* Stacked Visual Layer */}
             <div className="absolute inset-0">
                 {/* Layer 1: Base */}
                 <img 
                   src={currentSlide.originalImage} 
                   className={`absolute inset-0 w-full h-full object-cover ${shouldBlurBaseLayer ? 'blur-xl scale-105 opacity-50' : 'opacity-100'}`} 
                   alt="Original"
                 />
                 {/* Layer 2: Enhanced */}
                 {shouldUseEnhanced && (
                    <img 
                       src={currentSlide.enhancedImage} 
                       onLoad={() => setEnhancedLoaded(true)}
                       onError={() => setEnhancedError(true)}
                       className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${enhancedLoaded ? 'opacity-100' : 'opacity-0'}`} 
                       alt="Enhanced"
                    />
                 )}
                 {/* Layer 3: Video */}
                 {currentSlide.videoUrl && currentSlide.videoPosition === 'background' && (
                   <video src={currentSlide.videoUrl} autoPlay loop muted className="w-full h-full object-cover opacity-60" />
                 )}
                 {/* Layer 4: Dimmer */}
                 <div className={`absolute inset-0 transition-colors duration-500 ${shouldBlurBaseLayer ? 'bg-black/80' : 'bg-black/10'}`} /> 
             </div>
             
             {renderSmartLayout()}
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={onExit} className="absolute top-8 right-8 p-4 rounded-full bg-white/5 hover:bg-white/20 text-white backdrop-blur-md transition-all z-50 group">
        <X className="w-6 h-6 opacity-50 group-hover:opacity-100" />
      </button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
        <motion.div className="h-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]" initial={{ width: 0 }} animate={{ width: `${((index + 1) / slides.length) * 100}%` }} transition={{ ease: "linear" }} />
      </div>
    </div>
  );
};
