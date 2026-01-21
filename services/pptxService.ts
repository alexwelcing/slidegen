
import { SlideData } from '../types';

// Helper to convert remote URL to base64 if needed, or pass through valid base64
const resolveImage = async (imgStr: string | undefined): Promise<string | null> => {
    if (!imgStr) return null;
    
    // If it's already a data URL, validate and return it
    if (imgStr.startsWith('data:')) {
        // Simple check to ensure it's not a truncated or malformed string
        if (imgStr.length < 50 || !imgStr.includes('base64,')) {
             console.warn("Malformed base64 string detected, skipping.");
             return null;
        }
        return imgStr;
    }

    // If it's a remote URL (Supabase), fetch it
    if (imgStr.startsWith('http')) {
        try {
            const response = await fetch(imgStr);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const res = reader.result as string;
                    if (res && res.startsWith('data:')) resolve(res);
                    else resolve(null);
                };
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("Failed to fetch image for PPTX:", imgStr, e);
            return null;
        }
    }
    
    return null;
};

export const exportToPptx = async (slides: SlideData[], indices?: number[]) => {
  try {
    if (!window.PptxGenJS) {
      console.error("PptxGenJS not loaded");
      alert("Error: PPTX Generation library not loaded.");
      return;
    }

    const pres = new window.PptxGenJS();
    pres.layout = 'LAYOUT_16x9';
    pres.title = 'Lumina Deck Presentation';

    const slidesToExport = indices 
      ? slides.filter((_, idx) => indices.includes(idx))
      : slides;

    for (let i = 0; i < slidesToExport.length; i++) {
      const slide = slidesToExport[i];
      const pptSlide = pres.addSlide();

      // 1. Background
      // Prefer enhanced, fallback to original. 
      // MUST resolve URL to Base64 for pptxgenjs to work reliably in all envs.
      const rawBg = slide.enhancedImage || slide.originalImage;
      const bgData = await resolveImage(rawBg);

      if (bgData) {
          try {
             pptSlide.background = { data: bgData };
          } catch(e) {
             console.warn("Failed to add background image for slide " + i, e);
             pptSlide.background = { color: '0F172A' };
          }
      } else {
          pptSlide.background = { color: '0F172A' };
      }

      // 2. Overlay
      pptSlide.addShape(pres.ShapeType.rect, {
          x: 0, y: 0, w: '100%', h: '100%',
          fill: { color: '000000', transparency: 40 }
      });

      // 3. Title
      if (slide.analysis?.actionTitle) {
          pptSlide.addText(slide.analysis.actionTitle, {
              x: 0.5, y: 0.5, w: '90%', h: 1.2,
              fontSize: 44,
              color: 'FFFFFF',
              bold: true,
              fontFace: 'Arial',
              shadow: { type: 'outer', color: '000000', blur: 10, offset: 2, transparency: 50 }
          });
      }

      // 4. Script
      if (slide.analysis?.script) {
          pptSlide.addText(slide.analysis.script, {
              x: 1, y: 5.5, w: '80%', h: 1.5,
              fontSize: 18,
              color: 'F1F5F9',
              fontFace: 'Arial',
              align: 'center',
              isTextBox: true
          });
      }

      // 5. Assets
      if (slide.generatedAssets && slide.generatedAssets.length > 0) {
          for (let idx = 0; idx < slide.generatedAssets.length; idx++) {
              const asset = slide.generatedAssets[idx];
              const assetData = await resolveImage(asset.imageUrl);
              if (assetData) {
                  pptSlide.addImage({
                      data: assetData,
                      x: 1 + (idx * 3),
                      y: 2,
                      w: 2.5,
                      h: 2.5,
                      sizing: { type: 'contain', w: 2.5, h: 2.5 }
                  });
              }
          }
      }

      // 6. Slide Number
      pptSlide.addText(`${indices ? indices[i] + 1 : i + 1}`, {
          x: 9.2, y: 5.3, w: 0.5, h: 0.3,
          fontSize: 10,
          color: 'CCCCCC',
          align: 'right'
      });
    }

    await pres.writeFile({ fileName: `Lumina-Deck-${new Date().toISOString().slice(0,10)}.pptx` });
  } catch (err: any) {
    console.error("PPTX Generation Error:", err);
    alert("Failed to generate PPTX: " + err.message);
  }
};
