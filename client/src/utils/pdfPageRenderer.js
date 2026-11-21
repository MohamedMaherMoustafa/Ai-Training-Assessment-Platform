import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

/**
 * Renders every page of an uploaded PDF File into crisp white-backed JPEG data URLs
 * so instructors can upload PDF worksheets and students can annotate them live on canvas.
 * Supports multi-page documents (including 50+ pages) without artificial caps.
 */
export async function renderPdfFileToPages(
  file,
  { maxPages = 200, targetWidth = 1000, quality = null, onProgress = null } = {}
) {
  const fileSize = file?.size || 1000000;
  if (onProgress) {
    onProgress({
      percent: 5,
      loadedBytes: Math.round(fileSize * 0.05),
      stage: "Reading file from disk...",
    });
  }

  const buffer = await file.arrayBuffer();
  if (onProgress) {
    onProgress({
      percent: 12,
      loadedBytes: Math.round(fileSize * 0.12),
      stage: "Opening PDF document...",
    });
  }

  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const totalPages = maxPages && Number.isFinite(maxPages)
    ? Math.min(pdf.numPages, maxPages)
    : pdf.numPages;
  const pages = [];
  let extractedText = "";

  // Determine dynamic compression quality based on page count to ensure smooth storage & fast rendering
  const effectiveQuality = quality !== null && quality !== undefined
    ? quality
    : totalPages > 50
    ? 0.70
    : totalPages > 25
    ? 0.74
    : 0.78;

  for (let p = 1; p <= totalPages; p += 1) {
    if (onProgress) {
      const pageStartPercent = Math.round(12 + ((p - 1) / totalPages) * 83);
      onProgress({
        percent: pageStartPercent,
        loadedBytes: Math.round(fileSize * (pageStartPercent / 100)),
        stage: `Rendering & preparing page ${p} of ${totalPages}...`,
      });
    }

    const page = await pdf.getPage(p);

    // Extract text content from PDF page for AI assignment grading and indexing
    try {
      const textContent = await page.getTextContent();
      const pageWords = textContent.items
        .map((item) => item.str || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (pageWords) {
        extractedText += (extractedText ? "\n\n" : "") + `[Page ${p}]: ${pageWords}`;
      }
    } catch (textErr) {
      console.warn(`[pdfPageRenderer] Text extraction note on page ${p}:`, textErr.message);
    }

    const unscaled = page.getViewport({ scale: 1 });
    const scale = Math.min(2.0, Math.max(0.85, targetWidth / unscaled.width));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push(canvas.toDataURL("image/jpeg", effectiveQuality));

    if (onProgress) {
      const pageDonePercent = Math.round(12 + (p / totalPages) * 83);
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
      stage: `All ${totalPages} pages rendered successfully!`,
    });
  }

  return {
    pdfName: file.name,
    pageCount: pdf.numPages,
    renderedCount: totalPages,
    pages,
    extractedText,
  };
}

