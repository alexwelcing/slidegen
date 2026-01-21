
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, ShieldCheck, Zap, Loader2, CheckCircle2, AlertTriangle, Cpu, Rocket, Copy, Terminal, Check, Key, Info, Activity, Server, Lock } from 'lucide-react';
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
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasGeminiKey(selected);
      } else {
        setHasGeminiKey(true);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [diagnosticLogs]);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasGeminiKey(true);
    }
  };

  const sqlSetup = `-- FIX PERMISSIONS (RUN IN SUPABASE SQL EDITOR)

-- 1. Create Tables
create table if not exists lumina_tasks (
  id text primary key,
  status text,
  last_payload jsonb,
  updated_at timestamp with time zone default now()
);

create table if not exists lumina_decks (
  id text primary key,
  slides jsonb,
  updated_at timestamp with time zone default now()
);

-- 2. ENABLE RLS (Required by Supabase)
alter table lumina_tasks enable row level security;
alter table lumina_decks enable row level security;

-- 3. PERMISSIVE POLICIES (Allows Insert/Update for Demo)
-- Note: 'WITH CHECK (true)' is crucial for UPSERT/INSERT to work
drop policy if exists "Public Access Tasks" on lumina_tasks;
create policy "Public Access Tasks" on lumina_tasks 
for all using (true) with check (true);

drop policy if exists "Public Access Decks" on lumina_decks;
create policy "Public Access Decks" on lumina_decks 
for all using (true) with check (true);

-- 4. STORAGE BUCKET
insert into storage.buckets (id, name, public) 
values ('media', 'media', true)
on conflict (id) do nothing;

-- 5. STORAGE POLICIES
drop policy if exists "Public Images Insert" on storage.objects;
create policy "Public Images Insert" on storage.objects 
for insert with check ( bucket_id = 'media' );

drop policy if exists "Public Images Select" on storage.objects;
create policy "Public Images Select" on storage.objects 
for select using ( bucket_id = 'media' );
`;

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
      setTimeout(() => setStep(3), 800);
    } catch (e: any) {
      let msg = e.message || "Diagnostic test failed.";
      if (msg.includes("entity was not found")) {
        msg = "API Key error. Please re-select your Gemini API Key in Step 1.";
      }
      setTestError(msg);
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -50, filter: 'blur(10px)' }}
            className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 z-10"
          >
            {/* Left Panel: Inputs */}
            <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col justify-between h-[600px]">
              <div>
                <div className="flex items-center gap-3 mb-8">
                   <div className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center font-bold font-mono">1</div>
                   <h2 className="text-2xl font-serif text-white">System Calibration</h2>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2"><Key className="w-3 h-3" /> Gemini Reasoning Engine</label>
                    <Button 
                      onClick={handleSelectKey} 
                      className={`w-full h-12 rounded-lg text-xs font-mono transition-all border ${hasGeminiKey ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/30'}`}
                    >
                      {hasGeminiKey ? "API KEY CONNECTED" : "CONNECT GOOGLE AI STUDIO"}
                    </Button>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2"><Database className="w-3 h-3" /> Supabase Vector Store</label>
                     <input 
                        type="text" value={dbUrl} onChange={(e) => setDbUrl(e.target.value)}
                        className="w-full h-12 bg-black border border-white/10 rounded-lg px-4 text-xs font-mono text-white focus:border-blue-500 outline-none transition-colors placeholder-white/20"
                        placeholder="HTTPS://YOUR-PROJECT.SUPABASE.CO"
                      />
                      <input 
                        type="password" value={dbKey} onChange={(e) => setDbKey(e.target.value)}
                        className="w-full h-12 bg-black border border-white/10 rounded-lg px-4 text-xs font-mono text-white focus:border-blue-500 outline-none transition-colors placeholder-white/20"
                        placeholder="public-anon-key"
                      />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleStep1} 
                disabled={!hasGeminiKey}
                className="w-full h-14 bg-white hover:bg-slate-200 text-black font-bold uppercase tracking-widest text-xs rounded-xl"
              >
                Initialize Subsystems
              </Button>
            </div>

            {/* Right Panel: SQL Instructions */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 flex flex-col h-[600px] relative overflow-hidden group">
               <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
               <div className="flex items-center justify-between mb-6 relative z-10">
                  <h3 className="text-white font-mono text-xs uppercase tracking-widest flex items-center gap-2"><Terminal className="w-4 h-4 text-blue-500" /> Database Schema</h3>
                  <button onClick={copySql} className="text-[10px] font-bold uppercase bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-white transition-colors">
                    {copied ? "Copied" : "Copy SQL"}
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent relative z-10">
                  <pre className="font-mono text-[10px] leading-relaxed text-slate-400 whitespace-pre-wrap selection:bg-blue-500/30">
                    {sqlSetup}
                  </pre>
               </div>
               <div className="mt-6 pt-6 border-t border-white/5 text-[10px] text-slate-600 leading-relaxed relative z-10">
                  <Info className="w-3 h-3 inline mr-1" />
                  Run this SQL in the Supabase SQL Editor. It creates the necessary tables for deck persistence and configures RLS policies to allow this demo to read/write data.
               </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
            className="w-full max-w-2xl"
          >
             <div className="bg-black border border-white/10 rounded-t-2xl p-4 flex items-center justify-between bg-white/5">
                <div className="flex gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-500/50" />
                   <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                   <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest">Lumina Core Diagnostics</div>
             </div>
             
             <div className="bg-black/80 backdrop-blur-xl border-x border-b border-white/10 rounded-b-2xl p-8 h-[400px] relative overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 pointer-events-none bg-[length:100%_2px,3px_100%]" />
                
                <div className="relative z-10 flex-1 flex flex-col">
                    <div ref={logContainerRef} className="flex-1 overflow-y-auto space-y-2 font-mono text-xs">
                       {!isTesting && !testError && (
                          <div className="text-white/30 animate-pulse">Waiting for manual start command...</div>
                       )}
                       {diagnosticLogs.map((log, i) => (
                          <div key={i} className="flex items-center gap-3">
                             <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                             <span className={log.success ? "text-emerald-400" : log.success === false ? "text-rose-400" : "text-blue-400"}>
                                {log.msg}
                             </span>
                             {log.success === null && <span className="w-2 h-4 bg-blue-400 animate-pulse block" />}
                          </div>
                       ))}
                       {testError && (
                          <div className="text-rose-500 mt-4 border-l-2 border-rose-500 pl-4 py-2 bg-rose-500/5">
                             CRITICAL FAILURE: {testError}
                          </div>
                       )}
                    </div>

                    {!isTesting && (
                        <div className="mt-8 border-t border-white/10 pt-6">
                            {testError ? (
                                <Button onClick={() => setStep(1)} className="w-full bg-white/10 hover:bg-white/20 text-white font-mono text-xs h-12 uppercase tracking-widest">
                                   Reconfigure System
                                </Button>
                            ) : (
                                <Button onClick={startIgnition} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs h-12 uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                   > EXECUTE BOOT SEQUENCE
                                </Button>
                            )}
                        </div>
                    )}
                </div>
             </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center z-10"
          >
            <div className="relative mb-8">
               <div className="absolute inset-0 bg-blue-500 blur-[80px] opacity-20 animate-pulse" />
               <div className="w-24 h-24 bg-gradient-to-tr from-white to-slate-400 rounded-full flex items-center justify-center relative z-10 shadow-2xl">
                  <Rocket className="w-10 h-10 text-black" />
               </div>
            </div>
            
            <h1 className="text-6xl font-serif text-white mb-6 tracking-tighter">Lumina Online</h1>
            <p className="text-slate-400 max-w-md text-lg font-light mb-12">
               Neural architecture loaded. Veo video engine standby. <br/>Ready to transform your narrative.
            </p>
            
            <Button onClick={onComplete} className="h-16 px-12 bg-white text-black rounded-full font-bold uppercase tracking-[0.2em] text-xs hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.2)]">
               Deploy Agent
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
