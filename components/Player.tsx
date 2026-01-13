
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlideData } from '../types';
import { X, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

interface PlayerProps {
  slides: SlideData[];
  onExit: () => void;
}

const transitionVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  slide: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 0 }
  },
  zoom: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.2, opacity: 0 }
  },
  cinematic: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  }
};

export const Player: React.FC<PlayerProps> = ({ slides, onExit }) => {
  const [index, setIndex] = useState(0);
  const [isPlayingTransition, setIsPlayingTransition] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const currentSlide = slides[index];

  const handleNext = () => {
    if (index < slides.length - 1) {
        const nextIdx = index + 1;
        const nextSlide = slides[nextIdx];
        if (nextSlide.transitionVideoUrl && nextSlide.transitionType === 'cinematic') {
            setIsPlayingTransition(true);
            setIndex(nextIdx);
        } else {
            setIndex(nextIdx);
        }
    }
  };

  const handlePrev = () => {
    if (index > 0) {
        setIndex(index - 1);
        setIsPlayingTransition(false); // Transitions only play forward for effect
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [index, slides.length, onExit]);

  const onTransitionEnd = () => {
    setIsPlayingTransition(false);
  };

  const renderSlideContent = () => {
      const analysis = currentSlide.analysis;
      if (!analysis) return null;

      const layout = analysis.consultingLayout || 'data-evidence';
      const assets = currentSlide.generatedAssets;

      const renderHeader = () => (
          <div className="absolute top-0 left-0 w-full h-32 border-b border-slate-200 px-16 flex flex-col justify-center z-20 bg-white">
              <motion.h1 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="text-4xl font-extrabold text-slate-900 leading-tight w-full max-w-5xl tracking-tight"
              >
                  {analysis.actionTitle}
              </motion.h1>
              {analysis.subtitle && (
                  <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center gap-4 mt-4"
                  >
                      <div className="h-0.5 w-10 bg-blue-900" />
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">
                          {analysis.subtitle}
                      </p>
                  </motion.div>
              )}
          </div>
      );

      const renderBody = () => {
          if (layout === 'strategic-pillars') {
               return (
                  <div className="absolute top-32 left-0 w-full bottom-16 flex px-16 pt-12 gap-12">
                      {analysis.keyTakeaways?.slice(0, 3).map((point, i) => (
                          <motion.div 
                              key={i}
                              initial={{ opacity: 0, y: 30 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.5 + (i * 0.15), duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                              className="flex-1 border-t-4 border-slate-900 pt-8"
                          >
                              <h3 className="text-2xl font-bold text-slate-900 mb-6 font-mono">0{i+1}</h3>
                              <p className="text-xl text-slate-700 leading-relaxed font-medium">{point}</p>
                              {assets && assets[i] && (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 1 + (i * 0.15) }}
                                    className="mt-12 bg-slate-50 p-8 h-80 flex items-center justify-center border border-slate-100 rounded-xl"
                                  >
                                      <img src={assets[i].imageUrl} className="w-full h-full object-contain mix-blend-multiply" alt="Visual Asset" />
                                  </motion.div>
                              )}
                          </motion.div>
                      ))}
                  </div>
               );
          }

          if (layout === 'data-evidence') {
              return (
                  <div className="absolute top-32 left-0 w-full bottom-16 flex px-16 pt-12 gap-20">
                      <motion.div 
                          initial={{ opacity: 0, scale: 0.99 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                          className="w-3/5 h-full bg-slate-50 border border-slate-100 flex items-center justify-center relative p-16 rounded-2xl shadow-sm"
                      >
                          {assets && assets[0] && (
                              <img src={assets[0].imageUrl} className="w-full h-full object-contain mix-blend-multiply" alt="Evidence Chart" />
                          )}
                          <div className="absolute bottom-8 right-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest">FIGURE 1.1 - Strategy Insight</div>
                      </motion.div>
                      
                      <div className="w-2/5 flex flex-col justify-center space-y-12">
                          {analysis.keyTakeaways?.map((point, i) => (
                              <motion.div 
                                key={i} 
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.7 + (i * 0.15), duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                                className="flex gap-8"
                              >
                                  <div className="w-4 h-4 bg-blue-900 mt-2 flex-shrink-0" />
                                  <p className="text-2xl text-slate-800 font-bold leading-snug tracking-tight">{point}</p>
                              </motion.div>
                          ))}
                      </div>
                  </div>
              );
          }

          return (
              <div className="absolute top-32 left-0 w-full bottom-16 px-16 pt-12">
                  <div className="max-w-4xl space-y-12">
                      {analysis.keyTakeaways?.map((point, i) => (
                          <motion.div 
                              key={i} 
                              initial={{ opacity: 0, y: 30 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.5 + (i * 0.15), duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                              className="flex gap-10 pb-10 border-b border-slate-100 last:border-0"
                          >
                              <div className="text-blue-900 font-black text-3xl font-mono">0{i+1}</div>
                              <p className="text-3xl text-slate-800 leading-relaxed font-light tracking-tight">{point}</p>
                          </motion.div>
                      ))}
                  </div>
              </div>
          );
      };

      return (
          <div className="absolute inset-0 bg-white font-sans overflow-hidden">
              {renderHeader()}
              {renderBody()}
              <div className="absolute bottom-0 left-0 w-full h-16 border-t border-slate-200 bg-white px-16 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                  <div className="flex items-center gap-6">
                    <span>Lumina Strategy Group</span>
                    <span className="w-px h-4 bg-slate-200" />
                    <span className="text-slate-300">Strictly Confidential</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>Slide {index + 1} of {slides.length}</span>
                  </div>
              </div>
          </div>
      );
  };

  const selectedTransition = currentSlide.transitionType || 'fade';
  const variants = transitionVariants[selectedTransition];

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col font-sans cursor-none">
      <div className="absolute top-8 right-8 z-[100] opacity-0 hover:opacity-100 transition-opacity">
        <button onClick={onExit} className="p-4 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-xl border border-white/20 shadow-2xl">
          <X className="w-8 h-8" />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden bg-white">
        <AnimatePresence mode='wait'>
          {!isPlayingTransition ? (
            <motion.div
              key={`slide-${index}`}
              initial={variants.initial}
              animate={variants.animate}
              exit={variants.exit}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 w-full h-full"
            >
              {renderSlideContent()}
            </motion.div>
          ) : (
            <motion.div 
                key="transition-video"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-black flex items-center justify-center"
            >
                <video 
                    ref={videoRef}
                    src={currentSlide.transitionVideoUrl} 
                    autoPlay 
                    onEnded={onTransitionEnd}
                    className="w-full h-full object-cover"
                />
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] pointer-events-none">
                    Cinematic Transition Sequence
                </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

       <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-100 z-[60]">
         <motion.div 
           className="h-full bg-blue-900"
           initial={{ width: 0 }}
           animate={{ width: `${((index + 1) / slides.length) * 100}%` }}
           transition={{ duration: 0.3 }}
         />
       </div>

       <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-12 text-slate-400 opacity-0 hover:opacity-100 transition-opacity pointer-events-none z-[60]">
          <div className="flex items-center gap-3 text-[10px] uppercase font-black tracking-[0.2em] bg-white/80 px-4 py-2 rounded-full shadow-sm backdrop-blur">
            <ChevronLeft className="w-4 h-4" /> Prev
          </div>
          <div className="flex items-center gap-3 text-[10px] uppercase font-black tracking-[0.2em] bg-white/80 px-4 py-2 rounded-full shadow-sm backdrop-blur">
            Next <ChevronRight className="w-4 h-4" />
          </div>
       </div>
    </div>
  );
};
