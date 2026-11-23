import { jsPDF } from "jspdf";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load PDF page image"));
    img.src = src;
  });
}

function applyWatermarkToCanvas(ctx, width, height, pageNum, totalPages, assignment, studentName, lang = "en") {
  // 1. Top Header Banner
  const headerH = Math.max(38, Math.round(height * 0.03));
  ctx.fillStyle = "rgba(79, 70, 229, 0.09)";
  ctx.fillRect(0, 0, width, headerH);

  ctx.strokeStyle = "rgba(99, 102, 241, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(width, headerH);
  ctx.stroke();

  // Header Title
  ctx.font = `bold ${Math.max(12, Math.round(width * 0.016))}px "Plus Jakarta Sans", Cairo, sans-serif`;
  ctx.fillStyle = "#3730a3";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const headerY = headerH / 2;
  ctx.fillText("ATHAR EDUCATIONAL PLATFORM • منصة أثر التعليمية", 20, headerY);

  // Header Right Metadata
  ctx.textAlign = "right";
  ctx.font = `600 ${Math.max(10, Math.round(width * 0.012))}px "Plus Jakarta Sans", Cairo, sans-serif`;
  ctx.fillStyle = "#4338ca";
  const cleanTitle = (assignment?.title || "Worksheet").slice(0, 36);
  ctx.fillText(`${cleanTitle} · Official Assignment Worksheet`, width - 20, headerY);

  // 2. Large Repeating Diagonal Watermark Pattern across the page
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((-32 * Math.PI) / 180);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const diagStep = Math.max(160, Math.round(height * 0.22));
  for (let y = -height * 1.4; y <= height * 1.4; y += diagStep) {
    // Primary Platform Name Watermark
    ctx.font = `900 ${Math.max(22, Math.round(width * 0.046))}px "Plus Jakarta Sans", Cairo, sans-serif`;
    ctx.fillStyle = "rgba(99, 102, 241, 0.12)"; // Translucent indigo
    ctx.fillText("ATHAR EDUCATIONAL PLATFORM • منصة أثر التعليمية", 0, y);

    // Secondary Security & Subtitle Watermark
    ctx.font = `bold ${Math.max(12, Math.round(width * 0.022))}px "Plus Jakarta Sans", Cairo, sans-serif`;
    ctx.fillStyle = "rgba(100, 116, 139, 0.10)"; // Translucent slate
    ctx.fillText("ATHAR AI · STUDENT ASSIGNMENT WORKSHEET · NOT FOR REDISTRIBUTION", 0, y + diagStep * 0.42);
  }
  ctx.restore();

  // 3. Bottom Footer Banner
  const footerH = Math.max(34, Math.round(height * 0.026));
  const footerY = height - footerH;
  ctx.fillStyle = "rgba(248, 250, 252, 0.95)";
  ctx.fillRect(0, footerY, width, footerH);

  ctx.strokeStyle = "rgba(99, 102, 241, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, footerY);
  ctx.lineTo(width, footerY);
  ctx.stroke();

  // Footer Instructions
  ctx.font = `bold ${Math.max(10, Math.round(width * 0.012))}px "Plus Jakarta Sans", Cairo, sans-serif`;
  ctx.fillStyle = "#334155";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const textY = footerY + footerH / 2;

  const footerText = studentName
    ? `Student: ${studentName} · Solve & upload to Athar Platform for AI Auto-Grading`
    : `Solve & upload completed worksheet to Athar Platform for AI Auto-Grading`;
  ctx.fillText(footerText, 20, textY);

  // Footer Page Number
  ctx.textAlign = "right";
  ctx.font = `bold ${Math.max(10, Math.round(width * 0.012))}px "Plus Jakarta Sans", Cairo, sans-serif`;
  ctx.fillStyle = "#4f46e5";
  ctx.fillText(`Page ${pageNum} of ${totalPages}`, width - 20, textY);
}

/**
 * Downloads the assignment worksheet as a watermarked PDF.
 * Applies the platform name watermark across every page.
 */
export async function downloadWatermarkedAssignmentPdf(
  assignment,
  { studentName = "", lang = "en", onProgress = null } = {}
) {
  if (!assignment) throw new Error("No assignment provided for download");

  const pdfPages = Array.isArray(assignment.pdfPages) ? assignment.pdfPages : [];
  let doc = null;

  if (pdfPages.length > 0) {
    const totalPages = pdfPages.length;

    for (let i = 0; i < totalPages; i += 1) {
      if (onProgress) {
        onProgress({
          percent: Math.round(((i + 1) / totalPages) * 90),
          stage: `Applying Athar watermark to page ${i + 1} of ${totalPages}...`,
        });
      }

      const img = await loadImage(pdfPages[i]);
      const w = img.naturalWidth || 1200;
      const h = img.naturalHeight || 1600;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");

      // Draw original worksheet page
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      // Overlay platform watermark on top
      applyWatermarkToCanvas(ctx, w, h, i + 1, totalPages, assignment, studentName, lang);

      const pageDataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const orientation = w > h ? "landscape" : "portrait";

      if (i === 0) {
        doc = new jsPDF({
          orientation,
          unit: "px",
          format: [w, h],
        });
      } else {
        doc.addPage([w, h], orientation);
      }

      doc.addImage(pageDataUrl, "JPEG", 0, 0, w, h);
    }
  } else {
    // Generate a clean branded worksheet page from assignment instructions
    if (onProgress) {
      onProgress({ percent: 50, stage: "Formatting branded assignment worksheet..." });
    }

    const w = 1200;
    const h = 1697; // Standard A4 ratio
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // Header Content
    ctx.fillStyle = "#1e1b4b";
    ctx.font = `bold 32px "Plus Jakarta Sans", Cairo, sans-serif`;
    ctx.fillText(assignment.title || "Assignment Worksheet", 60, 100);

    ctx.fillStyle = "#4f46e5";
    ctx.font = `600 18px "Plus Jakarta Sans", Cairo, sans-serif`;
    const maxMarks = Number(assignment.maxMarks) || 10;
    const dueInfo = assignment.dueDate ? ` · Due: ${assignment.dueDate} ${assignment.dueTime || ""}` : "";
    ctx.fillText(`Maximum Marks: ${maxMarks} pts${dueInfo}`, 60, 135);

    // Divider line
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 160);
    ctx.lineTo(w - 60, 160);
    ctx.stroke();

    // Instructions
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold 20px "Plus Jakarta Sans", Cairo, sans-serif`;
    ctx.fillText("Instructions & Questions:", 60, 205);

    ctx.fillStyle = "#334155";
    ctx.font = `16px "Plus Jakarta Sans", Cairo, sans-serif`;
    const instructions = assignment.instructions || "Please write your answers clearly, then upload your solved solution back to the Athar platform for AI grading.";
    
    // Simple text wrapping
    const maxWidth = w - 120;
    const words = instructions.split(/\s+/);
    let line = "";
    let curY = 240;

    for (let n = 0; n < words.length; n += 1) {
      const testLine = `${line}${words[n]} `;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, 60, curY);
        line = `${words[n]} `;
        curY += 28;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 60, curY);

    // Answer area box
    const answerBoxY = Math.min(curY + 40, h - 350);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(60, answerBoxY, w - 120, h - answerBoxY - 70);

    ctx.fillStyle = "#94a3b8";
    ctx.font = `italic 15px "Plus Jakarta Sans", Cairo, sans-serif`;
    ctx.fillText("Write your solutions in this space or attach additional handwritten sheets.", 80, answerBoxY + 35);

    // Apply Platform Watermark
    applyWatermarkToCanvas(ctx, w, h, 1, 1, assignment, studentName, lang);

    const pageDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    doc = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [w, h],
    });
    doc.addImage(pageDataUrl, "JPEG", 0, 0, w, h);
  }

  const safeTitle = (assignment.title || "Assignment")
    .replace(/[^\w\s-]/gi, "")
    .trim()
    .replace(/\s+/g, "_");
  const fileName = `${safeTitle}_Athar_Worksheet.pdf`;

  if (onProgress) {
    onProgress({ percent: 100, stage: "Download ready!" });
  }

  doc.save(fileName);
  return fileName;
}
