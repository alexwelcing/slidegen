
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlideData } from '../types';
import { X, ChevronRight, ChevronLeft, Globe } from 'lucide-react';

interface PlayerProps {
  slides: SlideData[];
  onExit: () => void;
}

export const Player: React.FC<PlayerProps> = ({ slides, onExit }) => {
  const [index, setIndex] = useState(0);
  const [isPlayingIntro, setIsPlayingIntro] = useState(false);
  const currentSlide = slides[index];

  useEffect(() => {
    if (currentSlide.transitionVideoUrl && currentSlide.videoPosition === 'intro') {
      setIsPlayingIntro(true);
    } else {
      setIsPlayingIntro(false);
    }
  }, [index, currentSlide]);

  const handleNext = () => {
    if (index < slides.length - 1) setIndex(index + 1);
  };

  const handlePrev = () => {
    if (index > 0) setIndex(index - 1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [index, slides.length]);

  const renderSlideContent = () => {
      const analysis = currentSlide.analysis;
      if (!analysis) return null;

      return (
          <div className="absolute inset-0 bg-white flex flex-col overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-40 border-b border-slate-100 px-20 flex flex-col justify-center z-20 bg-white">
                  <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-5xl font-black text-slate-950 tracking-tight">{analysis.actionTitle}</motion.h1>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.4em] mt-2">{analysis.subtitle}</p>
              </div>

              <div className="flex-1 flex px-20 pt-48 gap-20">
                  <div className="w-1/2 flex flex-col gap-10">
                      {analysis.keyTakeaways.map((point, i) => (
                          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 * i }} className="flex gap-6">
                              <div className="w-6 h-1.5 bg-blue-900 mt-4 flex-shrink-0" />
                              <p className="text-2xl text-slate-800 font-bold leading-tight">{point}</p>
                          </motion.div>
                      ))}
                  </div>
                  <div className="w-1/2 h-[60vh] bg-slate-50 rounded-3xl overflow-hidden relative">
                      {currentSlide.videoUrl && currentSlide.videoPosition === 'background' ? (
                        <video src={currentSlide.videoUrl} autoPlay loop muted className="w-full h-full object-cover" />
                      ) : (
                        <img src={currentSlide.enhancedImage} className="w-full h-full object-cover" alt="Visual" />
                      )}
                  </div>
              </div>

              {/* Citations Footer */}
              {currentSlide.groundingSources && currentSlide.groundingSources.length > 0 && (
                <div className="absolute bottom-24 left-20 flex gap-4">
                  {currentSlide.groundingSources.slice(0, 3).map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-blue-900/40 uppercase tracking-widest">
                      <Globe className="w-3 h-3" /> {s.title}
                    </div>
                  ))}
                </div>
              )}
          </div>
      );
  };

  return (
    <div className="fixed inset-0 bg-black z-50 cursor-none">
      <AnimatePresence mode="wait">
        {isPlayingIntro ? (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black flex items-center justify-center">
            <video 
              src={currentSlide.transitionVideoUrl} 
              autoPlay 
              muted 
              onEnded={() => setIsPlayingIntro(false)} 
              className="w-full h-full object-cover" 
            />
            <div className="absolute top-12 left-1/2 -translate-x-1/2 text-white/40 text-[10px] font-bold uppercase tracking-[0.5em]">Intro Sequence Synthesis</div>
          </motion.div>
        ) : (
          <motion.div key={`slide-${index}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
            {renderSlideContent()}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-10 right-10 z-[100] group">
        <button onClick={onExit} className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl transition-all"><X className="w-8 h-8" /></button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100/10">
        <motion.div className="h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.8)]" initial={{ width: 0 }} animate={{ width: `${((index + 1) / slides.length) * 100}%` }} />
      </div>
    </div>
  );
};
