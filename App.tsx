
import React, { useState, useEffect, useRef } from 'react';
import { ModelType, AspectRatio, ImageSize, GeneratedImage, AppState } from './types';
import { generateBananaImage } from './services/geminiService';

const LOADING_MESSAGES = [
  "Defining contours...",
  "Sampling textures...",
  "Distilling aesthetic...",
  "Synthesizing light...",
  "Finalizing render..."
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    prompt: '',
    model: ModelType.FLASH,
    aspectRatio: '1:1',
    imageSize: '1K',
    batchSize: 1,
    isGenerating: false,
    history: [],
    error: null,
    loadingMessage: LOADING_MESSAGES[0]
  });

  const [showSettings, setShowSettings] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('banana_lens_v2');
    if (saved) {
      try {
        setState(prev => ({ ...prev, history: JSON.parse(saved) }));
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('banana_lens_v2', JSON.stringify(state.history));
  }, [state.history]);

  useEffect(() => {
    let interval: any;
    if (state.isGenerating) {
      let idx = 0;
      interval = setInterval(() => {
        idx = (idx + 1) % LOADING_MESSAGES.length;
        setState(prev => ({ ...prev, loadingMessage: LOADING_MESSAGES[idx] }));
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [state.isGenerating]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!state.prompt.trim()) return;

    if (state.model === ModelType.PRO) {
      // @ts-ignore
      if (typeof window.aistudio !== 'undefined' && !(await window.aistudio.hasSelectedApiKey())) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }
    }

    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    
    try {
      const generationPromises = Array.from({ length: state.batchSize }).map(() => 
        generateBananaImage({
          prompt: state.prompt,
          model: state.model,
          aspectRatio: state.aspectRatio,
          imageSize: state.imageSize,
          baseImage: attachedImage || undefined
        })
      );

      const imageUrls = await Promise.all(generationPromises);

      const newImages: GeneratedImage[] = imageUrls.map((url, i) => ({
        id: (Date.now() + i).toString(),
        url,
        prompt: state.prompt,
        timestamp: Date.now(),
        model: state.model,
        aspectRatio: state.aspectRatio,
        size: state.model === ModelType.PRO ? state.imageSize : undefined
      }));

      setState(prev => ({
        ...prev,
        isGenerating: false,
        history: [...newImages, ...prev.history].slice(0, 80)
      }));
      
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    } catch (err: any) {
      let errorMessage = err.message || "Request failed. Check your connection or API key.";
      if (errorMessage.includes("Requested entity was not found.")) {
         errorMessage = "API Key Error. Please re-select a valid key.";
         // @ts-ignore
         if (typeof window.aistudio !== 'undefined') window.aistudio.openSelectKey();
      }
      setState(prev => ({ ...prev, isGenerating: false, error: errorMessage }));
    }
  };

  const handleDownload = (url: string, id: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `banana-lens-${id}.png`;
    a.click();
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-[#050505] text-[#efeff1] overflow-hidden select-none">
      
      <aside className="hidden md:flex w-72 flex-col p-6 bg-[#08080a] border-r border-[#1a1a1e]">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-black">
            <i className="fa-solid fa-camera-retro"></i>
          </div>
          <h1 className="text-xl font-bold tracking-tight">BananaLens<span className="text-yellow-400">.</span></h1>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
          <div className="px-2 text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-4">Workspace</div>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#141418] text-yellow-400 font-semibold text-sm border border-yellow-400/20">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            Image Generator
          </button>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:text-white hover:bg-[#141418] text-sm cursor-pointer transition-all">
            <i className="fa-solid fa-clock-rotate-left"></i>
            Recent Generations
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:text-white hover:bg-[#141418] text-sm cursor-pointer transition-all">
            <i className="fa-solid fa-bookmark"></i>
            Saved Collections
          </div>
        </nav>

        <div className="mt-auto pt-6 border-t border-[#1a1a1e]">
          <div className="bg-[#141418] rounded-2xl p-4 border border-[#1a1a1e]">
            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">System Status</p>
            <div className="flex items-center gap-2 text-xs text-green-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              All Engines Online
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        <header className="px-6 pt-6 pb-2 flex items-center justify-between">
           <div className="flex gap-4 overflow-x-auto no-scrollbar">
              {["All Art", "Photorealistic", "Digital Painting", "Cinematic", "Anime"].map(filter => (
                <button key={filter} className="whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium text-zinc-400 hover:text-white hover:bg-[#141418] transition-all">
                  {filter}
                </button>
              ))}
           </div>
           <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500"></div>
           </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pb-40 pt-4">
          {state.history.length === 0 && !state.isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-yellow-400/10 blur-[100px] rounded-full"></div>
                <div className="w-24 h-24 rounded-3xl bg-[#141418] border border-[#1a1a1e] flex items-center justify-center relative">
                   <i className="fa-solid fa-palette text-4xl text-yellow-400/50"></i>
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Create or Edit</h2>
              <p className="text-zinc-500 max-w-sm text-center text-sm leading-relaxed px-4">
                Attach an image and provide instructions to modify it, or type a prompt to generate from scratch.
              </p>
            </div>
          ) : (
            <div className="masonry">
              {state.isGenerating && Array.from({ length: state.batchSize }).map((_, i) => (
                <div key={`load-${i}`} className="masonry-item rounded-2xl overflow-hidden border border-[#1a1a1e] bg-[#0c0c0e]">
                   <div className={`w-full shimmer flex flex-col items-center justify-center p-12 aspect-square`}>
                     <div className="w-10 h-10 rounded-full border-2 border-zinc-800 border-t-yellow-400 animate-spin"></div>
                     <p className="mt-4 text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center">{state.loadingMessage}</p>
                   </div>
                </div>
              ))}

              {state.history.map(img => (
                <div key={img.id} className="masonry-item group relative rounded-2xl overflow-hidden border border-[#1a1a1e] bg-[#0c0c0e] hover:border-zinc-700 transition-all">
                  <img src={img.url} alt={img.prompt} className="w-full h-auto block group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-5">
                    <div className="flex justify-between items-center mb-3">
                       <span className="text-[10px] bg-white/10 backdrop-blur px-2 py-1 rounded-md text-white font-bold tracking-wider">
                         {img.aspectRatio} | {img.model === ModelType.FLASH ? 'FLASH' : 'PRO'}
                       </span>
                       <button onClick={() => handleDownload(img.url, img.id)} className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center hover:bg-yellow-400 transition-colors">
                         <i className="fa-solid fa-download text-xs"></i>
                       </button>
                    </div>
                    <p className="text-xs text-zinc-300 line-clamp-2 italic leading-snug">"{img.prompt}"</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6 z-50">
          <div className="relative">
            
            {showSettings && (
              <div className="absolute bottom-full left-0 right-0 mb-4 p-8 glass-dark rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-300 shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[11px] uppercase font-bold text-zinc-500 tracking-widest mb-4">Model Engine</label>
                      <div className="flex gap-2">
                        <button onClick={() => setState(prev => ({ ...prev, model: ModelType.FLASH }))} className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border transition-all ${state.model === ModelType.FLASH ? 'bg-yellow-400 border-yellow-400 text-black' : 'border-[#1a1a1e] text-zinc-500 hover:text-white'}`}>Flash 2.5</button>
                        <button onClick={() => setState(prev => ({ ...prev, model: ModelType.PRO }))} className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border transition-all ${state.model === ModelType.PRO ? 'bg-orange-500 border-orange-500 text-white' : 'border-[#1a1a1e] text-zinc-500 hover:text-white'}`}>Pro 3.0</button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[11px] uppercase font-bold text-zinc-500 tracking-widest mb-4">Aspect Ratio</label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {['1:1', '3:4', '4:3', '9:16', '16:9'].map((ratio: any) => (
                          <button key={ratio} onClick={() => setState(prev => ({ ...prev, aspectRatio: ratio }))} className={`py-2 text-[10px] font-bold rounded-lg border flex flex-col items-center transition-all ${state.aspectRatio === ratio ? 'border-yellow-400 text-yellow-400 bg-yellow-400/10' : 'border-[#1a1a1e] text-zinc-600 hover:text-zinc-400'}`}>
                            <span className={`block w-3 border mb-1.5 rounded-sm ${state.aspectRatio === ratio ? 'border-yellow-400' : 'border-zinc-700'}`} style={{ aspectRatio: ratio.replace(':', '/') }}></span>
                            {ratio}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="text-[11px] uppercase font-bold text-zinc-500 tracking-widest">Batch Size</label>
                        <span className="text-xs font-bold text-yellow-400">{state.batchSize}</span>
                      </div>
                      <input type="range" min="1" max="4" step="1" value={state.batchSize} onChange={(e) => setState(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))} className="w-full h-1 cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {attachedImage && (
              <div className="absolute bottom-full left-0 mb-4 p-2 glass-dark rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 border-yellow-400/30">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#1a1a1e]">
                  <img src={attachedImage} className="w-full h-full object-cover" alt="Attached" />
                  <button onClick={() => setAttachedImage(null)} className="absolute top-0 right-0 bg-black/60 text-white p-1 hover:bg-red-500 transition-colors">
                    <i className="fa-solid fa-xmark text-[10px]"></i>
                  </button>
                </div>
                <div>
                   <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Base Image Attached</p>
                   <p className="text-[10px] text-yellow-400 italic">Provide instructions to modify</p>
                </div>
              </div>
            )}

            <div className="prompt-container rounded-3xl p-3 flex items-center gap-3">
              <button onClick={() => setShowSettings(!showSettings)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${showSettings ? 'bg-yellow-400 text-black' : 'bg-[#22222a] text-zinc-500 hover:text-white'}`}>
                <i className={`fa-solid ${showSettings ? 'fa-xmark' : 'fa-sliders'}`}></i>
              </button>

              <button onClick={() => fileInputRef.current?.click()} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${attachedImage ? 'bg-yellow-400/10 text-yellow-400' : 'bg-[#22222a] text-zinc-500 hover:text-white'}`}>
                <i className="fa-solid fa-paperclip"></i>
              </button>
              <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileUpload} />
              
              <div className="flex-1 px-2">
                <textarea rows={1} placeholder={attachedImage ? "How should I modify this image?" : "Describe your vision..."} className="w-full bg-transparent border-none outline-none text-sm placeholder-zinc-500 text-white resize-none py-1 block no-scrollbar" value={state.prompt} onChange={(e) => setState(prev => ({ ...prev, prompt: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }} disabled={state.isGenerating} />
              </div>

              <button onClick={handleGenerate} disabled={state.isGenerating || !state.prompt.trim()} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${state.isGenerating || !state.prompt.trim() ? 'bg-zinc-800 text-zinc-600' : 'bg-white text-black hover:bg-yellow-400 active:scale-95'}`}>
                {state.isGenerating ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-arrow-up"></i>}
              </button>
            </div>

            {state.error && (
              <div className="mt-4 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold rounded-xl flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation"></i> {state.error}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
