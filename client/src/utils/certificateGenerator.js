import { jsPDF } from "jspdf";

function createPlatformLogoPng(primaryHex = "#0284c7", secondaryHex = "#4f46e5") {
  const canvas = document.createElement("canvas");
  canvas.width = 180;
  canvas.height = 180;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, 180, 180);
  grad.addColorStop(0, primaryHex);
  grad.addColorStop(1, secondaryHex);

  const r = 38;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(180 - r, 0);
  ctx.quadraticCurveTo(180, 0, 180, r);
  ctx.lineTo(180, 180 - r);
  ctx.quadraticCurveTo(180, 180, 180 - r, 180);
  ctx.lineTo(r, 180);
  ctx.quadraticCurveTo(0, 180, 0, 180 - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(90, 42);
  ctx.lineTo(148, 70);
  ctx.lineTo(90, 98);
  ctx.lineTo(32, 70);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(52, 86);
  ctx.lineTo(52, 114);
  ctx.quadraticCurveTo(90, 138, 128, 114);
  ctx.lineTo(128, 86);
  ctx.lineTo(90, 104);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(140, 74);
  ctx.lineTo(140, 116);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

function createSignaturePng(instructorName = "Instructor", strokeHex = "#0f172a") {
  const canvas = document.createElement("canvas");
  canvas.width = 420;
  canvas.height = 120;
  const ctx = canvas.getContext("2d");

  const sigText = String(instructorName || "Instructor").trim() || "Instructor";

  ctx.save();
  ctx.translate(canvas.width / 2, 62);
  ctx.rotate(-0.035);

  let fontSize = 48;
  const fontFamily = "'Brush Script MT', 'Segoe Script', 'Lucida Handwriting', 'Apple Chancery', cursive";
  ctx.font = `italic 600 ${fontSize}px ${fontFamily}`;
  while (ctx.measureText(sigText).width > canvas.width - 48 && fontSize > 22) {
    fontSize -= 2;
    ctx.font = `italic 600 ${fontSize}px ${fontFamily}`;
  }

  ctx.fillStyle = strokeHex;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(sigText, 0, 0);

  // Calligraphic pen flourish underline beneath the instructor's name signature
  const textWidth = Math.min(ctx.measureText(sigText).width + 24, canvas.width - 40);
  const halfW = textWidth / 2;
  ctx.strokeStyle = strokeHex;
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-halfW, 24);
  ctx.quadraticCurveTo(0, 14, halfW, 21);
  ctx.stroke();

  ctx.restore();
  return canvas.toDataURL("image/png");
}

const RANK_THEMES = {
  1: {
    label: "1ST PLACE — GOLD CERTIFICATE",
    badge: "GOLD HONOR",
    bgTint: [255, 251, 235],
    outerBorder: [180, 115, 14],
    innerBorder: [245, 158, 11],
    headerBg: [120, 53, 15],
    accentText: [180, 83, 9],
    sealFill: [245, 158, 11],
    logoA: "#d97706",
    logoB: "#f59e0b",
  },
  2: {
    label: "2ND PLACE — SILVER INDIGO CERTIFICATE",
    badge: "SILVER HONOR",
    bgTint: [241, 245, 255],
    outerBorder: [67, 56, 202],
    innerBorder: [148, 163, 184],
    headerBg: [30, 27, 75],
    accentText: [67, 56, 202],
    sealFill: [99, 102, 241],
    logoA: "#4f46e5",
    logoB: "#64748b",
  },
  3: {
    label: "3RD PLACE — BRONZE TEAL CERTIFICATE",
    badge: "BRONZE HONOR",
    bgTint: [240, 253, 250],
    outerBorder: [15, 118, 110],
    innerBorder: [217, 119, 6],
    headerBg: [19, 78, 74],
    accentText: [15, 118, 110],
    sealFill: [13, 148, 136],
    logoA: "#0d9488",
    logoB: "#c2410c",
  },
};

export function generateTop3CertificatePdf({
  rank,
  studentName,
  courseTitle,
  instructorName,
  totalPoints,
  quizPoints,
  assignmentPoints,
}) {
  const theme = RANK_THEMES[rank] || RANK_THEMES[1];
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth(); // 297
  const h = doc.internal.pageSize.getHeight(); // 210

  // Soft tinted parchment background
  doc.setFillColor(...theme.bgTint);
  doc.rect(0, 0, w, h, "F");

  // Outer & Inner Ornamental Frame
  doc.setDrawColor(...theme.outerBorder);
  doc.setLineWidth(2.4);
  doc.rect(8, 8, w - 16, h - 16);

  doc.setDrawColor(...theme.innerBorder);
  doc.setLineWidth(0.8);
  doc.rect(12, 12, w - 24, h - 24);

  // Corner accents
  const corners = [
    [12, 12],
    [w - 22, 12],
    [12, h - 22],
    [w - 22, h - 22],
  ];
  doc.setFillColor(...theme.innerBorder);
  corners.forEach(([cx, cy]) => {
    doc.rect(cx, cy, 10, 10, "F");
  });

  // Top Header Strip with Platform Logo & Name
  const logoPng = createPlatformLogoPng(theme.logoA, theme.logoB);
  doc.addImage(logoPng, "PNG", w / 2 - 12, 19, 24, 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...theme.headerBg);
  doc.text("AI TRAINING & ASSESSMENT PLATFORM", w / 2, 50, { align: "center" });

  // Rank Banner Pill
  doc.setFillColor(...theme.sealFill);
  doc.roundedRect(w / 2 - 48, 55, 96, 8, 4, 4, "F");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(theme.label, w / 2, 60.5, { align: "center" });

  // Certificate Title
  doc.setFont("times", "bold");
  doc.setFontSize(30);
  doc.setTextColor(15, 23, 42);
  doc.text("CERTIFICATE OF ACHIEVEMENT", w / 2, 78, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text("THIS PROUDLY CERTIFIES THAT", w / 2, 90, { align: "center" });

  // Student Name
  doc.setFont("times", "bolditalic");
  doc.setFontSize(28);
  doc.setTextColor(...theme.accentText);
  doc.text(String(studentName || "Top Student"), w / 2, 106, { align: "center" });

  // Underline beneath Student Name
  doc.setDrawColor(...theme.innerBorder);
  doc.setLineWidth(0.7);
  doc.line(w / 2 - 70, 110, w / 2 + 70, 110);

  // Course & Achievement Details
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11.5);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `has achieved Rank #${rank} (${theme.badge}) in the course`,
    w / 2,
    122,
    { align: "center" }
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(`"${String(courseTitle || "Technical Course")}"`, w / 2, 132, { align: "center" });

  // Data Metrics Box (Points, Breakdown, Date)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...theme.innerBorder);
  doc.roundedRect(w / 2 - 92, 140, 184, 16, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...theme.accentText);
  doc.text(
    `Total Score: ${totalPoints} Points   |   Quizzes: ${quizPoints} pts   |   Assignments: ${assignmentPoints} pts`,
    w / 2,
    149.8,
    { align: "center" }
  );

  // Footer Row: Date | Seal | Signature
  const issueDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const certCode = `ATAP-${rank}-${Date.now().toString().slice(-6)}`;

  // Left: Date & Certificate ID
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(issueDate, 58, 178, { align: "center" });
  doc.setDrawColor(100, 116, 139);
  doc.line(30, 181, 86, 181);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Issue Date · ID: ${certCode}`, 58, 187, { align: "center" });

  // Center: Rank Seal Circle
  doc.setFillColor(...theme.sealFill);
  doc.circle(w / 2, 179, 13, "F");
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.8);
  doc.circle(w / 2, 179, 10.5, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`#${rank}`, w / 2, 178, { align: "center" });
  doc.setFontSize(6.5);
  doc.text(theme.badge, w / 2, 183, { align: "center" });

  // Right: Instructor Signature (styled cursive rendering of the actual instructor name)
  const resolvedInstructor = String(instructorName || "Instructor").trim() || "Instructor";
  const sigPng = createSignaturePng(resolvedInstructor, "#0f172a");
  doc.addImage(sigPng, "PNG", w - 95, 160, 58, 17);
  doc.setDrawColor(100, 116, 139);
  doc.line(w - 98, 181, w - 34, 181);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(resolvedInstructor, w - 66, 186.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Course Instructor Signature", w - 66, 191.5, { align: "center" });

  const safeFile = String(studentName || "student").replace(/[^a-z0-9]/gi, "_");
  doc.save(`Certificate_Rank${rank}_${safeFile}.pdf`);
}

