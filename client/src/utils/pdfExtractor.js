import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export async function extractTextFromPdfFile(file, { maxPages = 200, onProgress = null } = {}) {
  const buffer = await file.arrayBuffer();
  if (onProgress) {
    onProgress({ percent: 10, stage: "Reading PDF document structure..." });
  }
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];
  const limit = maxPages && Number.isFinite(maxPages)
    ? Math.min(pdf.numPages, maxPages)
    : pdf.numPages;
  for (let i = 1; i <= limit; i += 1) {
    if (onProgress) {
      const p = Math.round(10 + (i / limit) * 85);
      onProgress({ percent: p, stage: `Extracting text page ${i} of ${limit}...` });
    }
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  if (onProgress) {
    onProgress({ percent: 100, stage: "Text extraction complete!" });
  }
  return pages.join("\n\n").trim();
}

