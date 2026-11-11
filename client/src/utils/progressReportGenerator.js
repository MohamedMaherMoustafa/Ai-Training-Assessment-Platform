import { jsPDF } from "jspdf";

function createPlatformLogoPng() {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, 160, 160);
  grad.addColorStop(0, "#0284c7");
  grad.addColorStop(1, "#4f46e5");

  const r = 34;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(160 - r, 0);
  ctx.quadraticCurveTo(160, 0, 160, r);
  ctx.lineTo(160, 160 - r);
  ctx.quadraticCurveTo(160, 160, 160 - r, 160);
  ctx.lineTo(r, 160);
  ctx.quadraticCurveTo(0, 160, 0, 160 - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.48)";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(80, 38);
  ctx.lineTo(132, 62);
  ctx.lineTo(80, 86);
  ctx.lineTo(28, 62);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(46, 76);
  ctx.lineTo(46, 102);
  ctx.quadraticCurveTo(80, 124, 114, 102);
  ctx.lineTo(114, 76);
  ctx.lineTo(80, 92);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#bae6fd";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(124, 66);
  ctx.lineTo(124, 104);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

function createSignaturePng(instructorName = "Instructor") {
  const canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 100;
  const ctx = canvas.getContext("2d");

  const sigText = String(instructorName || "Instructor").trim() || "Instructor";
  ctx.save();
  ctx.translate(canvas.width / 2, 52);
  ctx.rotate(-0.03);

  let fontSize = 40;
  const fontFamily = "'Brush Script MT', 'Segoe Script', 'Lucida Handwriting', cursive";
  ctx.font = `italic 600 ${fontSize}px ${fontFamily}`;
  while (ctx.measureText(sigText).width > canvas.width - 40 && fontSize > 20) {
    fontSize -= 2;
    ctx.font = `italic 600 ${fontSize}px ${fontFamily}`;
  }

  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(sigText, 0, 0);

  const halfW = Math.min(ctx.measureText(sigText).width + 20, canvas.width - 36) / 2;
  ctx.strokeStyle = "#0284c7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-halfW, 20);
  ctx.quadraticCurveTo(0, 12, halfW, 18);
  ctx.stroke();
  ctx.restore();

  return canvas.toDataURL("image/png");
}

function hasNonAscii(val) {
  return /[^\x20-\x7E]/.test(String(val || ""));
}

function createUnicodeTextPng(text, { font = "bold 28px 'Segoe UI', Tahoma, Arial, sans-serif", color = "#0f172a", align = "left", maxWidth = 820 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = maxWidth;
  canvas.height = 44;
  const ctx = canvas.getContext("2d");
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  const x = align === "center" ? maxWidth / 2 : align === "right" ? maxWidth - 4 : 4;
  ctx.fillText(String(text || ""), x, 22, maxWidth - 8);
  return canvas.toDataURL("image/png");
}

function drawSmartText(doc, text, x, y, { maxWidthMm = 70, fontSizePt = 9, bold = false, color = "#0f172a", align = "left" } = {}) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return;
  if (!hasNonAscii(raw)) {
    doc.text(raw, x, y, align === "left" ? undefined : { align });
    return;
  }
  const pxW = Math.round(maxWidthMm * 8);
  const pxFont = Math.round(fontSizePt * 2.7);
  const png = createUnicodeTextPng(raw, {
    font: `${bold ? "bold" : "normal"} ${pxFont}px 'Segoe UI', Tahoma, Arial, sans-serif`,
    color,
    align,
    maxWidth: pxW,
  });
  const hMm = 5.5;
  const drawX = align === "center" ? x - maxWidthMm / 2 : align === "right" ? x - maxWidthMm : x;
  doc.addImage(png, "PNG", drawX, y - 4, maxWidthMm, hMm);
}

function toPdfAscii(val, maxLen = 200) {
  const cleaned = String(val || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "—";
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 3)}...` : cleaned;
}

export function generateStudentProgressReportPdf({
  student,
  instructorName,
  fromDate,
  toDate,
  logs,
  summary,
  courseBreakdown,
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const logoPng = createPlatformLogoPng();
  const generatedAt = new Date().toLocaleString();

  const periodLabel =
    fromDate && toDate
      ? `From ${fromDate}  To  ${toDate}`
      : fromDate
      ? `From ${fromDate}  To  Present`
      : toDate
      ? `Up To ${toDate}`
      : "All Recorded History";

  const drawHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 36, "F");
    doc.setFillColor(2, 132, 199);
    doc.rect(0, 36, pageW, 2, "F");

    doc.addImage(logoPng, "PNG", 14, 7, 22, 22);

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("AI Training & Assessment Platform", 41, 14.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(186, 230, 253);
    doc.text("Official Student Progress Tracker & Activity Report", 41, 21.5);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Period: ${periodLabel}  |  Generated: ${generatedAt}`, 41, 28.5);
  };

  const drawFooter = (pageNum, totalPages) => {
    doc.setDrawColor(203, 213, 225);
    doc.line(14, pageH - 13, pageW - 14, pageH - 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `AI Training & Assessment Platform — Student Progress Report (${periodLabel})`,
      14,
      pageH - 7.5
    );
    doc.text(`Page ${pageNum} of ${totalPages}`, pageW - 14, pageH - 7.5, { align: "right" });
  };

  drawHeader();

  // Student & Report Interval Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 43, pageW - 28, 23, 2.5, 2.5, "FD");
  doc.setFillColor(79, 70, 229);
  doc.rect(14, 43, 2.2, 23, "F");

  const stName = toPdfAscii(student?.displayName || student?.email || "Student", 40);
  const stEmail = toPdfAscii(student?.email || student?.uid || "", 48);
  const instLabel = toPdfAscii(instructorName || "Instructor", 36);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("STUDENT PROFILE", 20, 49.5);
  doc.text("REPORT INTERVAL & INSTRUCTOR", 112, 49.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  drawSmartText(doc, stName, 20, 56, { maxWidthMm: 82, fontSizePt: 11, bold: true, color: "#0f172a" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  drawSmartText(doc, stEmail, 20, 61.5, { maxWidthMm: 82, fontSizePt: 8.5, color: "#475569" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(2, 132, 199);
  doc.text(periodLabel, 112, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  drawSmartText(doc, `Instructor: ${instLabel}`, 112, 61.5, {
    maxWidthMm: 78,
    fontSizePt: 8.5,
    color: "#475569",
  });

  // Executive KPI Summary Cards
  const kpis = [
    { label: "Total Points Earned", value: `${summary.totalPoints} pts`, accent: [245, 158, 11] },
    {
      label: "Quiz Points",
      value: `${summary.quizPoints} pts (${summary.quizCount})`,
      accent: [2, 132, 199],
    },
    {
      label: "Assignment Points",
      value: `${summary.assignmentPoints} pts (${summary.gradedAssignments}/${summary.assignmentCount})`,
      accent: [79, 70, 229],
    },
    {
      label: "Recorded Activities",
      value: `${logs.length} logs (${summary.passRate}% pass)`,
      accent: [16, 185, 129],
    },
  ];
  const cardW = (pageW - 28 - 9) / 4;
  kpis.forEach((k, i) => {
    const x = 14 + i * (cardW + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, 71, cardW, 18, 2.5, 2.5, "FD");
    doc.setFillColor(...k.accent);
    doc.rect(x, 71, cardW, 1.6, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.4);
    doc.setTextColor(100, 116, 139);
    doc.text(k.label, x + 3, 77.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(k.value, x + 3, 85);
  });

  let y = 97;

  // Course Points Summary Table (if present)
  if (courseBreakdown && courseBreakdown.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Points Summary by Course (Selected Interval)", 14, y);
    y += 4;

    doc.setFillColor(30, 41, 59);
    doc.rect(14, y, pageW - 28, 7.5, "F");
    doc.setFontSize(7.8);
    doc.setTextColor(255, 255, 255);
    doc.text("Course", 17, y + 5.1);
    doc.text("Quizzes", 104, y + 5.1, { align: "center" });
    doc.text("Quiz Pts", 128, y + 5.1, { align: "center" });
    doc.text("Assignments", 152, y + 5.1, { align: "center" });
    doc.text("Assign Pts", 173, y + 5.1, { align: "center" });
    doc.text("Total Pts", 193, y + 5.1, { align: "right" });
    y += 7.5;

    courseBreakdown.forEach((cb, idx) => {
      if (y + 8 > pageH - 22) {
        doc.addPage();
        drawHeader();
        y = 44;
      }
      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, y, pageW - 28, 7.5, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      drawSmartText(doc, toPdfAscii(cb.courseTitle, 42), 17, y + 5, {
        maxWidthMm: 78,
        fontSizePt: 8,
        bold: true,
        color: "#0f172a",
      });
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(String(cb.quizCount), 104, y + 5, { align: "center" });
      doc.text(`${cb.quizPoints} pts`, 128, y + 5, { align: "center" });
      doc.text(String(cb.assignmentCount), 152, y + 5, { align: "center" });
      doc.text(`${cb.assignmentPoints} pts`, 173, y + 5, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(2, 132, 199);
      doc.text(`${cb.totalPoints} pts`, 193, y + 5, { align: "right" });
      y += 7.5;
    });
    y += 8;
  }

  // Recorded Activities Log Table
  if (y + 20 > pageH - 20) {
    doc.addPage();
    drawHeader();
    y = 44;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Chronological Student Activity, Marks & Assessment Logs", 14, y);
  y += 4;

  const drawLogHeader = (posY) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(14, posY, pageW - 28, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(255, 255, 255);
    doc.text("#", 17, posY + 5.3);
    doc.text("Date & Time", 24, posY + 5.3);
    doc.text("Type", 60, posY + 5.3);
    doc.text("Course & Activity", 86, posY + 5.3);
    doc.text("Status", 156, posY + 5.3);
    doc.text("Points", 193, posY + 5.3, { align: "right" });
    return posY + 8;
  };

  y = drawLogHeader(y);

  if (logs.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, y, pageW - 28, 12, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("No recorded activities found within the selected date interval.", pageW / 2, y + 7.5, {
      align: "center",
    });
    y += 14;
  } else {
    logs.forEach((log, idx) => {
      const detailText = log.details ? toPdfAscii(log.details, 220) : "";
      const detailLines =
        detailText && detailText !== "—"
          ? doc.splitTextToSize(`Details: ${detailText}`, pageW - 38)
          : [];
      const rowH = 9.5 + (detailLines.length > 0 ? detailLines.length * 3.8 + 3.5 : 0);

      if (y + rowH > pageH - 22) {
        doc.addPage();
        drawHeader();
        y = drawLogHeader(44);
      }

      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, y, pageW - 28, rowH, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.6);
      doc.setTextColor(71, 85, 105);
      doc.text(String(idx + 1), 17, y + 5.8);

      const dtStr = log.timestamp
        ? new Date(log.timestamp).toLocaleString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";
      doc.text(dtStr, 24, y + 5.8);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(2, 132, 199);
      doc.text(toPdfAscii(log.typeLabel, 14), 60, y + 5.8);

      doc.setTextColor(15, 23, 42);
      drawSmartText(doc, toPdfAscii(`${log.title} (${log.courseTitle})`, 36), 86, y + 5.8, {
        maxWidthMm: 64,
        fontSizePt: 7.6,
        bold: true,
        color: "#0f172a",
      });

      // Status Pill
      const isPositive = ["PASS", "GRADED", "APPROVED", "SUBMITTED"].includes(log.statusBadge);
      const isWarn = ["REVIEW", "REJECTED", "PENDING"].includes(log.statusBadge);
      doc.setFillColor(
        isPositive ? 220 : isWarn ? 254 : 226,
        isPositive ? 252 : isWarn ? 243 : 232,
        isPositive ? 231 : isWarn ? 199 : 240
      );
      doc.roundedRect(155, y + 2, 19, 5, 1.4, 1.4, "F");
      doc.setFontSize(6.5);
      doc.setTextColor(isPositive ? 5 : isWarn ? 180 : 71, isPositive ? 150 : isWarn ? 83 : 85, isPositive ? 105 : isWarn ? 9 : 105);
      doc.text(toPdfAscii(log.statusBadge || "LOG", 10), 164.5, y + 5.4, { align: "center" });

      // Points column
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      if (log.pointsDisplay) {
        doc.setTextColor(15, 23, 42);
        doc.text(toPdfAscii(log.pointsDisplay, 14), 193, y + 5.8, { align: "right" });
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text("—", 193, y + 5.8, { align: "right" });
      }

      if (detailLines.length > 0) {
        doc.setFillColor(239, 246, 255);
        doc.rect(19, y + 8.5, pageW - 36, detailLines.length * 3.8 + 2.5, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);
        doc.setTextColor(30, 64, 175);
        doc.text(detailLines, 21.5, y + 12);
      }

      y += rowH;
    });
  }

  // Instructor Sign-off Block
  if (y + 34 > pageH - 18) {
    doc.addPage();
    drawHeader();
    y = 48;
  } else {
    y += 10;
  }

  const sigPng = createSignaturePng(instructorName || "Course Instructor");
  doc.addImage(sigPng, "PNG", pageW - 76, y, 54, 15);
  doc.setDrawColor(148, 163, 184);
  doc.line(pageW - 78, y + 17, pageW - 18, y + 17);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(toPdfAscii(instructorName || "Course Instructor", 34), pageW - 48, y + 22, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Verified by Course Instructor", pageW - 48, y + 26.5, { align: "center" });

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    drawFooter(p, totalPages);
  }

  const safeStudent = String(student?.displayName || student?.email || "student").replace(
    /[^a-z0-9]/gi,
    "_"
  );
  const safePeriod = `${fromDate || "start"}_to_${toDate || "now"}`;
  doc.save(`Student_Progress_${safeStudent}_${safePeriod}.pdf`);
}

