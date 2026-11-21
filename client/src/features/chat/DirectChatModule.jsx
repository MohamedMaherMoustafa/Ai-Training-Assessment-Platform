import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  MessageSquare,
  Send,
  Search,
  User,
  Users,
  Clock,
  Sparkles,
  Check,
  CheckCheck,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Smile,
  RefreshCw,
  GraduationCap,
  Circle,
  HelpCircle,
} from "lucide-react";
import {
  listUsers,
  listActiveInstructors,
  getDirectChatChannelId,
  subscribeDirectChatMessages,
  subscribeUserDirectChats,
  sendDirectChatMessage,
  markDirectChatRead,
} from "../../services/platformService";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { playClickSound } from "../../utils/soundEffects";

export default function DirectChatModule({
  mode = "instructor", // "instructor" | "student"
  activeInstructorId = null,
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lang } = useLang();

  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [chatMetadataList, setChatMetadataList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [sending, setSending] = useState(false);

  // On mobile: toggle between list view and chat room
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const textInputRef = useRef(null);

  // Quick suggestion chips
  const quickChips =
    mode === "student"
      ? lang === "ar"
        ? [
            "مرحباً يا دكتور 👋",
            "عندي استفسار عن الواجب",
            "متى موعد الجلسة القادمة؟",
            "شكراً جزيلاً لك!",
          ]
        : [
            "Hello Professor 👋",
            "I have a question about the assignment",
            "When is the next session?",
            "Thank you very much!",
          ]
      : lang === "ar"
      ? [
          "أهلاً بك! كيف أساعدك؟",
          "تم مراجعة الحل الخاص بك، ممتاز!",
          "راجع ملف الجلسة المسجلة ستجد الشرح بالتفصيل",
          "بالتوفيق، استمر في هذا المستوى 👍",
        ]
      : [
          "Hello! How can I help you?",
          "Your homework has been reviewed, great work!",
          "Please check the recorded session for a detailed walkthrough",
          "Best of luck, keep up the great effort 👍",
        ];

  // 1. Load contacts based on role
  useEffect(() => {
    let isMounted = true;
    setLoadingContacts(true);

    const fetchContacts = async () => {
      try {
        if (mode === "instructor") {
          // Instructors see all students linked to them
          const allStudents = await listUsers("student");
          const myStudents = allStudents.filter(
            (s) => Array.isArray(s.instructorIds) && s.instructorIds.includes(user?.uid)
          );
          if (isMounted) {
            setContacts(myStudents);
            if (myStudents.length > 0 && !selectedContact) {
              setSelectedContact(myStudents[0]);
            }
          }
        } else {
          // Students see their approved instructors
          const allInstructors = await listActiveInstructors();
          const approvedIds = user?.instructorIds || [];
          const myInstructors = allInstructors.filter((i) => approvedIds.includes(i.uid));
          if (isMounted) {
            setContacts(myInstructors);
            if (activeInstructorId) {
              const matched = myInstructors.find((i) => i.uid === activeInstructorId);
              if (matched) setSelectedContact(matched);
              else if (myInstructors.length > 0) setSelectedContact(myInstructors[0]);
            } else if (myInstructors.length > 0 && !selectedContact) {
              setSelectedContact(myInstructors[0]);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load chat contacts:", err);
      } finally {
        if (isMounted) setLoadingContacts(false);
      }
    };

    fetchContacts();
    return () => {
      isMounted = false;
    };
  }, [user?.uid, mode, activeInstructorId]);

  // 2. Subscribe to user conversation metadata (for unread badges & last message snippets)
  useEffect(() => {
    if (!user?.uid) return undefined;
    const unsub = subscribeUserDirectChats(user.uid, (list) => {
      setChatMetadataList(list);
    });
    return () => unsub && unsub();
  }, [user?.uid]);

  // 3. Subscribe in real-time to active channel messages
  useEffect(() => {
    if (!user?.uid || !selectedContact?.uid) {
      setMessages([]);
      return undefined;
    }

    const channelId = getDirectChatChannelId(user.uid, selectedContact.uid);

    // Mark conversation as read
    markDirectChatRead(channelId, mode);

    const unsub = subscribeDirectChatMessages(channelId, (incomingMessages) => {
      setMessages(incomingMessages);
      // If currently actively chatting in this channel, mark incoming messages as read
      markDirectChatRead(channelId, mode);
      // Auto-scroll to bottom on new messages
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });

    return () => unsub && unsub();
  }, [user?.uid, selectedContact?.uid, mode]);

  // Handle Send Message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend || !selectedContact || !user?.uid || sending) return;

    setSending(true);
    playClickSound();

    const channelId = getDirectChatChannelId(user.uid, selectedContact.uid);
    const myName = user?.displayName || user?.name?.[lang] || user?.username || "User";
    const recipientName =
      selectedContact.name?.[lang] ||
      selectedContact.displayName ||
      selectedContact.username ||
      "Participant";

    try {
      await sendDirectChatMessage({
        channelId,
        senderId: user.uid,
        senderName: myName,
        senderRole: mode,
        recipientId: selectedContact.uid,
        recipientName,
        text: textToSend,
      });

      setInputText("");
      setTimeout(() => {
        textInputRef.current?.focus();
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error(lang === "ar" ? "تعذر إرسال الرسالة" : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Helper to get unread count for a contact
  const getContactUnreadCount = (contactUid) => {
    const channelId = getDirectChatChannelId(user?.uid, contactUid);
    const match = chatMetadataList.find((c) => c.channelId === channelId);
    if (!match?.metadata) return 0;
    return mode === "instructor"
      ? match.metadata.unreadByInstructor || 0
      : match.metadata.unreadByStudent || 0;
  };

  // Helper to get last message for a contact
  const getContactLastMessage = (contactUid) => {
    const channelId = getDirectChatChannelId(user?.uid, contactUid);
    const match = chatMetadataList.find((c) => c.channelId === channelId);
    return match?.lastMessage || "";
  };

  // Filter contacts by search query
  const filteredContacts = contacts.filter((c) => {
    if (!searchQuery.trim()) return true;
    const nameStr = (c.displayName || c.name?.[lang] || c.username || "").toLowerCase();
    return nameStr.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[26px] p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/20">
        <div className="pointer-events-none absolute -top-10 -end-10 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white border border-white/25">
              <Sparkles className="h-3 w-3 text-cyan-300" />
              <span>
                {lang === "ar"
                  ? "محادثة فورية مشفرة ومباشرة"
                  : "Real-Time Direct Messaging Channel"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {mode === "instructor"
                ? lang === "ar"
                  ? "المحادثات المباشرة مع الطلاب"
                  : "Instructor Direct Student Messenger"
                : lang === "ar"
                ? "محادثة المحاضر المباشرة"
                : "Direct Chat with Your Instructor"}
            </h1>
            <p className="text-xs text-sky-100/90 font-medium max-w-xl">
              {mode === "instructor"
                ? lang === "ar"
                  ? "تواصل لحظياً مع طلابك، أجب على استفساراتهم وتابع تقدمهم الدراسي مباشرة بدون أي تأخير."
                  : "Communicate directly with your enrolled students, answer questions, and provide instant real-time guidance."
                : lang === "ar"
                ? "اطرح استفساراتك وتواصل مباشرة مع معلمك ومحاضرك في أي وقت مع إشعارات فورية."
                : "Ask questions, discuss lectures, and receive instant direct responses from your instructor."}
            </p>
          </div>
        </div>
      </div>

      {/* Main Two-Column Messenger Container */}
      <div className="glass-card overflow-hidden h-[620px] max-h-[78vh] flex rounded-[24px] border border-slate-200/80 dark:border-white/10 shadow-xl">
        {/* ============================================================== */}
        {/* LEFT COLUMN: CONTACTS LIST */}
        {/* ============================================================== */}
        <div
          className={`w-full md:w-80 shrink-0 border-e border-slate-200/80 dark:border-white/10 flex flex-col bg-white/60 dark:bg-slate-900/60 backdrop-blur-md ${
            mobileChatOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search Contacts Bar */}
          <div className="p-3.5 border-b border-slate-200/80 dark:border-white/10">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  mode === "instructor"
                    ? lang === "ar"
                      ? "بحث عن طالب..."
                      : "Search student..."
                    : lang === "ar"
                    ? "بحث عن محاضر..."
                    : "Search instructor..."
                }
                className="w-full ps-9 pe-3 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:text-white"
              />
            </div>
          </div>

          {/* Contacts Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {loadingContacts ? (
              <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                <span>{lang === "ar" ? "جاري تحميل جهات الاتصال..." : "Loading contacts..."}</span>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <Users className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p>
                  {mode === "instructor"
                    ? lang === "ar"
                      ? "لا يوجد طلاب مسجلون حالياً"
                      : "No students registered yet"
                    : lang === "ar"
                    ? "لا يوجد محاضرون متاحون"
                    : "No instructors available"}
                </p>
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = selectedContact?.uid === contact.uid;
                const unreadCount = getContactUnreadCount(contact.uid);
                const lastMsg = getContactLastMessage(contact.uid);
                const contactName =
                  contact.name?.[lang] || contact.displayName || contact.username || "User";

                return (
                  <button
                    key={contact.uid}
                    type="button"
                    onClick={() => {
                      setSelectedContact(contact);
                      setMobileChatOpen(true);
                    }}
                    className={`w-full p-3.5 text-start flex items-center gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/40 border-s-4 border-indigo-600"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    {/* Avatar with Status Dot */}
                    <div className="relative shrink-0">
                      <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shadow-md">
                        {contactName.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm" />
                    </div>

                    {/* Contact Info & Last Message Snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {contactName}
                        </span>
                        {unreadCount > 0 && (
                          <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shadow-md shadow-indigo-500/30">
                            {unreadCount}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {lastMsg ||
                          (mode === "instructor"
                            ? lang === "ar"
                              ? "طالب في مقرراتك"
                              : "Student in your classes"
                            : lang === "ar"
                            ? "محاضر المادة"
                            : "Course Instructor")}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: ACTIVE CHAT ROOM */}
        {/* ============================================================== */}
        <div
          className={`flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950/40 ${
            !mobileChatOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {selectedContact ? (
            <>
              {/* Chat Room Top Header */}
              <div className="px-4 py-3 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 backdrop-blur-md">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setMobileChatOpen(false)}
                    className="p-1.5 rounded-xl md:hidden text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title={lang === "ar" ? "رجوع" : "Back"}
                  >
                    {lang === "ar" ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
                  </button>

                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                      {(
                        selectedContact.name?.[lang] ||
                        selectedContact.displayName ||
                        selectedContact.username ||
                        "U"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {selectedContact.name?.[lang] ||
                          selectedContact.displayName ||
                          selectedContact.username}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-cyan-300 text-[10px] font-bold">
                        {mode === "instructor"
                          ? lang === "ar"
                            ? "طالب"
                            : "Student"
                          : lang === "ar"
                          ? "محاضر"
                          : "Instructor"}
                      </span>
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{lang === "ar" ? "متصل الآن • ردود مباشرة" : "Online • Real-time"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="hidden sm:inline text-[11px]">
                    {lang === "ar" ? "محادثة آمنة" : "Direct & Encrypted"}
                  </span>
                </div>
              </div>

              {/* Message Feed Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-400">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-cyan-400 flex items-center justify-center">
                      <MessageSquare className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="font-extrabold text-sm text-slate-700 dark:text-slate-200">
                        {lang === "ar"
                          ? "لا توجد رسائل سابقة في هذه المحادثة"
                          : "No previous messages in this conversation"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {lang === "ar"
                          ? "أرسل أول رسالة لبدء التواصل المباشر اللحظي الآن."
                          : "Send the first message to initiate real-time communication."}
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === user?.uid;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-[20px] px-4 py-2.5 shadow-sm transition-all text-xs sm:text-sm leading-relaxed ${
                            isMine
                              ? "rounded-tr-none rtl:rounded-tr-[20px] rtl:rounded-tl-none bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-indigo-500/20"
                              : "rounded-tl-none rtl:rounded-tl-[20px] rtl:rounded-tr-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-white/10"
                          }`}
                        >
                          <p className="whitespace-pre-line break-words font-medium">{msg.text}</p>

                          <div
                            className={`mt-1 flex items-center justify-end gap-1.5 text-[9.5px] ${
                              isMine ? "text-sky-200/90" : "text-slate-400"
                            }`}
                          >
                            <span>
                              {msg.createdAt
                                ? new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </span>
                            {isMine && <CheckCheck className="h-3 w-3 text-sky-200" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestion Chips */}
              <div className="px-4 py-1.5 bg-slate-100/50 dark:bg-slate-900/40 border-t border-slate-200/40 dark:border-white/5 flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                  {lang === "ar" ? "مقترحات سريعة:" : "Quick replies:"}
                </span>
                {quickChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(chip);
                      textInputRef.current?.focus();
                    }}
                    className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[10.5px] font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors shrink-0 cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Message Input Dock */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white/90 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-white/10 flex items-center gap-2 backdrop-blur-md"
              >
                <input
                  ref={textInputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    mode === "instructor"
                      ? lang === "ar"
                        ? `اكتب رسالتك إلى ${selectedContact.name?.[lang] || selectedContact.displayName}...`
                        : `Write a message to ${selectedContact.name?.[lang] || selectedContact.displayName}...`
                      : lang === "ar"
                      ? `اكتب سؤالك أو استفسارك للمحاضر...`
                      : `Type your message or question to the instructor...`
                  }
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:text-white"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="h-10 w-10 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 hover:opacity-95 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shrink-0"
                  title={lang === "ar" ? "إرسال الرسالة" : "Send message"}
                >
                  <Send className={`h-4 w-4 ${lang === "ar" ? "rotate-180" : ""}`} />
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 text-slate-400">
              <div className="h-16 w-16 rounded-3xl bg-indigo-500/10 text-indigo-600 dark:text-cyan-400 flex items-center justify-center">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white">
                {lang === "ar" ? "اختر محادثة للبدء" : "Select a conversation"}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                {mode === "instructor"
                  ? lang === "ar"
                    ? "اختر طالباً من القائمة الجانبية لبدء المحادثة المباشرة معه ومتابعة أسئلته."
                    : "Select a student from the sidebar list to view conversation history and send direct messages."
                  : lang === "ar"
                  ? "اختر محاضرك لبدء التواصل معه وطرح استفساراتك."
                  : "Select an instructor to start chatting and ask study questions."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
