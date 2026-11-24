import { jsPDF } from "jspdf";

const RANK_CONFIGS = {
  1: {
    templateUrl: "/certificates/cert_template_1.jpg",
    nameColor: "#644a1d",
    nameShadow: "rgba(217, 119, 6, 0.25)",
    citationColor: "#334155",
    accentColor: "#b45309",
    citationLines: [
      "In recognition of his/her outstanding excellence, continuous dedication, and",
      "exceptional performance that leaves an inspiring impact.",
    ],
    sealTitle: "1st Place - Golden Rank",
    strokeHex: "#0f172a",
    fallbackBorder: [180, 115, 14],
    fallbackBg: [255, 251, 235],
  },
  2: {
    templateUrl: "/certificates/cert_template_2.jpg",
    nameColor: "#222c54",
    nameShadow: "rgba(99, 102, 241, 0.25)",
    citationColor: "#334155",
    accentColor: "#4338ca",
    citationLines: [
      "In recognition of his/her remarkable dedication, consistent effort,",
      "and distinguished academic achievement.",
    ],
    sealTitle: "2nd Place - Silver Rank",
    strokeHex: "#0f172a",
    fallbackBorder: [67, 56, 202],
    fallbackBg: [241, 245, 255],
  },
  3: {
    templateUrl: "/certificates/cert_template_3.jpg",
    nameColor: "#4d2816",
    nameShadow: "rgba(180, 83, 9, 0.25)",
    citationColor: "#334155",
    accentColor: "#9a3412",
    citationLines: [
      "In recognition of his/her commendable perseverance, strong commitment,",
      "and notable academic progress.",
    ],
    sealTitle: "3rd Place - Bronze Rank",
    strokeHex: "#0f172a",
    fallbackBorder: [15, 118, 110],
    fallbackBg: [240, 253, 250],
  },
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("window is undefined"));
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function createSignaturePng(instructorName = "Instructor", strokeHex = "#0f172a") {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 520;
  canvas.height = 140;
  const ctx = canvas.getContext("2d");

  const sigText = String(instructorName || "Instructor").trim() || "Instructor";

  ctx.save();
  ctx.translate(canvas.width / 2, 72);
  ctx.rotate(-0.035);

  let fontSize = 54;
  const fontFamily = "'Brush Script MT', 'Segoe Script', 'Lucida Handwriting', 'Alex Brush', cursive";
  ctx.font = `italic 600 ${fontSize}px ${fontFamily}`;
  while (ctx.measureText(sigText).width > canvas.width - 50 && fontSize > 24) {
    fontSize -= 2;
    ctx.font = `italic 600 ${fontSize}px ${fontFamily}`;
  }

  ctx.fillStyle = strokeHex;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(sigText, 0, 0);

  // Elegant calligraphy flourish underline
  const textWidth = Math.min(ctx.measureText(sigText).width + 30, canvas.width - 40);
  const halfW = textWidth / 2;
  ctx.strokeStyle = strokeHex;
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-halfW, 26);
  ctx.quadraticCurveTo(0, 16, halfW, 23);
  ctx.stroke();

  ctx.restore();
  return canvas.toDataURL("image/png");
}

function drawVectorFallback(ctx, rank, cfg) {
  // 2048 x 1528 fallback canvas
  ctx.fillStyle = `rgb(${cfg.fallbackBg.join(",")})`;
  ctx.fillRect(0, 0, 2048, 1528);

  ctx.strokeStyle = `rgb(${cfg.fallbackBorder.join(",")})`;
  ctx.lineWidth = 16;
  ctx.strokeRect(60, 60, 2048 - 120, 1528 - 120);

  ctx.lineWidth = 4;
  ctx.strokeRect(90, 90, 2048 - 180, 1528 - 180);

  ctx.textAlign = "center";
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 52px 'Cinzel', serif";
  ctx.fillText("ATHAR EDUCATIONAL PLATFORM", 1024, 250);

  ctx.font = "bold 64px 'Cinzel', serif";
  ctx.fillText("CERTIFICATE OF ACHIEVEMENT & EXCELLENCE", 1024, 380);

  ctx.fillStyle = cfg.accentColor;
  ctx.font = "italic bold 44px 'Cinzel', serif";
  ctx.fillText(cfg.sealTitle, 1024, 480);
}

export async function generateTop3CertificatePdf({
  rank = 1,
  studentName = "Distinguished Student",
  courseTitle = "Athar Educational Course",
  instructorName = "Mr. Ahmed Mohamed",
  totalPoints = 100,
  quizPoints = 50,
  assignmentPoints = 50,
}) {
  const cfg = RANK_CONFIGS[rank] || RANK_CONFIGS[1];
  const displayStudent = String(studentName || "Distinguished Student").trim();
  const displayCourse = String(courseTitle || "Athar Educational Course").trim();
  const resolvedInstructor = String(instructorName || "Mr. Ahmed Mohamed").trim();

  // Create ultra-sharp canvas (2048 x 1528, 2x Retina resolution of 1024 x 764)
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1528;
  const ctx = canvas.getContext("2d");

  // 1. Draw High-Fidelity Certificate Background Template (Gold, Silver, or Bronze)
  try {
    const templateImg = await loadImage(cfg.templateUrl);
    ctx.drawImage(templateImg, 0, 0, 2048, 1528);
  } catch (err) {
    console.warn("Could not load certificate template image, falling back to vector:", err);
    drawVectorFallback(ctx, rank, cfg);
  }

  // 2. Render Student Name in Flowing Classical Script
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let nameFontSize = 100;
  const scriptFontFamily =
    "'Alex Brush', 'Great Vibes', 'Brush Script MT', 'Lucida Handwriting', 'Segoe Script', cursive, serif";
  ctx.font = `italic 600 ${nameFontSize}px ${scriptFontFamily}`;

  while (ctx.measureText(displayStudent).width > 1300 && nameFontSize > 44) {
    nameFontSize -= 4;
    ctx.font = `italic 600 ${nameFontSize}px ${scriptFontFamily}`;
  }

  ctx.fillStyle = cfg.nameColor;
  ctx.shadowColor = cfg.nameShadow;
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;
  ctx.fillText(displayStudent, 1024, 860);
  ctx.restore();

  // 3. Render Rank Citation Lines
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "italic 500 27px 'Cinzel', 'Georgia', 'Times New Roman', serif";
  ctx.fillStyle = cfg.citationColor;
  ctx.fillText(cfg.citationLines[0], 1024, 1035);
  ctx.fillText(cfg.citationLines[1], 1024, 1078);
  ctx.restore();

  // 4. Render Course Title & Official Points Breakdown Badge
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 23px 'Cinzel', 'Trajan Pro', 'Segoe UI', sans-serif";
  ctx.fillStyle = cfg.accentColor;
  const detailsStr = `Course: "${displayCourse}"   ·   Score: ${totalPoints} Pts (Quizzes: ${quizPoints} pts | Assignments: ${assignmentPoints} pts)`;
  ctx.fillText(detailsStr, 1024, 1135);
  ctx.restore();

  // 5. Subject Teacher Signature & Title (Bottom Left)
  try {
    const sigPng = createSignaturePng(resolvedInstructor, cfg.strokeHex);
    const sigImg = await loadImage(sigPng);
    ctx.drawImage(sigImg, 220, 1145, 270, 85);
  } catch {}

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "600 23px 'Cinzel', 'Segoe UI', 'Helvetica', sans-serif";
  ctx.fillStyle = "#1e293b";
  ctx.fillText(`Subject Teacher / ${resolvedInstructor}`, 355, 1262);
  ctx.restore();

  // 6. Issue Date & Verification Identifier (Bottom Right)
  const issueDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const certCode = `ATAP-${rank}-${Date.now().toString().slice(-6)}`;

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 21px 'Cinzel', 'Segoe UI', sans-serif";
  ctx.fillStyle = "#334155";
  ctx.fillText(`Date: ${issueDate}`, 1680, 1238);
  ctx.font = "normal 19px 'Segoe UI', monospace";
  ctx.fillStyle = "#64748b";
  ctx.fillText(`ID: ${certCode}`, 1680, 1270);
  ctx.restore();

  // 7. Generate Landscape A4 PDF Document
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const dataUrl = canvas.toDataURL("image/jpeg", 0.94);
  doc.addImage(dataUrl, "JPEG", 0, 0, 297, 210);

  const safeFile = displayStudent.replace(/[^a-z0-9]/gi, "_");
  doc.save(`Certificate_Rank${rank}_${safeFile}.pdf`);
}
