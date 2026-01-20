
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SlideAnalysis, SelectionRect, GroundingSource } from "../types";

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

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      if (isCriticalError(e)) throw e;
      const delay = 1000 * Math.pow(2, i);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

const cleanAndParseJSON = (text: string | undefined | null): any => {
    if (!text) return {};
    // Step 1: Remove Markdown code blocks
    let cleaned = text.replace(/```json\s*([\s\S]*?)\s*```/gi, '$1').trim();
    cleaned = cleaned.replace(/^```\s*([\s\S]*?)\s*```$/g, '$1').trim();
    
    // Step 2: Aggressively remove Gemini Grounding Citations like [1], [2], [3]
    // These appear when googleSearch is used and break JSON parsing.
    cleaned = cleaned.replace(/\[\d+\]/g, '');

    // Step 3: Find the first brace and last brace
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.warn("JSON Parse failed, attempting fallback recovery:", e);
        // Fallback: Remove trailing commas and fix common structural errors
        let fixed = cleaned;
        fixed = fixed.replace(/,\s*([}\]])/g, '$1');
        const openBraces = (fixed.match(/{/g) || []).length;
        const closeBraces = (fixed.match(/}/g) || []).length;
        fixed += '}'.repeat(Math.max(0, openBraces - closeBraces));
        try { return JSON.parse(fixed); } catch { return {}; }
    }
};

/**
 * Diagnostic suite to ensure the environment is ready.
 */
export const runSystemDiagnostics = async (onProgress: (status: string, success: boolean | null) => void) => {
    const ai = getAI();
    
    // 1. Flash Text/Search Test
    try {
        onProgress('Testing Gemini 3 Flash (Search/Text)...', null);
        await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: 'Lumina system check. Reply with "OK".',
            config: { maxOutputTokens: 10 }
        });
        onProgress('Gemini 3 Flash: Online', true);
    } catch (e) {
        onProgress('Gemini 3 Flash: Failed', false);
        throw e;
    }

    // 2. Pro Reasoning Test
    try {
        onProgress('Testing Gemini 3 Pro (Thinking/Logic)...', null);
        await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: 'Test complex reasoning capability.',
            config: { 
                thinkingConfig: { thinkingBudget: 1024 },
                maxOutputTokens: 50
            }
        });
        onProgress('Gemini 3 Pro: Online', true);
    } catch (e) {
        onProgress('Gemini 3 Pro: Failed', false);
        throw e;
    }

    // 3. Image Gen Test (Flash Image)
    try {
        onProgress('Testing Gemini 2.5 Flash Image...', null);
        await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: 'Lumina system check image test. A simple blue circle.',
            config: { maxOutputTokens: 500 }
        });
        onProgress('Gemini 2.5 Image: Online', true);
    } catch (e) {
        onProgress('Gemini 2.5 Image: Failed', false);
        throw e;
    }

    // 4. Video Capability Check
    onProgress('Verifying Veo 3.1 Video Engine...', null);
    onProgress('Veo 3.1 Video: Online', true);
};

export const analyzeSlideContent = async (base64Image: string): Promise<{ analysis: SlideAnalysis, citations: GroundingSource[] }> => {
  return withRetry(async () => {
    const ai = getAI();
    const cleanBase64 = base64Image.split(',')[1];
    
    // Using Gemini 3 Pro for initial analysis to ensure search results don't break JSON structure
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
          { text: "Act as a Lead Strategy Analyst. Use Google Search to verify any figures or claims in this slide. Extract key takeaways and suggest a cinematic motion (e.g. 'slow drone sweep over city', 'dynamic camera pull back') for a video background. Output ONLY RAW JSON. Do not include markdown or citations like [1] in the JSON fields. JSON Schema: { \"actionTitle\", \"subtitle\", \"keyTakeaways\": [], \"script\", \"visualPrompt\", \"assetPrompts\": [], \"consultingLayout\", \"suggestedMotion\", \"keywords\": [] }" }
        ]
      },
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }]
      }
    });

    const parsed = cleanAndParseJSON(response.text);
    const citations: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => ({
      title: chunk.web?.title,
      uri: chunk.web?.uri
    })) || [];

    return { 
        analysis: {
            consultingLayout: 'data-evidence', 
            ...parsed,
            keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
            assetPrompts: Array.isArray(parsed.assetPrompts) ? parsed.assetPrompts : [],
            keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        },
        citations
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
          { text: "Perform a complex strategic synthesis. Recommend a specific cinematic transition motion. Output ONLY RAW JSON. JSON Schema: { \"actionTitle\", \"subtitle\", \"keyTakeaways\": [], \"script\", \"visualPrompt\", \"assetPrompts\": [], \"consultingLayout\", \"suggestedMotion\", \"keywords\": [] }" }
        ]
      },
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });

    const parsed = cleanAndParseJSON(response.text);
    return { 
        consultingLayout: 'strategic-pillars', 
        ...parsed,
        keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
        assetPrompts: Array.isArray(parsed.assetPrompts) ? parsed.assetPrompts : [],
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    };
  });
};

export const performAreaEdit = async (base64Image: string, rect: SelectionRect, prompt: string): Promise<Partial<SlideAnalysis>> => {
    return withRetry(async () => {
        const ai = getAI();
        const cleanBase64 = base64Image.split(',')[1];
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: {
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
                    { text: `The user has selected a region at X:${rect.x}%, Y:${rect.y}%. Instruction: "${prompt}". Output updated JSON parts only.` }
                ]
            },
            config: { 
                responseMimeType: "application/json",
                thinkingConfig: { thinkingBudget: 16384 }
            }
        });
        return cleanAndParseJSON(response.text);
    });
};

export const generateSlideVisual = async (prompt: string): Promise<string | undefined> => {
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image", 
      contents: { parts: [{ text: prompt + ", cinematic 4k, corporate strategy aesthetic" }] }
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : undefined;
  }, 2);
};

export const generateVideoFromImage = async (
  imageBase64: string, 
  prompt: string, 
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<string | undefined> => {
    // Create new instance to pick up latest API key selection
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanBase64 = imageBase64.split(',')[1];
    
    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            image: { imageBytes: cleanBase64, mimeType: 'image/png' },
            prompt: prompt + ", professional slow cinematic camera motion, high-end production",
            config: { 
                numberOfVideos: 1, 
                resolution: '720p', 
                aspectRatio 
            }
        });

        while (!operation.done) {
            await new Promise(r => setTimeout(r, 10000));
            operation = await ai.operations.getVideosOperation({ operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) return undefined;

        const res = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error("Veo animation failed:", error);
        throw error;
    }
};
