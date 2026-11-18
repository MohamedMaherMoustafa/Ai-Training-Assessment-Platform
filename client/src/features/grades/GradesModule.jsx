import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { jsPDF } from "jspdf";
import { Download, FileText, Sparkles } from "lucide-react";
import { listResults } from "../../services/platformService";
import { useAuth } from "../../context/AuthContext";

/**
 * Renders the platform logo mark onto an offscreen canvas so jsPDF can embed
 * a crisp high-DPI logo matching the platform's sky -> indigo gradient theme.
 */
let cachedLogoDataUrl = null;
if (typeof window !== "undefined") {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = "/Logo.png";
  img.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 160;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, 160, 160);
      cachedLogoDataUrl = canvas.toDataURL("image/png");
    } catch {}
  };
}

function createPlatformLogoPng() {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, 160, 160);
  grad.addColorStop(0, "#0284c7");
  grad.addColorStop(1, "#4f46e5");

  // Rounded square badge
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

  // Inner specular highlight ring
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Graduation cap icon in white
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

  // Tassel
  ctx.strokeStyle = "#bae6fd";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(124, 66);
  ctx.lineTo(124, 104);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

export default function GradesModule({ mode = "admin", activeInstructorId = null }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listResults()
      .then((all) => {
        if (mode === "student") {
          setResults(
            all.filter(
              (r) =>
                r.studentId === user.uid &&
                (!activeInstructorId || r.instructorId === activeInstructorId)
            )
          );
        } else if (mode === "instructor") {
          setResults(all.filter((r) => r.instructorId === user.uid));
        } else {
          setResults(all);
        }
      })
      .finally(() => setLoading(false));
  }, [mode, user?.uid, activeInstructorId]);

  const getPoints = (r) =>
    r.points !== undefined
      ? Number(r.points) || 0
      : Math.round(((Number(r.score) || 0) / 100) * (Number(r.total) || 1));

  const exportCsv = () => {
    const header = "Student,Quiz,Points,TotalQuestions,Percentage,SubmittedAt\n";
    const rows = results
      .map((r) => {
        const pts = getPoints(r);
        const tot = Number(r.total) || pts || 1;
        return `"${r.studentName || r.studentId}","${r.quizTitle || r.quizId}",${pts},${tot},${r.score}%,"${new Date(
          r.submittedAt || 0
        ).toISOString()}"`;
      })
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grades_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const logoPng = createPlatformLogoPng();

    const total = results.length;
    const totalPts = results.reduce((s, r) => s + getPoints(r), 0);
    const avgPts = total > 0 ? (totalPts / total).toFixed(1) : "0";
    const passed = results.filter((r) => (Number(r.score) || 0) >= 60).length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const highestPts = total > 0 ? Math.max(...results.map((r) => getPoints(r))) : 0;

    const drawHeader = () => {
      // Deep navy banner matching platform theme
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 34, "F");
      // Sky accent bar
      doc.setFillColor(2, 132, 199);
      doc.rect(0, 34, pageW, 1.8, "F");

      // Platform logo
      doc.addImage(logoPng, "PNG", 14, 6, 21, 21);

      // Platform Name & Report Title
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("Athar Educational Platform", 40, 14.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(186, 230, 253);
      doc.text("Official Assessment & Progress Report", 40, 21);

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Generated: ${new Date().toLocaleString()}  |  Scope: ${mode.toUpperCase()}`,
        40,
        27.5
      );
    };

    const drawFooter = (pageNum, totalPages) => {
      doc.setDrawColor(203, 213, 225);
      doc.line(14, pageH - 13, pageW - 14, pageH - 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        "Athar Educational Platform — Technical Education & Platform AI",
        14,
        pageH - 7.5
      );
      doc.text(`Page ${pageNum} of ${totalPages}`, pageW - 14, pageH - 7.5, { align: "right" });
    };

    drawHeader();

    // Executive KPI Summary Cards
    const kpis = [
      { label: "Total Attempts", value: String(total), sub: "Recorded records", accent: [2, 132, 199] },
      { label: "Total Points", value: `${totalPts} pts`, sub: "Aggregated score", accent: [79, 70, 229] },
      { label: "Avg / Quiz", value: `${avgPts} pts`, sub: `${passRate}% pass rate`, accent: [16, 185, 129] },
      { label: "Highest Points", value: `${highestPts} pts`, sub: "Top recorded mark", accent: [245, 158, 11] },
    ];
    const cardW = (pageW - 28 - 9) / 4;
    kpis.forEach((k, i) => {
      const x = 14 + i * (cardW + 3);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(218, 226, 237);
      doc.roundedRect(x, 42, cardW, 22, 2.5, 2.5, "FD");
      doc.setFillColor(...k.accent);
      doc.rect(x, 42, cardW, 2.4, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.2);
      doc.setTextColor(100, 116, 139);
      doc.text(k.label.toUpperCase(), x + 3.8, 49.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(15, 23, 42);
      doc.text(k.value, x + 3.8, 56.5);

      doc.setDrawColor(241, 245, 249);
      doc.line(x + 3.5, 58.5, x + cardW - 3.5, 58.5);

      if (k.sub) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);
        doc.setTextColor(100, 116, 139);
        doc.text(k.sub, x + 3.8, 62);
      }
    });

    // Section Title
    let y = 72;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Student Assessment Breakdown & AI Study Feedback", 14, y);
    y += 5;

    // Table Header
    const drawTableHeader = (posY) => {
      doc.setFillColor(15, 23, 42);
      doc.rect(14, posY, pageW - 28, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.2);
      doc.setTextColor(255, 255, 255);
      doc.text("#", 17, posY + 5.4);
      doc.text("Student", 25, posY + 5.4);
      doc.text("Quiz / Assessment", 74, posY + 5.4);
      doc.text("Date", 132, posY + 5.4);
      doc.text("Score", 168, posY + 5.4);
      doc.text("Status", 184, posY + 5.4);
      return posY + 8;
    };

    y = drawTableHeader(y);

    results.forEach((r, idx) => {
      const scoreNum = Number(r.score) || 0;
      const isPass = scoreNum >= 60;
      const feedbackText = (r.aiFeedback || "").replace(/[^\x20-\x7E\n]/g, "").trim();
      const feedbackLines = feedbackText
        ? doc.splitTextToSize(`Platform AI Feedback: ${feedbackText}`, pageW - 40)
        : [];
      const rowH = 9 + (feedbackLines.length > 0 ? feedbackLines.length * 4 + 4 : 0);

      if (y + rowH > pageH - 18) {
        doc.addPage();
        drawHeader();
        y = drawTableHeader(42);
      }

      // Alternating row fill
      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, y, pageW - 28, rowH, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.3);
      doc.setTextColor(71, 85, 105);
      doc.text(String(idx + 1), 17, y + 6);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(String(r.studentName || r.studentId).slice(0, 24), 25, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(String(r.quizTitle || r.quizId).slice(0, 28), 74, y + 6);

      const dateStr = r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : "—";
      doc.text(dateStr, 132, y + 6);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(isPass ? 5 : 190, isPass ? 150 : 18, isPass ? 105 : 60);
      const rowPts = getPoints(r);
      const rowTot = Number(r.total) || rowPts || 1;
      doc.text(`${rowPts}/${rowTot} pts`, 164, y + 6);

      // Status Pill
      doc.setFillColor(isPass ? 220 : 255, isPass ? 252 : 228, isPass ? 231 : 230);
      doc.roundedRect(182, y + 2.2, 13, 5, 1.5, 1.5, "F");
      doc.setFontSize(6.8);
      doc.text(isPass ? "PASS" : "REVIEW", 188.5, y + 5.7, { align: "center" });

      if (feedbackLines.length > 0) {
        doc.setFillColor(239, 246, 255);
        doc.rect(20, y + 9, pageW - 38, feedbackLines.length * 4 + 2.5, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.6);
        doc.setTextColor(30, 64, 175);
        doc.text(feedbackLines, 22, y + 13);
      }

      y += rowH;
    });

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p += 1) {
      doc.setPage(p);
      drawFooter(p, totalPages);
    }

    doc.save("Athar_Educational_Platform_Report.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[26px] p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black">
              {mode === "student" ? t("nav.myResults") : t("nav.grades")}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Scores in points (pts) and Platform AI learner study feedback.
            </p>
          </div>
        </div>
        {results.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              className="glass-btn-secondary flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold"
            >
              <Download className="h-4 w-4 text-sky-600" />
              {t("quizzes.exportCsv")}
            </button>
            <button
              onClick={exportPdf}
              className="glass-btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs"
            >
              <FileText className="h-4 w-4" />
              Export Branded PDF
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-slate-500 py-8 text-center">{t("app.loading")}</div>
      ) : results.length === 0 ? (
        <div className="glass-card p-8 text-center text-sm text-slate-500">
          {t("app.noData")}
        </div>
      ) : (
        <div className="space-y-3.5">
          {results.map((r) => (
            <div
              key={r.id}
              className="glass-card p-5 rounded-[22px] space-y-3.5 hover:shadow-md transition-all text-start"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
                <div className="space-y-1 min-w-0">
                  <div className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                    {r.quizTitle || r.quizId}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {r.studentName || r.studentId}
                    </span>
                    <span>·</span>
                    <span className="font-mono">
                      {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>
                <div className="self-start sm:self-auto shrink-0">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs ${
                      r.score >= 60
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"
                    }`}
                  >
                    <span className="font-mono text-sm">{getPoints(r)}</span>
                    <span className="text-[10px] opacity-75">/ {r.total || getPoints(r) || 1} pts</span>
                    <span className="text-[11px] font-bold">({r.score}%)</span>
                  </span>
                </div>
              </div>

              {r.aiFeedback && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/5 to-transparent border border-sky-300/40 dark:border-sky-700/40 text-xs text-sky-950 dark:text-sky-200 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="font-extrabold text-sky-950 dark:text-sky-200 flex items-center gap-1.5">
                      <span>{t("quizzes.aiFeedback")}</span>
                      <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-sky-600 text-white">
                        AI Coach
                      </span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-line text-start">
                      {r.aiFeedback}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
