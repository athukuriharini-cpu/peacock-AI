import React, { useState, useRef, useEffect } from 'react';
import { Plus, Layout, Settings, Image as ImageIcon, Sparkles, MessageSquare, Layers } from 'lucide-react';
import ImagePanel from './components/ComicPanel';
import LiveAssistant from './components/LiveAssistant';
import ImageEditor from './components/ImageEditor';
import { generateArtPanelImage, upscaleImage } from './services/geminiService';
import { ArtPanelData, GenerationSettings, AspectRatio } from './types';

const App: React.FC = () => {
  const [panels, setPanels] = useState<ArtPanelData[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  
  // Editing State
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  
  // Settings
  const [settings, setSettings] = useState<GenerationSettings>({
    // Use gemini-2.5-flash-image to avoid API Key Billing Prompt requirements
    model: 'gemini-2.5-flash-image', 
    aspectRatio: '1:1',
    batchCount: 1
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of panels when new one is added
  const panelsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (panels.length > 0) {
        panelsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [panels.length]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const count = settings.batchCount || 1;
    const newPanels: ArtPanelData[] = [];
    
    // Create placeholders for the batch
    for (let i = 0; i < count; i++) {
        newPanels.push({
            id: `${Date.now()}-${i}`,
            prompt: prompt,
            imageUrl: '',
            isLoading: true
        });
    }

    setPanels(current => [...current, ...newPanels]);
    setPrompt(''); // Clear input immediately
    setIsGenerating(true);

    try {
      // Execute generations in parallel
      const promises = newPanels.map(async (panel) => {
         try {
             const imageUrl = await generateArtPanelImage(panel.prompt, settings);
             setPanels(current => 
                current.map(p => 
                  p.id === panel.id 
                    ? { ...p, imageUrl, isLoading: false } 
                    : p
                )
             );
         } catch (error) {
             console.error(`Failed to generate panel ${panel.id}:`, error);
             // Remove failed panel from UI to keep it clean
             setPanels(current => current.filter(p => p.id !== panel.id));
         }
      });
      
      await Promise.all(promises);
      
    } finally {
      setIsGenerating(false);
      textareaRef.current?.focus();
    }
  };

  const handleDeletePanel = (id: string) => {
    setPanels(panels.filter(p => p.id !== id));
  };

  const handleEditPanel = (id: string) => {
    setEditingPanelId(id);
  };

  const handleSaveEdit = (newImageUrl: string) => {
    if (editingPanelId) {
      setPanels(current => 
        current.map(p => 
          p.id === editingPanelId 
            ? { ...p, imageUrl: newImageUrl } 
            : p
        )
      );
    }
  };

  const handleUpscalePanel = async (id: string) => {
    const panel = panels.find(p => p.id === id);
    if (!panel) return;

    // Create a new panel for the upscale result
    const newId = `${Date.now()}-upscale`;
    const newPanel: ArtPanelData = {
      id: newId,
      prompt: `${panel.prompt} (Upscaled)`,
      imageUrl: '',
      isLoading: true
    };

    setPanels(current => [...current, newPanel]);

    try {
      const upscaledUrl = await upscaleImage(panel.imageUrl, panel.prompt);
      setPanels(current => 
        current.map(p => 
          p.id === newId 
            ? { ...p, imageUrl: upscaledUrl, isLoading: false } 
            : p
        )
      );
    } catch (error) {
      console.error("Upscale failed:", error);
      setPanels(current => current.filter(p => p.id !== newId));
      alert("Failed to upscale image. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const activeEditingPanel = panels.find(p => p.id === editingPanelId);

  return (
    <div className="min-h-screen bg-studio-900 text-white font-sans flex flex-col md:flex-row">
      
      <ImageEditor 
        isOpen={!!editingPanelId}
        imageUrl={activeEditingPanel?.imageUrl || ''}
        onClose={() => setEditingPanelId(null)}
        onSave={handleSaveEdit}
      />

      {/* Sidebar / Settings */}
      <aside className="w-full md:w-80 bg-studio-800 border-r border-studio-700 p-6 flex flex-col gap-8 flex-shrink-0 z-20 shadow-2xl">
        <div className="flex items-center gap-3 text-studio-accent">
          <Layout size={32} />
          <h1 className="text-2xl font-bold tracking-tight">Peacock AI</h1>
        </div>

        <div className="space-y-6">
          
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <Settings size={14} /> Studio Settings
            </h2>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Aspect Ratio</label>
              <select
                value={settings.aspectRatio}
                onChange={(e) => setSettings({ ...settings, aspectRatio: e.target.value as AspectRatio })}
                className="w-full bg-studio-700 border-none rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-studio-accent outline-none"
              >
                <option value="1:1">Square (1:1)</option>
                <option value="16:9">Cinematic (16:9)</option>
                <option value="9:16">Portrait (9:16)</option>
                <option value="4:3">Standard (4:3)</option>
                <option value="3:4">Tall (3:4)</option>
              </select>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-sm font-medium text-gray-300 flex justify-between">
                <span>Image Count</span>
                <span className="text-studio-accent">{settings.batchCount}</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="4" 
                value={settings.batchCount} 
                onChange={(e) => setSettings({ ...settings, batchCount: parseInt(e.target.value) })}
                className="w-full accent-studio-accent bg-studio-700 h-2 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-500">Generate multiple variations at once</p>
            </div>
          </div>

          <div className="pt-6 border-t border-studio-700">
             <button
              onClick={() => setShowVoiceAssistant(!showVoiceAssistant)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg hover:from-violet-500 hover:to-fuchsia-500 transition-all font-semibold shadow-lg text-white"
             >
               <MessageSquare size={18} />
               {showVoiceAssistant ? "Hide Assistant" : "Creative Partner"}
             </button>
          </div>
        </div>

        <div className="mt-auto">
            <div className="p-4 bg-studio-700/30 rounded-lg border border-studio-700/50">
                <h3 className="font-bold text-gray-200 mb-1 flex items-center gap-2">
                    <Sparkles size={16} className="text-yellow-400"/>
                    Artistic Tip
                </h3>
                <p className="text-xs text-gray-400">
                    Try describing art styles like "Oil painting", "Digital Art", "Watercolor", or "Surrealism" to get different aesthetics.
                </p>
            </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-[calc(100vh-80px)] md:h-screen overflow-hidden relative">
        
        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-studio-900">
          {panels.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
              <div className="w-24 h-24 rounded-full bg-studio-800 flex items-center justify-center">
                <ImageIcon size={48} className="opacity-50" />
              </div>
              <div className="text-center max-w-md">
                <h3 className="text-xl font-bold text-white mb-2">Create something beautiful</h3>
                <p>Enter a description below to generate your first artwork. Experiment with different aspect ratios.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start pb-32">
              {panels.map((panel, index) => (
                <ImagePanel 
                  key={panel.id} 
                  data={panel} 
                  index={index}
                  onDelete={handleDeletePanel}
                  onEdit={handleEditPanel}
                  onUpscale={handleUpscalePanel}
                />
              ))}
              <div ref={panelsEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-studio-800 border-t border-studio-700 z-10 sticky bottom-0">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
             <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your vision... (e.g., 'A futuristic city with floating gardens, golden hour light, highly detailed')"
                  className="w-full bg-studio-900 border border-studio-600 rounded-xl pl-4 pr-14 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-studio-accent resize-none h-24 shadow-inner"
                  disabled={isGenerating}
                />
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className={`absolute right-3 bottom-3 p-3 rounded-lg transition-all ${
                    isGenerating || !prompt.trim()
                      ? 'bg-studio-700 text-gray-500 cursor-not-allowed'
                      : 'bg-studio-accent text-white hover:bg-violet-600 shadow-lg'
                  }`}
                >
                  {isGenerating ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : 
                   settings.batchCount > 1 ? <Layers size={24} /> : <Plus size={24} />}
                </button>
             </div>
             {settings.batchCount > 1 && (
               <div className="text-xs text-gray-500 text-right pr-2">
                 Generating {settings.batchCount} images per prompt
               </div>
             )}
          </div>
        </div>

        {/* Floating Voice Assistant */}
        <LiveAssistant 
            isOpen={showVoiceAssistant} 
            onClose={() => setShowVoiceAssistant(false)} 
        />
        
      </main>
    </div>
  );
};

export default App;