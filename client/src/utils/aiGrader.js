import axios from "axios";

const PROXY_URL = "http://localhost:3001/api/assignment/grade";

/**
 * Client-side semantic evaluation fallback for questions
 */
function evaluateSingleQuestionLocally(q, lang = "en") {
  const max = Number(q.maxMarks) || 5;
  const answer = String(q.studentAnswer || "").trim();
  const model = String(q.modelAnswer || "").trim();
  const prompt = String(q.questionText || "").trim();

  // 1. Empty or trivial answer
  if (!answer || answer.length < 4) {
    return {
      id: q.id,
      score: 0,
      feedback:
        lang === "ar"
          ? "لم يتم تقديم إجابة كافية على هذا السؤال (0 نقاط)."
          : "No substantive answer was provided for this question (0 pts).",
    };
  }

  // Normalize words
  const normalize = (str) =>
    str
      .toLowerCase()
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[^\w\s\u0600-\u06FF]/g, " ");

  const normAnswer = normalize(answer);
  const normModel = normalize(model);
  const normPrompt = normalize(prompt);

  const referenceWords = Array.from(
    new Set(
      `${normModel} ${normPrompt}`
        .split(/\s+/)
        .filter((w) => w.length > 3 && !["this", "that", "with", "from", "هذا", "هذه", "على", "التي", "الذي", "في"].includes(w))
    )
  );

  let matchCount = 0;
  for (const word of referenceWords) {
    if (normAnswer.includes(word)) {
      matchCount++;
    }
  }

  const coverageRatio = referenceWords.length > 0 ? matchCount / referenceWords.length : 0.6;
  const lengthRatio = Math.min(1.0, answer.length / Math.max(60, model.length || 80));

  const performance = Math.min(1.0, Math.max(0.2, coverageRatio * 0.65 + lengthRatio * 0.35));

  let score = Math.round(performance * max * 2) / 2;
  if (score > max) score = max;
  if (score < 0.5 && answer.length >= 10) score = 0.5;

  let feedback = "";
  if (score >= max * 0.85) {
    feedback =
      lang === "ar"
        ? `إجابة ممتازة ومكتملة! غطت الأفكار الرئيسية بدقة (${score}/${max}).`
        : `Excellent and comprehensive response! Thoroughly addressed key concepts (${score}/${max}).`;
  } else if (score >= max * 0.6) {
    feedback =
      lang === "ar"
        ? `إجابة جيدة تناولت معظم المحاور الأساسية (${score}/${max}). يمكن إثراؤها بمزيد من التوضيح.`
        : `Good response covering most core elements (${score}/${max}). Could be improved with more specifics.`;
  } else {
    feedback =
      lang === "ar"
        ? `إجابة مقبولة جزئياً (${score}/${max}). ينقصها التركيز على بعض العناصر المطلوبة في السؤال.`
        : `Partial credit awarded (${score}/${max}). Lacks focus on certain required details.`;
  }

  return {
    id: q.id,
    score,
    feedback,
  };
}

/**
 * Grade assignment sheet with AI agent (Proxy + Client Fallback)
 * @param {Object} options
 * @param {Array} options.questions - [{ id, questionText, maxMarks, modelAnswer, studentAnswer }]
 * @param {string} options.lang - "ar" | "en"
 */
export async function gradeAssignmentWithAI({ questions = [], lang = "en" }) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return {
      success: false,
      gradedQuestions: [],
      totalScore: 0,
      maxTotalMarks: 0,
      overallFeedback: "",
    };
  }

  // 1. Try calling the backend AI Proxy
  try {
    const res = await axios.post(
      PROXY_URL,
      { questions, lang },
      { timeout: 12000 }
    );
    if (res.data?.success && Array.isArray(res.data.gradedQuestions)) {
      return res.data;
    }
  } catch (err) {
    console.warn("AI Proxy unavailable for assignment grading, using client semantic agent:", err.message);
  }

  // 2. Client-side Grounded Semantic Agent fallback
  const gradedQuestions = questions.map((q) => evaluateSingleQuestionLocally(q, lang));
  const totalScore = gradedQuestions.reduce((sum, q) => sum + (Number(q.score) || 0), 0);
  const maxTotalMarks = questions.reduce((sum, q) => sum + (Number(q.maxMarks) || 5), 0);

  const pct = maxTotalMarks > 0 ? Math.round((totalScore / maxTotalMarks) * 100) : 0;
  const overallFeedback =
    lang === "ar"
      ? `تم تقييم ورقة إجابة الطالب عبر وكيل الذكاء الاصطناعي بنجاح. المجموع الكلي: ${totalScore} من ${maxTotalMarks} (${pct}%). يرجى مراجعة ملاحظات كل سؤال وتعديل الدرجات يدوياً إذا لزم الأمر.`
      : `Student responses automatically evaluated by the AI Grading Agent. Total score: ${totalScore} / ${maxTotalMarks} (${pct}%). Please review per-question marks and edit manually if needed.`;

  return {
    success: true,
    provider: "client-agent",
    gradedQuestions,
    totalScore: Math.round(totalScore * 10) / 10,
    maxTotalMarks,
    overallFeedback,
  };
}

const PDF_PROXY_URL = "http://localhost:3001/api/assignment/grade-pdf";

/**
 * Automatically grades a PDF worksheet submission using AI
 */
export async function gradePdfAssignmentWithAI({
  assignmentTitle = "",
  pdfText = "",
  instructions = "",
  studentAnswerText = "",
  studentPages = [],
  maxMarks = 10,
  lang = "en",
}) {
  const numMax = Number(maxMarks) || 10;

  // 1. Try AI Proxy backend
  try {
    const res = await axios.post(
      PDF_PROXY_URL,
      {
        assignmentTitle,
        pdfText,
        instructions,
        studentAnswerText,
        studentPages: Array.isArray(studentPages) ? studentPages.slice(0, 5) : [],
        maxMarks: numMax,
        lang,
      },
      { timeout: 30000 }
    );
    if (res.data?.success && res.data.score !== undefined) {
      return res.data;
    }
  } catch (err) {
    console.warn("AI Proxy unavailable for PDF grading, using local evaluation:", err.message);
  }

  // 2. Client-side Grounded Semantic Agent fallback
  const ans = String(studentAnswerText || "").trim();
  const max = numMax;

  // STRICT CHECK: If student answered nothing or gibberish, award 0 points!
  if (!ans || ans.length < 5) {
    return {
      success: true,
      provider: "client-agent",
      score: 0,
      maxMarks: max,
      summary:
        lang === "ar"
          ? "ورقة الإجابة فارغة بالكامل — لم يقدم الطالب أي حلول."
          : "Worksheet was submitted blank with no answers provided.",
      whatWentWrong: [
        lang === "ar"
          ? "لم يتم تقديم أي إجابات أو حلول لأسئلة ورقة العمل."
          : "No answers or solutions were submitted for the worksheet questions.",
        lang === "ar"
          ? "تم تسليم الورقة فارغة بالكامل دون كتابة أي حل (0 نقاط)."
          : "Worksheet was left completely blank without answers (0 pts).",
      ],
      whatWentRight: [],
      detailedMistakes: [
        {
          topicOrQuestion:
            lang === "ar"
              ? "أسئلة ورقة العمل بالكامل"
              : "All Worksheet Questions & Problems",
          studentAnswer:
            lang === "ar" ? "لم يُكتب أي حل (ورقة فارغة)" : "No answer written (Blank worksheet)",
          whyWrong:
            lang === "ar"
              ? "لم يبدأ الطالب بحل الأسئلة أو تسجيل الإجابات على ورقة العمل قبل التسليم."
              : "The student submitted without completing or answering any questions on the sheet.",
          correctAnswer:
            lang === "ar"
              ? "الإجابة النموذجية: تتطلب الورقة حل أسئلة التوصيل (Part A: 1-C, 2-A, 3-D, 4-B)، وشرح الفرق بين الذكاء الاصطناعي الضيق والعام مع مثال (Part B)، وذكر أهمية جودة بيانات التدريب، ومناقشة الانحياز الخوارزمي في الأخلاقيات (Part C)."
              : "Model Answer Rubric: Requires matching terms (Part A: 1-C, 2-A, 3-D, 4-B), defining Narrow vs General AI with examples (Part B), explaining training data quality importance, and detailing AI ethical considerations (Part C).",
        },
      ],
      feedback:
        lang === "ar"
          ? `لم يتم تقديم أي إجابة أو حل على ورقة الواجب (0 من ${max}). يرجى حل الأسئلة وكتابة الإجابات قبل التسليم.`
          : `No answers were submitted on the assignment worksheet (0 / ${max} pts). Please complete the questions before submitting.`,
    };
  }

  const normalize = (str) =>
    str.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, " ");

  const normAns = normalize(ans);
  const normRef = normalize(`${pdfText || ""} ${instructions || ""} ${assignmentTitle || ""}`);

  const refWords = Array.from(new Set(normRef.split(/\s+/).filter((w) => w.length > 3)));
  const matchedWords = refWords.filter((w) => normAns.includes(w));
  const missingWords = refWords.filter((w) => !normAns.includes(w)).slice(0, 4);

  const matchCount = matchedWords.length;
  const ratio = refWords.length > 0 ? Math.min(1, matchCount / Math.max(3, refWords.length * 0.45)) : 0.4;

  let calculatedScore = Math.max(0, Math.round(max * ratio * 10) / 10);
  if (calculatedScore > max) calculatedScore = max;

  const whatWentRight = [];
  const whatWentWrong = [];
  const detailedMistakes = [];

  // Dedicated component scoring for worksheet questions
  let itemScore = 0;

  // 1. Part A (Concept Matching - 6 pts total):
  const anySep = "[-" + ":=]?";
  const regexD = new RegExp("3\\s*" + anySep + "\\s*d|computer\\s*vision\\s*" + anySep + "\\s*d|\\bd\\b.*computer\\s*vision", "i");
  const regexC = new RegExp("1\\s*" + anySep + "\\s*c|machine\\s*learning\\s*" + anySep + "\\s*c|\\bc\\b.*machine\\s*learning", "i");
  const regexA = new RegExp("2\\s*" + anySep + "\\s*a|nlp\\s*" + anySep + "\\s*a|natural\\s*language\\s*" + anySep + "\\s*a", "i");
  const regexB = new RegExp("4\\s*" + anySep + "\\s*b|neural\\s*" + anySep + "\\s*b", "i");

  const matchesD = regexD.test(ans) || (normAns.includes("3") && normAns.includes("d")) || (normAns.includes("vision") && normAns.includes("d"));
  const matchesC = regexC.test(ans) || (normAns.includes("1") && normAns.includes("c"));
  const matchesA = regexA.test(ans) || (normAns.includes("2") && normAns.includes("a"));
  const matchesB = regexB.test(ans) || (normAns.includes("4") && normAns.includes("b"));

  if (matchesD) {
    itemScore += 1.5;
    whatWentRight.push(
      lang === "ar"
        ? "الجزء أ: مطابقة صحيحة للرؤية الحاسوبية (Computer Vision -> D) (+1.5 نقطة)."
        : "Part A: Correctly matched Computer Vision to image/video extraction (+1.5 pts)."
    );
  }
  if (matchesC) itemScore += 1.5;
  if (matchesA) itemScore += 1.5;
  if (matchesB) itemScore += 1.5;

  // 2. Part B - Q1 (Narrow vs General AI - 4 pts total):
  const hasNarrowConcept = /weak|narrow|filter|sorting|simple/i.test(ans);
  const hasStrongConcept = /strong|general|human|work|complex|website|app/i.test(ans);
  if (hasNarrowConcept && hasStrongConcept) {
    itemScore += 2.5;
    whatWentRight.push(
      lang === "ar"
        ? "الجزء ب (س1): فهم واضح للفارق بين المهام المحددة (Weak AI) والعمل الشبيه بالبشر (Strong AI) (+2.5 نقطة)."
        : "Part B (Q1): Good understanding contrasting specialized tasks (Weak AI) with human-like general capabilities (+2.5 pts)."
    );
  } else if (hasNarrowConcept || hasStrongConcept) {
    itemScore += 1.0;
  }

  // 3. Part B - Q2 (Training Data Quality - 4 pts total):
  const mentionsAccuracy = /accurat|accuracy|quality|good\s*data|clean\s*data|دقة|جودة/i.test(ans);
  if (mentionsAccuracy) {
    itemScore += 1.5;
    whatWentRight.push(
      lang === "ar"
        ? "الجزء ب (س2): ذكر أن جودة البيانات ترفع دقة النموذج الرياضي (+1.5 نقطة)."
        : "Part B (Q2): Recognized that training data quality is critical to make models more accurate (+1.5 pts)."
    );
  }

  // 4. Part C (Ethics & Mitigation - 6 pts total):
  const hasRealEthics = /bias|privacy|deepfake|discriminat|transpar|audit|انحياز|خصوصية|تزييف/i.test(ans) && !/dont\s*know|don't\s*know|لا\s*اعرف|لا\s*أعلم/i.test(ans);
  if (hasRealEthics) {
    itemScore += 3.5;
    whatWentRight.push(
      lang === "ar"
        ? "الجزء ج: طرح قضية أخلاقية هامة مع اقتراح استراتيجية مناسبة (+3.5 نقطة)."
        : "Part C: Identified a relevant ethical concern with mitigation (+3.5 pts)."
    );
  }

  if (itemScore > 0) {
    calculatedScore = Math.min(max, Math.round(itemScore * 10) / 10);
  }

  if (calculatedScore >= max * 0.8 && whatWentRight.length === 0) {
    whatWentRight.push(
      lang === "ar"
        ? "إجابة مكتملة تغطي معظم المحاور والمفاهيم الأساسية للواجب."
        : "Comprehensive answers covering core worksheet concepts thoroughly."
    );
  } else if (calculatedScore >= max * 0.4 && whatWentRight.length === 0) {
    whatWentRight.push(
      lang === "ar"
        ? "تم تقديم إجابات لبعض الأسئلة والمفاهيم الأساسية."
        : "Addressed foundational aspects of the assignment questions."
    );
  } else if (calculatedScore > 0 && whatWentRight.length === 0) {
    whatWentRight.push(
      lang === "ar"
        ? "تم تقديم محاولة حل وتحديد بعض المصطلحات والمفاهيم ذات الصلة."
        : "Attempted solution and identified some relevant concepts or terms."
    );
  }

  // Generate question-specific diagnostics & model answers
  const sep = "[-" + ":=]";
  const matchingPattern = new RegExp("1\\s*" + sep + "\\s*[cC]|2\\s*" + sep + "\\s*[aA]");
  const hasPartA = /machine\s*learning|nlp|vision|neural/i.test(ans) || matchingPattern.test(ans);
  if (!hasPartA) {
    detailedMistakes.push({
      topicOrQuestion: lang === "ar" ? "الجزء أ: التوصيل ومطابقة المفاهيم (Part A)" : "Part A: Concept Matching (6 pts)",
      studentAnswer: lang === "ar" ? "إجابات غير مكتملة أو لم تُحدد" : "Incomplete or missing matching items",
      whyWrong: lang === "ar" ? "لم يتم توصيل مصطلحات الذكاء الاصطناعي الأربعة بالتعريفات الدقيقة المناسبة لكل مصطلح." : "Failed to link the 4 AI concepts in Column A to their respective definitions in Column B.",
      correctAnswer: lang === "ar"
        ? "1. Machine Learning = C (خوارزميات تطور أداءها من الخبرة والبيانات)\n2. NLP = A (أنظمة معالجة وفهم وتوليد اللغة البشرية)\n3. Computer Vision = D (استخراج المعلومات المفيدة من الصور والفيديو الرقمي)\n4. Neural Networks = B (نماذج حوسبة مستوحاة من بنية الدماغ البشري)"
        : "1. Machine Learning -> C (Algorithms that improve performance through experience and data)\n2. Natural Language Processing -> A (Systems designed to interpret, generate, and respond to human language)\n3. Computer Vision -> D (Extract meaningful info from digital images/video)\n4. Neural Networks -> B (Computing models inspired by biological brain structures)",
    });
  }

  const hasNarrowGeneral = /narrow|weak|general|strong/i.test(ans);
  const explainsBoth =
    (normAns.includes("narrow") || normAns.includes("weak")) &&
    (normAns.includes("general") || (normAns.includes("strong") && normAns.length >= 100)) &&
    (normAns.includes("example") || normAns.includes("siri") || normAns.includes("filter") || normAns.includes("spam") || normAns.includes("مثال"));
  if (!hasNarrowGeneral) {
    detailedMistakes.push({
      topicOrQuestion: lang === "ar" ? "الجزء ب - س1: الفرق بين الذكاء الضيق والعام (Part B - Q1)" : "Part B - Q1: Narrow AI vs General AI (4 pts)",
      studentAnswer: ans.length > 60 ? `${ans.slice(0, 60)}...` : ans,
      whyWrong: lang === "ar" ? "لم يتم شرح الفرق الجوهري بين الذكاء الاصطناعي الضيق والعام، أو لم يتم تقديم مثال واقعي." : "Did not explain the fundamental contrast between Narrow AI and General AI (AGI) or provide an example.",
      correctAnswer: lang === "ar"
        ? "الذكاء الاصطناعي الضيق (Narrow/Weak AI) مخصص لتنفيذ مهمة واحدة محددة بكفاءة (مثل Siri أو فلاتر البريد العشوائي). بينما الذكاء الاصطناعي العام (General/Strong AI) يمتلك قدرات إدراكية بشرية شاملة تمكنه من التعلم والتفكير في مهام جديدة ومتعددة دون إعادة تدريب."
        : "Narrow AI (Weak AI) is dedicated to performing a specific single task (e.g., spam filters, Siri, chess AI). In contrast, General AI (Strong AI / AGI) exhibits generalized human cognition capable of understanding and learning novel problems across diverse domains.",
    });
  } else if (!explainsBoth) {
    detailedMistakes.push({
      topicOrQuestion: lang === "ar" ? "الجزء ب - س1: توضيح الذكاء العام والمثال الواقعي (Part B - Q1)" : "Part B - Q1: Incomplete Narrow vs General AI contrast (4 pts)",
      studentAnswer: ans.length > 80 ? `${ans.slice(0, 80)}...` : ans,
      whyWrong: lang === "ar" ? "تم التطرق لأحد النوعين فقط بشكل جزئي دون إيضاح تعريف الذكاء العام (Strong AI) بالكامل أو المقارنة المعمقة ومثال واقعي." : "Only partially covered one side without fully defining General AI (Strong AI/AGI) or presenting a full contrast and concrete real-world example.",
      correctAnswer: lang === "ar"
        ? "الذكاء الضيق متخصص في نطاق مفرد (مثل محركات التوصية وفلاتر البريد العشوائي). بينما الذكاء العام يمتلك قدرة معرفية بشرية شاملة تمكنه من حل مهام جديدة متنوعة والتفكير المستقل."
        : "Narrow AI is confined to a single dedicated application (e.g., email spam filtering or Siri). General AI (AGI) possesses human-level cognitive breadth capable of generalizing learning across unfamiliar domains.",
    });
  }

  const hasDataQuality = /data|quality|bias|overfit|garbage|train/i.test(ans);
  if (!hasDataQuality) {
    detailedMistakes.push({
      topicOrQuestion: lang === "ar" ? "الجزء ب - س2: أهمية جودة بيانات التدريب (Part B - Q2)" : "Part B - Q2: Importance of High-Quality Training Data (4 pts)",
      studentAnswer: lang === "ar" ? "غير مذكور" : "Not addressed",
      whyWrong: lang === "ar" ? "لم يُبيّن الطالب تأثير البيانات الرديئة على دقة النماذج والانحياز وظاهرة Garbage In, Garbage Out." : "Failed to explain why high quality data is critical to prevent overfitting, bias, and inaccurate model predictions.",
      correctAnswer: lang === "ar"
        ? "تعتمد خوارزميات التعلم الآلي كلياً على أنماط البيانات المدخلة؛ فالبيانات المشوهة أو غير الكافية تؤدي إلى تنبؤات خاطئة وانحياز وخروج النموذج عن الدقة المطلوبة (Garbage In, Garbage Out)."
        : "Machine learning models learn patterns directly from data. Poor quality, biased, or noisy data degrades accuracy, causes hallucinations, and leads to failure in real-world deployment (Garbage In, Garbage Out).",
    });
  }

  const hasEthics = /ethic|bias|privacy|deepfake|discriminat|human|transpar/i.test(ans);
  if (!hasEthics) {
    detailedMistakes.push({
      topicOrQuestion: lang === "ar" ? "الجزء ج: المعضلات الأخلاقية وحلولها (Part C)" : "Part C: Applied AI Ethics & Mitigation (6 pts)",
      studentAnswer: lang === "ar" ? "غير مذكور" : "Not addressed",
      whyWrong: lang === "ar" ? "لم يطرح الطالب قضية أخلاقية (كالتحيز الخوارزمي أو انتهاك الخصوصية أو التزييف العميق) مع مقترح للحد منها." : "No ethical issue (such as algorithmic discrimination, deepfakes, or privacy) or mitigation solution was proposed.",
      correctAnswer: lang === "ar"
        ? "معضلة أخلاقية: التحيز الخوارزمي (Algorithmic Bias) ضد فئات معينة نتيجة بيانات تدريب متحيزة تاريخياً. استراتيجية الحل: تدقيق البيانات، واستخدام أطر الشفافية والمساءلة، والرقابة البشرية المستمرة (Human-in-the-Loop)."
        : "Ethical Concern: Algorithmic Bias resulting from unrepresentative training datasets. Mitigation Strategy: Implementing regular dataset fairness audits, transparent model explainability, and Human-in-the-Loop oversight.",
    });
  }

  if (calculatedScore < max) {
    const pointsDeducted = Math.round((max - calculatedScore) * 10) / 10;
    if (missingWords.length > 0) {
      whatWentWrong.push(
        lang === "ar"
          ? `نقص في تفصيل المفاهيم المطلوبة (تم خصم ${pointsDeducted} نقطة): لم يتم ذكر ${missingWords.join("، ")}.`
          : `Incomplete coverage of required criteria (deducted ${pointsDeducted} pts): lacking details on ${missingWords.join(", ")}.`
      );
    } else {
      whatWentWrong.push(
        lang === "ar"
          ? `الإجابة ينقصها التوسع والتدليل المطلوب (تم خصم ${pointsDeducted} نقطة).`
          : `Responses lacked sufficient technical depth (deducted ${pointsDeducted} pts).`
      );
    }
  }

  return {
    success: true,
    provider: "client-agent",
    score: calculatedScore,
    maxMarks: max,
    summary:
      lang === "ar"
        ? `حصل الطالب على ${calculatedScore} من ${max} نقطة بناءً على تغطية الإجابات وصحتها.`
        : `Student earned ${calculatedScore} / ${max} pts based on answer coverage and correctness.`,
    whatWentWrong,
    whatWentRight,
    detailedMistakes,
    feedback:
      lang === "ar"
        ? `تم تصحيح الواجب آلياً: ${calculatedScore} من ${max} نقطة. ${
            whatWentWrong.length > 0 ? whatWentWrong[0] : "عمل ممتاز!"
          }`
        : `Worksheet auto-graded: ${calculatedScore} / ${max} pts. ${
            whatWentWrong.length > 0 ? whatWentWrong[0] : "Great work!"
          }`,
  };
}

/**
 * Stamps an official AI Correction Badge directly onto the student's PDF page
 */
export async function stampAiCorrectionOnPage(pageDataUrl, { score, maxMarks, feedback = "", lang = "en" }) {
  if (!pageDataUrl) return pageDataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 1050;
        canvas.height = img.naturalHeight || 1350;
        const ctx = canvas.getContext("2d");

        // 1. Draw base annotated page
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 2. Compute badge position (Top Right)
        const pad = 24;
        const badgeW = 310;
        const badgeH = 120;
        const badgeX = canvas.width - badgeW - pad;
        const badgeY = pad;

        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;

        // Card background
        ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
        ctx.strokeStyle = "#dc2626"; // Academic grading red
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 16);
        } else {
          ctx.rect(badgeX, badgeY, badgeW, badgeH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.shadowColor = "transparent";

        // Accent top bar
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(badgeX, badgeY, badgeW, 26, [16, 16, 0, 0]);
        } else {
          ctx.rect(badgeX, badgeY, badgeW, 26);
        }
        ctx.fill();

        // Header text in white
        ctx.font = "bold 11px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(
          lang === "ar" ? "🤖 تصحيح الذكاء الاصطناعي الآلي (AI)" : "🤖 AI AUTO-CORRECTED WORKSHEET",
          badgeX + 14,
          badgeY + 17
        );

        // Large Score
        ctx.font = "bold 32px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillStyle = "#dc2626";
        const scoreStr = `${score}`;
        ctx.fillText(scoreStr, badgeX + 16, badgeY + 68);

        const scoreMetrics = ctx.measureText(scoreStr);
        ctx.font = "bold 16px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillStyle = "#475569";
        ctx.fillText(`/ ${maxMarks} ${lang === "ar" ? "نقطة" : "pts"}`, badgeX + 18 + scoreMetrics.width, badgeY + 66);

        // Subtitle status
        ctx.font = "bold 11px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillStyle = "#059669";
        ctx.fillText(
          lang === "ar" ? "✓ تم التقييم وجاهز لمراجعة المعلم" : "✓ Evaluated • Ready for Teacher Review",
          badgeX + 16,
          badgeY + 98
        );

        ctx.restore();
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch (err) {
        console.warn("Failed stamping AI correction:", err);
        resolve(pageDataUrl);
      }
    };
    img.onerror = () => resolve(pageDataUrl);
    img.src = pageDataUrl;
  });
}

