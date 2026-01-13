
import { GoogleGenAI, Type } from "@google/genai";
import { SlideAnalysis } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const isCriticalError = (error: any) => {
  const msg = error.message || '';
  const status = error.status || 0;
  return (
    msg.includes('403') || 
    status === 403 || 
    msg.includes('The caller does not have permission') ||
    msg.includes('Requested entity was not found')
  );
};

/**
 * Resilient Retry Helper for "Durable" API calls
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      if (isCriticalError(e)) throw e;
      const delay = 1000 * Math.pow(2, i);
      console.warn(`API call failed (Attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`, e.message);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

const cleanAndParseJSON = (text: string | undefined | null): any => {
    if (!text) return {};
    let cleaned = text.replace(/```json\s*([\s\S]*?)\s*```/gi, '$1').trim();
    cleaned = cleaned.replace(/^```\s*([\s\S]*?)\s*```$/g, '$1').trim();
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace !== -1) cleaned = cleaned.substring(firstBrace);

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        let fixed = cleaned;
        fixed = fixed.replace(/,\s*([}\]])/g, '$1');
        const openBraces = (fixed.match(/{/g) || []).length;
        const closeBraces = (fixed.match(/}/g) || []).length;
        fixed += '}'.repeat(Math.max(0, openBraces - closeBraces));
        try { return JSON.parse(fixed); } catch { return {}; }
    }
};

export const analyzeSlideContent = async (base64Image: string): Promise<SlideAnalysis> => {
  return withRetry(async () => {
    const ai = getAI();
    const cleanBase64 = base64Image.split(',')[1];
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
          { text: "Act as a McKinsey Consultant. Analyze this slide. Output JSON: { \"actionTitle\", \"subtitle\", \"keyTakeaways\": [], \"script\", \"visualPrompt\", \"assetPrompts\": [], \"consultingLayout\", \"keywords\": [] }" }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsed = cleanAndParseJSON(response.text);
    return { 
        consultingLayout: 'data-evidence', 
        ...parsed,
        keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
        assetPrompts: Array.isArray(parsed.assetPrompts) ? parsed.assetPrompts : [],
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    };
  });
};

export const deepAnalyzeSlide = async (base64Image: string): Promise<SlideAnalysis> => {
  return withRetry(async () => {
    const ai = getAI();
    const cleanBase64 = base64Image.split(',')[1];
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
          { text: "Deep strategic analysis of this slide. Identify subtle nuances. Output JSON structure as before." }
        ]
      }
    });
    const parsed = cleanAndParseJSON(response.text);
    return {
        ...parsed,
        keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
        assetPrompts: Array.isArray(parsed.assetPrompts) ? parsed.assetPrompts : [],
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    };
  });
};

export const generateSlideVisual = async (prompt: string): Promise<string | undefined> => {
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image", 
      contents: { parts: [{ text: prompt + ", strategy consulting masterpiece, corporate 4k detail" }] }
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : undefined;
  }, 2);
};

export const generateSlideVisualPro = async (prompt: string, size: "1K" | "2K" | "4K" = "1K"): Promise<string | undefined> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: { parts: [{ text: prompt + ", strategy consulting masterpiece, photorealistic" }] },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: size } }
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : undefined;
};

export const generateAssetImage = async (prompt: string): Promise<string | undefined> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: { parts: [{ text: prompt + ", isolated on white, professional vector illustration" }] },
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : undefined;
};

export const generateVideoFromImage = async (
  imageBase64: string, 
  prompt: string, 
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<string | undefined> => {
    const ai = getAI();
    const cleanBase64 = imageBase64.split(',')[1];
    
    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            image: { imageBytes: cleanBase64, mimeType: 'image/png' },
            prompt: prompt + ", cinematic motion, high definition corporate aesthetic",
            config: { 
                numberOfVideos: 1, 
                resolution: '720p', 
                aspectRatio 
            }
        });

        console.log("Veo: Operation started. Animating scene...");
        
        while (!operation.done) {
            await new Promise(r => setTimeout(r, 8000)); // Poll every 8s
            operation = await ai.operations.getVideosOperation({ operation });
            console.log("Veo: Processing frames... Creating high-fidelity motion.");
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
          console.error("Veo: No video link in response.");
          return undefined;
        }

        const res = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error("Veo animation failed:", error);
        throw error;
    }
};
