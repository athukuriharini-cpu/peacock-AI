import React, { useState, useRef, useEffect } from 'react';
import { X, Check, RotateCcw, Sliders } from 'lucide-react';

interface ImageEditorProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newImageUrl: string) => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, isOpen, onClose, onSave }) => {
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState(imageUrl);

  // Reset when opening a new image
  useEffect(() => {
    if (isOpen) {
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setPreviewUrl(imageUrl);
    }
  }, [isOpen, imageUrl]);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (ctx) {
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const newUrl = canvas.toDataURL('image/png');
        onSave(newUrl);
        onClose();
      }
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-studio-800 border border-studio-700 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
        
        {/* Preview Area */}
        <div className="flex-1 bg-studio-900 p-6 flex items-center justify-center relative overflow-hidden">
           <img 
             src={imageUrl} 
             alt="Editing" 
             className="max-w-full max-h-[60vh] object-contain shadow-lg rounded-lg transition-all duration-200"
             style={{ 
               filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)` 
             }}
           />
           {/* Hidden canvas for processing */}
           <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls Sidebar */}
        <div className="w-full md:w-80 bg-studio-800 p-6 border-l border-studio-700 flex flex-col gap-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Sliders size={20} /> Edit Image
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto">
            
            {/* Brightness */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <label className="text-gray-300">Brightness</label>
                <span className="text-studio-accent">{brightness}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="200" 
                value={brightness} 
                onChange={(e) => setBrightness(parseInt(e.target.value))}
                className="w-full accent-studio-accent bg-studio-700 h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Contrast */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <label className="text-gray-300">Contrast</label>
                <span className="text-studio-accent">{contrast}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="200" 
                value={contrast} 
                onChange={(e) => setContrast(parseInt(e.target.value))}
                className="w-full accent-studio-accent bg-studio-700 h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Saturation */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <label className="text-gray-300">Saturation</label>
                <span className="text-studio-accent">{saturation}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="200" 
                value={saturation} 
                onChange={(e) => setSaturation(parseInt(e.target.value))}
                className="w-full accent-studio-accent bg-studio-700 h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <button 
              onClick={() => {
                setBrightness(100);
                setContrast(100);
                setSaturation(100);
              }}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <RotateCcw size={14} /> Reset Adjustments
            </button>
          </div>

          <div className="pt-6 border-t border-studio-700 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-studio-600 text-gray-300 hover:bg-studio-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="flex-1 px-4 py-2 rounded-lg bg-studio-accent text-white hover:bg-violet-600 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Check size={18} /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
