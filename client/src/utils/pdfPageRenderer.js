import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

/**
 * Renders every page of an uploaded PDF File into crisp white-backed JPEG data URLs
 * so instructors can upload PDF worksheets and students can annotate them live on canvas.
 */
export async function renderPdfFileToPages(file, { maxPages = 12, targetWidth = 1050 } = {}) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const totalPages = Math.min(pdf.numPages, maxPages);
  const pages = [];

  for (let p = 1; p <= totalPages; p += 1) {
    const page = await pdf.getPage(p);
    const unscaled = page.getViewport({ scale: 1 });
    const scale = Math.min(2.2, Math.max(1.0, targetWidth / unscaled.width));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push(canvas.toDataURL("image/jpeg", 0.78));
  }

  return {
    pdfName: file.name,
    pageCount: pdf.numPages,
    renderedCount: totalPages,
    pages,
  };
}

