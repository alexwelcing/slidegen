import { SlideData } from '../types';

export const exportToPptx = async (slides: SlideData[], indices?: number[]) => {
  if (!window.PptxGenJS) {
    console.error("PptxGenJS not loaded");
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
    const bgData = slide.enhancedImage || slide.originalImage;
    if (bgData) {
        pptSlide.background = { data: bgData };
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
        slide.generatedAssets.forEach((asset, idx) => {
            pptSlide.addImage({
                data: asset.imageUrl,
                x: 1 + (idx * 3),
                y: 2,
                w: 2.5,
                h: 2.5,
                sizing: { type: 'contain', w: 2.5, h: 2.5 }
            });
        });
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
};