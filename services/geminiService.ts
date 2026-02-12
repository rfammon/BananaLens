
import { GoogleGenAI } from "@google/genai";
import { ModelType, AspectRatio, ImageSize } from "../types";

export const generateBananaImage = async (params: {
  prompt: string;
  model: ModelType;
  aspectRatio: AspectRatio;
  imageSize?: ImageSize;
  baseImage?: string; // Base64 with data prefix
}): Promise<string> => {
  const { prompt, model, aspectRatio, imageSize, baseImage } = params;
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const contents: any[] = [];
  
  if (baseImage) {
    const [header, data] = baseImage.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
    contents.push({
      inlineData: {
        data: data,
        mimeType: mimeType
      }
    });
  }
  
  contents.push({ text: prompt });

  const config: any = {
    imageConfig: {
      aspectRatio,
      ...(model === ModelType.PRO ? { imageSize } : {})
    }
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: contents },
      config
    });

    if (!response.candidates?.[0]?.content?.parts) {
      throw new Error("No image generated in the response.");
    }

    const imagePart = response.candidates[0].content.parts.find(p => p.inlineData);
    
    if (!imagePart || !imagePart.inlineData) {
      const textPart = response.candidates[0].content.parts.find(p => p.text);
      throw new Error(textPart?.text || "Failed to generate image.");
    }

    return `data:image/png;base64,${imagePart.inlineData.data}`;
  } catch (error: any) {
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
};
