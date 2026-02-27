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

export const upscaleImage = async (
  originalImageUrl: string,
  prompt: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  // For upscaling/refining, we use the same model but with image input
  // We'll ask it to increase detail.
  const modelName = 'gemini-2.5-flash-image';

  try {
    // Fetch the image data to pass to the model
    const imageResponse = await fetch(originalImageUrl);
    const blob = await imageResponse.blob();
    const base64Data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    
    // Remove data:image/png;base64, prefix
    const base64String = base64Data.split(',')[1];
    const mimeType = base64Data.split(';')[0].split(':')[1];

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { 
            inlineData: {
              mimeType: mimeType,
              data: base64String
            }
          },
          { text: `High resolution, highly detailed, 4k version of this image. ${prompt}` }
        ]
      }
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No upscaled image data found in response");
  } catch (error) {
    console.error("Error upscaling image:", error);
    throw error;
  }
};