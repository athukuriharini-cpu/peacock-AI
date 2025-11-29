import React from 'react';
import { Loader2, Trash2, Maximize2 } from 'lucide-react';
import { ArtPanelData } from '../types';

interface ArtPanelProps {
  data: ArtPanelData;
  onDelete: (id: string) => void;
  index: number;
}

const ImagePanel: React.FC<ArtPanelProps> = ({ data, onDelete }) => {
  return (
    <div className="group relative bg-studio-800 p-3 shadow-lg transform transition-all hover:scale-[1.01] hover:shadow-2xl rounded-xl border border-studio-700">
      
      <div className="relative aspect-square w-full bg-studio-900 overflow-hidden rounded-lg">
        {data.isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 space-y-2">
            <Loader2 className="animate-spin h-10 w-10 text-studio-accent" />
            <span className="text-sm font-medium">Creating masterpiece...</span>
          </div>
        ) : (
          <img 
            src={data.imageUrl} 
            alt={data.prompt} 
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Overlay controls */}
        {!data.isLoading && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
             <button 
              onClick={() => onDelete(data.id)}
              className="p-3 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-colors backdrop-blur-sm"
              title="Delete Artwork"
            >
              <Trash2 size={20} />
            </button>
            <a 
              href={data.imageUrl} 
              download={`peacock-ai-${data.id}.png`}
              className="p-3 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors backdrop-blur-sm"
              title="Download High Res"
            >
              <Maximize2 size={20} />
            </a>
          </div>
        )}
      </div>

      <div className="mt-3">
        <p className="text-gray-300 text-sm leading-relaxed line-clamp-2">
          {data.prompt}
        </p>
      </div>
    </div>
  );
};

export default ImagePanel;