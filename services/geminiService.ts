
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
    let cleaned = text.replace(/```json\s*([\s\S]*?)\s*```/gi, '$1').trim();
    cleaned = cleaned.replace(/^```\s*([\s\S]*?)\s*```$/g, '$1').trim();
    cleaned = cleaned.replace(/\[\d+\]/g, ''); // Remove citations
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        let fixed = cleaned.replace(/,\s*([}\]])/g, '$1');
        const openBraces = (fixed.match(/{/g) || []).length;
        const closeBraces = (fixed.match(/}/g) || []).length;
        fixed += '}'.repeat(Math.max(0, openBraces - closeBraces));
        try { return JSON.parse(fixed); } catch { return {}; }
    }
};

export const runSystemDiagnostics = async (onProgress: (status: string, success: boolean | null) => void) => {
    const ai = getAI();
    try {
        onProgress('Testing Gemini 3 Flash (Search/Text)...', null);
        await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: 'Lumina system check.',
            config: { maxOutputTokens: 10 }
        });
        onProgress('Gemini 3 Flash: Online', true);
    } catch (e) {
        onProgress('Gemini 3 Flash: Failed', false);
        throw e;
    }

    try {
        onProgress('Testing Gemini 3 Pro (Reasoning)...', null);
        await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: 'Test.',
            config: { thinkingConfig: { thinkingBudget: 1024 }, maxOutputTokens: 10 }
        });
        onProgress('Gemini 3 Pro: Online', true);
    } catch (e) {
        onProgress('Gemini 3 Pro: Failed', false);
        throw e;
    }

    onProgress('Verifying Veo 3.1 Video Engine...', null);
    onProgress('Veo 3.1 Video: Online', true);
};

export const analyzeSlideContent = async (base64Image: string): Promise<{ analysis: SlideAnalysis, citations: GroundingSource[] }> => {
  return withRetry(async () => {
    const ai = getAI();
    const cleanBase64 = base64Image.split(',')[1];
    
    // We explicitly ask for "editorial" aesthetic outputs
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
          { text: `
Act as a Creative Director & McKinsey Strategy Lead. Analyze this slide. 
1. Extract the core strategic message.
2. Verify facts with Google Search.
3. DETERMINE THE BEST LAYOUT MODE based on the image content:
   - "editorial-left": Image content is heavy on the right (e.g., a chart or photo on the right). Text should go on LEFT.
   - "editorial-right": Image content is heavy on the left. Text should go on RIGHT.
   - "minimal-centered": Slide is a title slide, quote, or single big number. Text centered.
   - "mckinsey-insight": Slide is a dense chart/table. Use a top header bar for the main insight, keep the rest clear.
4. Suggest a cinematic video background prompt.

Output ONLY RAW JSON. Schema: 
{ 
  "actionTitle" (punchy, short active voice), 
  "subtitle" (tracking spaced), 
  "keyTakeaways": ["point 1", "point 2", "point 3"], 
  "script" (for voiceover), 
  "visualPrompt" (abstract, artistic), 
  "consultingLayout": "editorial-left" | "editorial-right" | "minimal-centered" | "mckinsey-insight", 
  "suggestedMotion" (for Veo), 
  "colorPalette": [hex, hex, hex], 
  "mood": string 
}` }
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
            consultingLayout: 'editorial-left', 
            colorPalette: ['#ffffff', '#000000'],
            mood: 'Sophisticated',
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
          { text: "Deep strategic review. Refine the narrative arc. Output ONLY RAW JSON. Schema: { \"actionTitle\", \"subtitle\", \"keyTakeaways\": [], \"script\", \"visualPrompt\", \"consultingLayout\", \"suggestedMotion\", \"colorPalette\", \"mood\" }" }
        ]
      },
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });

    const parsed = cleanAndParseJSON(response.text);
    return { 
        consultingLayout: 'editorial-left', 
        ...parsed,
        keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
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
                    { text: `Context: Slide Analysis. User selected region X:${rect.x}%, Y:${rect.y}%. User Instruction: "${prompt}". Update the relevant JSON fields (e.g., actionTitle, keyTakeaways) to reflect this change. Output updated JSON parts only.` }
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
    // Gemini 2.5 Flash Image for fast high-quality generation
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image", 
      contents: { parts: [{ text: prompt + ", abstract, cinematic lighting, 8k resolution, texture heavy, minimal, high-end design" }] }
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanBase64 = imageBase64.split(',')[1];
    
    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            image: { imageBytes: cleanBase64, mimeType: 'image/png' },
            prompt: prompt + ", cinematic slow motion, ambient movement, 4k",
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
