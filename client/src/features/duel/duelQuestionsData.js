// Multi-Topic 1v1 Duel Question Bank for Live Fast Race
export const DUEL_QUESTIONS_BANK = [
  {
    id: "dq_1",
    text: {
      ar: "ما هي وحدة المعالجة المركزية المسؤولة عن معالجة وتنفيذ الأوامر في الحاسوب؟",
      en: "Which component is responsible for executing instructions in a computer?",
    },
    options: [
      { id: "a", text: "CPU", isCorrect: true },
      { id: "b", text: "RAM", isCorrect: false },
      { id: "c", text: "GPU", isCorrect: false },
      { id: "d", text: "ROM", isCorrect: false },
    ],
  },
  {
    id: "dq_2",
    text: {
      ar: "في لغات البرمجة، ما هو نوع البيانات المستخدم لتخزين القيم المنطقية (True أو False)؟",
      en: "In programming, which data type stores true or false values?",
    },
    options: [
      { id: "a", text: "Boolean", isCorrect: true },
      { id: "b", text: "Integer", isCorrect: false },
      { id: "c", text: "String", isCorrect: false },
      { id: "d", text: "Float", isCorrect: false },
    ],
  },
  {
    id: "dq_3",
    text: {
      ar: "ما البروتوكول المستخدم لتصفح صفحات الويب بشكل مشفر وآمن؟",
      en: "Which protocol is used for encrypted and secure web browsing?",
    },
    options: [
      { id: "a", text: "HTTPS", isCorrect: true },
      { id: "b", text: "HTTP", isCorrect: false },
      { id: "c", text: "FTP", isCorrect: false },
      { id: "d", text: "SMTP", isCorrect: false },
    ],
  },
  {
    id: "dq_4",
    text: {
      ar: "ماذا يُطلق على عملية البحث عن الأخطاء البرمجية وإصلاحها؟",
      en: "What is the process of finding and fixing programming bugs called?",
    },
    options: [
      { id: "a", text: "Debugging", isCorrect: true },
      { id: "b", text: "Compiling", isCorrect: false },
      { id: "c", text: "Rendering", isCorrect: false },
      { id: "d", text: "Deploying", isCorrect: false },
    ],
  },
  {
    id: "dq_5",
    text: {
      ar: "ما هو الاختصار الشائع لـ (الذكاء الاصطناعي) باللغة الإنجليزية؟",
      en: "What is the standard abbreviation for Artificial Intelligence?",
    },
    options: [
      { id: "a", text: "AI", isCorrect: true },
      { id: "b", text: "UI", isCorrect: false },
      { id: "c", text: "API", isCorrect: false },
      { id: "d", text: "CI", isCorrect: false },
    ],
  },
  {
    id: "dq_6",
    text: {
      ar: "أي مما يلي يُعد هيكل بيانات يعمل بمبدأ FIFO (الأول دخولاً الأول خروجاً)؟",
      en: "Which data structure operates on a FIFO (First-In, First-Out) basis?",
    },
    options: [
      { id: "a", text: "Queue", isCorrect: true },
      { id: "b", text: "Stack", isCorrect: false },
      { id: "c", text: "Tree", isCorrect: false },
      { id: "d", text: "Graph", isCorrect: false },
    ],
  },
  {
    id: "dq_7",
    text: {
      ar: "ما هي لغة تنسيق وتصميم صفحات الويب وتحديد ألوانها وخطوطها؟",
      en: "Which styling language is used to style and layout web pages?",
    },
    options: [
      { id: "a", text: "CSS", isCorrect: true },
      { id: "b", text: "HTML", isCorrect: false },
      { id: "c", text: "SQL", isCorrect: false },
      { id: "d", text: "PHP", isCorrect: false },
    ],
  },
  {
    id: "dq_8",
    text: {
      ar: "ما هو ناتج العملية المنطقية: NOT (False AND True)؟",
      en: "What is the boolean result of: NOT (False AND True)?",
    },
    options: [
      { id: "a", text: "True", isCorrect: true },
      { id: "b", text: "False", isCorrect: false },
      { id: "c", text: "Null", isCorrect: false },
      { id: "d", text: "Undefined", isCorrect: false },
    ],
  },
  {
    id: "dq_9",
    text: {
      ar: "أي وحدة قياس تساوي 1024 ميجابايت (MB)؟",
      en: "Which unit of digital storage equals 1024 Megabytes (MB)?",
    },
    options: [
      { id: "a", text: "1 Gigabyte (GB)", isCorrect: true },
      { id: "b", text: "1 Terabyte (TB)", isCorrect: false },
      { id: "c", text: "1 Kilobyte (KB)", isCorrect: false },
      { id: "d", text: "1 Petabyte (PB)", isCorrect: false },
    ],
  },
  {
    id: "dq_10",
    text: {
      ar: "ما هو نظام إدارة الإصدارات الشهير لتتبع التغييرات في الكود البرمجي؟",
      en: "Which popular version control system tracks code changes?",
    },
    options: [
      { id: "a", text: "Git", isCorrect: true },
      { id: "b", text: "Docker", isCorrect: false },
      { id: "c", text: "Linux", isCorrect: false },
      { id: "d", text: "Apache", isCorrect: false },
    ],
  },
];

export function getRandomDuelQuestions(count = 5) {
  const shuffled = [...DUEL_QUESTIONS_BANK].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
