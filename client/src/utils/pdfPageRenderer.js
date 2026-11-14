import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

/**
 * Renders every page of an uploaded PDF File into crisp white-backed JPEG data URLs
 * so instructors can upload PDF worksheets and students can annotate them live on canvas.
 */
export async function renderPdfFileToPages(
  file,
  { maxPages = 12, targetWidth = 1050, onProgress = null } = {}
) {
  const fileSize = file?.size || 1000000;
  if (onProgress) {
    onProgress({
      percent: 10,
      loadedBytes: Math.round(fileSize * 0.1),
      stage: "Reading file from disk...",
    });
  }

  const buffer = await file.arrayBuffer();
  if (onProgress) {
    onProgress({
      percent: 25,
      loadedBytes: Math.round(fileSize * 0.25),
      stage: "Opening PDF document...",
    });
  }

  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const totalPages = Math.min(pdf.numPages, maxPages);
  const pages = [];

  for (let p = 1; p <= totalPages; p += 1) {
    if (onProgress) {
      const pageStartPercent = Math.round(25 + ((p - 1) / totalPages) * 70);
      onProgress({
        percent: pageStartPercent,
        loadedBytes: Math.round(fileSize * (pageStartPercent / 100)),
        stage: `Rendering & preparing page ${p} of ${totalPages}...`,
      });
    }

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

    if (onProgress) {
      const pageDonePercent = Math.round(25 + (p / totalPages) * 70);
      onProgress({
        percent: pageDonePercent,
        loadedBytes: Math.round(fileSize * (pageDonePercent / 100)),
        stage: p === totalPages ? "Finalizing pages..." : `Completed page ${p} of ${totalPages}`,
      });
    }
  }

  if (onProgress) {
    onProgress({
      percent: 100,
      loadedBytes: fileSize,
      stage: "All pages rendered!",
    });
  }

  return {
    pdfName: file.name,
    pageCount: pdf.numPages,
    renderedCount: totalPages,
    pages,
  };
}

