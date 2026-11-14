import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export async function extractTextFromPdfFile(file, { onProgress = null } = {}) {
  const buffer = await file.arrayBuffer();
  if (onProgress) {
    onProgress({ percent: 20, stage: "Reading PDF document structure..." });
  }
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];
  const limit = Math.min(pdf.numPages, 25);
  for (let i = 1; i <= limit; i += 1) {
    if (onProgress) {
      const p = Math.round(20 + (i / limit) * 75);
      onProgress({ percent: p, stage: `Extracting text page ${i} of ${limit}...` });
    }
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  return pages.join("\n\n").trim();
}

