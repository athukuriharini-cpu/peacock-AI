import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Activity, X } from 'lucide-react';
import { createPcmBlob, base64ToUint8Array, decodeAudioData } from '../utils/audio';

interface LiveAssistantProps {
  onClose?: () => void;
  isOpen: boolean;
}

const LiveAssistant: React.FC<LiveAssistantProps> = ({ onClose, isOpen }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for audio handling to avoid re-renders
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputNodeRef = useRef<GainNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const cleanup = useCallback(() => {
    if (sourcesRef.current) {
      sourcesRef.current.forEach(source => source.stop());
      sourcesRef.current.clear();
    }
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }

    if (outputContextRef.current) {
      outputContextRef.current.close();
      outputContextRef.current = null;
    }
    
    // We can't strictly "close" the session promise, but we can stop sending data
    sessionPromiseRef.current = null;
    setIsConnected(false);
    setVolume(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const connect = async () => {
    try {
      setError(null);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Setup Audio Contexts
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputNodeRef.current = inputContextRef.current.createGain();
      outputNodeRef.current = outputContextRef.current.createGain();
      outputNodeRef.current.connect(outputContextRef.current.destination);

      // Get Mic Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: 'You are Peacock AI, a creative art director and brainstorming partner. Help the user come up with artistic concepts, visual styles, and composition ideas for their artwork. Keep responses concise and energetic.',
        },
        callbacks: {
          onopen: () => {
            console.log("Live API Connected");
            setIsConnected(true);
            
            // Start processing audio input
            if (!inputContextRef.current || !streamRef.current) return;
            
            const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
            sourceNodeRef.current = source;
            
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate volume for visualization
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length));

              const pcmBlob = createPcmBlob(inputData);
              sessionPromiseRef.current?.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputContextRef.current && outputNodeRef.current) {
              const ctx = outputContextRef.current;
              
              // Ensure we don't schedule in the past
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                base64ToUint8Array(base64Audio),
                ctx,
                24000,
                1
              );
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNodeRef.current);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              
              source.start(nextStartTimeRef.current);
              sourcesRef.current.add(source);
              nextStartTimeRef.current += audioBuffer.duration;
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            console.log("Live API Closed");
            setIsConnected(false);
          },
          onerror: (e) => {
            console.error("Live API Error", e);
            setError("Connection error occurred.");
            setIsConnected(false);
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to microphone or API.");
      setIsConnected(false);
    }
  };

  const toggleConnection = () => {
    if (isConnected) {
      cleanup();
    } else {
      connect();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {error && (
        <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg mb-2 text-sm max-w-xs">
          {error}
        </div>
      )}
      
      <div className="bg-studio-800 border border-studio-700 p-4 rounded-xl shadow-2xl w-80">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Activity className={isConnected ? "text-green-400 animate-pulse" : "text-gray-500"} size={20} />
            <h3 className="font-bold text-white">Creative Partner</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-full bg-studio-900 rounded-lg flex items-center justify-center overflow-hidden relative">
            {isConnected ? (
               <div className="flex gap-1 items-end h-full py-2">
                 {[...Array(8)].map((_, i) => (
                   <div 
                     key={i} 
                     className="w-2 bg-studio-accent rounded-full transition-all duration-75"
                     style={{ 
                       height: `${Math.max(10, Math.min(100, volume * 500 * (Math.random() + 0.5)))}%`,
                       opacity: 0.8 
                     }}
                   />
                 ))}
               </div>
            ) : (
              <span className="text-gray-500 text-sm">Ready to connect</span>
            )}
          </div>
          
          <button
            onClick={toggleConnection}
            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${
              isConnected 
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50' 
                : 'bg-studio-accent text-white hover:bg-violet-600'
            }`}
          >
            {isConnected ? (
              <>
                <MicOff size={18} /> Disconnect
              </>
            ) : (
              <>
                <Mic size={18} /> Start Brainstorming
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">
           Powered by Gemini Live API
        </p>
      </div>
    </div>
  );
};

export default LiveAssistant;