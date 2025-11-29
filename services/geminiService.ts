import { GoogleGenAI } from "@google/genai";
import { GenerationSettings, AspectRatio } from "../types";

// Helper to ensure API Key is present
const getApiKey = () => {
  const key = process.env.API_KEY;
  if (!key) {
    throw new Error("API Key not found in environment variables");
  }
  return key;
};

export const generateArtPanelImage = async (
  prompt: string,
  settings: GenerationSettings
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  // Use the model provided in settings, defaulting to gemini-2.5-flash-image if not specified
  const modelName = settings.model || 'gemini-2.5-flash-image';

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: settings.aspectRatio,
        }
      }
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};