/**
 * Handles PDF loading and rendering to images using PDF.js
 */

export const convertPdfToImages = async (file: File): Promise<string[]> => {
  if (!window.pdfjsLib) {
    throw new Error("PDF.js library not loaded");
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const images: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    // Optimization: Reduced scale from 1.5 to 1.0. 
    // AI models do not need 4K resolution to read text and layout. 
    // This significantly reduces the base64 payload size and upload latency.
    const viewport = page.getViewport({ scale: 1.0 }); 
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Optimization: Reduced JPEG quality from 0.8 to 0.6.
    // This creates a much lighter payload for the Gemini API without compromising legibility.
    const base64 = canvas.toDataURL('image/jpeg', 0.6);
    images.push(base64);
  }

  return images;
};