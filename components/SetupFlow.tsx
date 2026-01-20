
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, ShieldCheck, Zap, Loader2, CheckCircle2, AlertTriangle, Cpu, Rocket, Copy, Terminal, Check, Key, Info } from 'lucide-react';
import { Button } from './Button';
import { runSystemDiagnostics } from '../services/geminiService';
import { configureSupabase } from '../services/supabaseService';

interface SetupFlowProps {
  onComplete: () => void;
}

export const SetupFlow: React.FC<SetupFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [dbUrl, setDbUrl] = useState(localStorage.getItem('lumina_supabase_url') || '');
  const [dbKey, setDbKey] = useState(localStorage.getItem('lumina_supabase_key') || '');
  const [diagnosticLogs, setDiagnosticLogs] = useState<{msg: string, success: boolean | null}[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasGeminiKey(selected);
      } else {
        setHasGeminiKey(true); // Development environment
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasGeminiKey(true);
    }
  };

  const sqlSetup = `-- 1. Create Tables in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS lumina_tasks (
  id TEXT PRIMARY KEY,
  status TEXT,
  last_payload JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lumina_decks (
  id TEXT PRIMARY KEY,
  slides JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Storage Bucket
-- Go to Storage -> New Bucket -> Name it "media" and make it PUBLIC.`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSetup);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStep1 = () => {
    if (dbUrl && dbKey) {
      configureSupabase(dbUrl, dbKey);
      setStep(2);
    } else {
      alert("Please enter both Supabase URL and Key");
    }
  };

  const startIgnition = async () => {
    setIsTesting(true);
    setDiagnosticLogs([]);
    setTestError(null);
    try {
      await runSystemDiagnostics((msg, success) => {
        setDiagnosticLogs(prev => [...prev, { msg, success }]);
      });
      setTimeout(() => setStep(3), 1000);
    } catch (e: any) {
      let msg = e.message || "Diagnostic test failed.";
      if (msg.includes("entity was not found")) {
        msg = "API Key error. Please re-select your Gemini API Key in the previous step.";
      }
      setTestError(msg);
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -100 }}
            className="w-full max-w-2xl bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative z-10"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-blue-500/20 rounded-2xl text-blue-400"><Database className="w-8 h-8" /></div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Step 1</h2>
                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Infrastructure Sync</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-400" /> 1. Gemini Protocol
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-4">Required for Gemini 3 Pro reasoning and Veo video synthesis.</p>
                  <Button 
                    onClick={handleSelectKey} 
                    className={`w-full h-12 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${hasGeminiKey ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white text-slate-950'}`}
                  >
                    {hasGeminiKey ? <><Check className="w-4 h-4 mr-2" /> Key Active</> : "Select Gemini API Key"}
                  </Button>
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="flex items-center gap-1.5 mt-2 text-[9px] text-slate-500 hover:text-blue-400 transition-colors">
                    <Info className="w-3 h-3" /> Note: Must be a paid billing project for Veo.
                  </a>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <h3 className="text-white font-bold text-sm mb-4">2. Supabase Link</h3>
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      value={dbUrl}
                      onChange={(e) => setDbUrl(e.target.value)}
                      className="w-full h-11 bg-slate-800/50 border border-white/5 rounded-xl px-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xs"
                      placeholder="Project URL"
                    />
                    <input 
                      type="password" 
                      value={dbKey}
                      onChange={(e) => setDbKey(e.target.value)}
                      className="w-full h-11 bg-slate-800/50 border border-white/5 rounded-xl px-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xs"
                      placeholder="Anon Key"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500 ml-1 flex items-center gap-2">
                    <Terminal className="w-3 h-3" /> SQL Setup
                  </label>
                  <button onClick={copySql} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-bold uppercase">
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="flex-1 bg-slate-950/80 rounded-2xl border border-white/5 p-4 font-mono text-[10px] text-blue-300 overflow-y-auto max-h-[220px] scrollbar-hide">
                  <pre className="whitespace-pre-wrap">{sqlSetup}</pre>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleStep1} 
              disabled={!hasGeminiKey}
              className="w-full h-14 rounded-2xl bg-white text-slate-950 hover:bg-slate-200 transition-colors font-black uppercase tracking-widest text-xs shadow-xl shadow-white/5 disabled:opacity-30"
            >
              Continue to Ignition <Zap className="w-4 h-4 ml-2 fill-current" />
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-lg bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-12 shadow-2xl relative z-10"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-purple-500/20 rounded-2xl text-purple-400"><Cpu className="w-8 h-8" /></div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Step 2</h2>
                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Logic Calibration</p>
              </div>
            </div>

            <p className="text-slate-300 mb-8 leading-relaxed font-medium">
              Checking agent protocols. Testing Gemini 3 Multimodal reasoning and grounding capabilities.
            </p>

            <div className="bg-slate-950/50 rounded-3xl p-6 border border-white/5 mb-10 min-h-[12rem]">
              {!isTesting && !testError && (
                <div className="h-full flex flex-col items-center justify-center py-8">
                  <ShieldCheck className="w-12 h-12 text-slate-700 mb-4" />
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest text-center">Diagnostics Pipeline Ready</p>
                </div>
              )}

              <div className="space-y-3">
                {diagnosticLogs.map((log, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    key={i} 
                    className="flex items-center justify-between text-[11px] font-mono"
                  >
                    <span className="text-slate-400">{log.msg}</span>
                    {log.success === true && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {log.success === false && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                    {log.success === null && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                  </motion.div>
                ))}
              </div>

              {testError && (
                <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-[10px] font-medium leading-relaxed">
                  {testError}
                  <button onClick={() => setStep(1)} className="block mt-2 underline text-white font-bold">Return to Step 1</button>
                </div>
              )}
            </div>

            <Button 
              onClick={startIgnition} 
              disabled={isTesting}
              className="w-full h-16 rounded-3xl bg-purple-600 text-white hover:bg-purple-500 transition-all font-black uppercase tracking-widest text-sm shadow-xl shadow-purple-500/20"
            >
              {isTesting ? "Executing Sweep..." : "Start System Ignition"}
            </Button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center relative z-10"
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/40"
            >
              <Rocket className="w-16 h-16 text-white" />
            </motion.div>
            <h2 className="text-5xl font-black text-white tracking-tighter mb-4">Launch Ready</h2>
            <p className="text-slate-400 text-lg font-medium mb-12">Lumina Protocol fully calibrated. Strategy agent is online.</p>
            <Button onClick={onComplete} className="h-16 px-12 rounded-3xl bg-white text-slate-950 font-black uppercase tracking-widest text-sm">
              Deploy Protocol
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
