import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Image as ImageIcon, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { ProcessingStats } from '../types';

interface ProcessingViewProps {
  stats: ProcessingStats;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({ stats }) => {
  const progress = Math.min(100, (stats.processedSlides / stats.totalSlides) * 100);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-2xl mx-auto p-8">
      <div className="relative mb-12">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-t-2 border-r-2 border-blue-500/30 blur-sm w-32 h-32 -m-1"
        />
        <div className="w-32 h-32 bg-slate-900 rounded-full border border-slate-700 flex items-center justify-center relative z-10 shadow-2xl shadow-blue-500/20">
            <Brain className="w-12 h-12 text-blue-400" />
        </div>
      </div>

      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-4 text-center">
        Reimagining Your Presentation
      </h2>
      
      <p className="text-slate-400 mb-8 text-center max-w-md">
        Gemini is analyzing structure, writing scripts, and generating cinematic visuals for {stats.totalSlides} slides.
      </p>

      <div className="w-full bg-slate-800/50 rounded-full h-2 mb-8 overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        <StatusItem 
            icon={<FileText className="w-5 h-5" />}
            label="Analysing Text"
            active={true}
        />
        <StatusItem 
            icon={<Sparkles className="w-5 h-5" />}
            label="Enhancing Logic"
            active={true}
            delay={0.2}
        />
        <StatusItem 
            icon={<ImageIcon className="w-5 h-5" />}
            label="Generating Visuals"
            active={true}
            delay={0.4}
        />
        <StatusItem 
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="Assembling Deck"
            active={progress > 90}
            delay={0.6}
        />
      </div>
      
      <div className="mt-8 text-xs text-slate-500 font-mono">
        {stats.currentOperation}...
      </div>
    </div>
  );
};

const StatusItem = ({ icon, label, active, delay = 0 }: { icon: React.ReactNode, label: string, active: boolean, delay?: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: active ? 1 : 0.4, y: 0 }}
    transition={{ delay }}
    className={`flex items-center gap-3 p-3 rounded-lg border ${active ? 'bg-blue-500/10 border-blue-500/30 text-blue-200' : 'bg-slate-800/50 border-slate-700 text-slate-500'}`}
  >
    {icon}
    <span className="text-sm font-medium">{label}</span>
  </motion.div>
);
