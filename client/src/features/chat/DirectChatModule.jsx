import { useEffect, useState, useRef, useMemo } from "react";
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
  UserPlus,
  UserCheck,
  UserX,
  BookOpen,
  Bell,
  HeartHandshake,
} from "lucide-react";
import {
  listUsers,
  listActiveInstructors,
  getDirectChatChannelId,
  subscribeDirectChatMessages,
  subscribeUserDirectChats,
  sendDirectChatMessage,
  markDirectChatRead,
  subscribeStudentFriendships,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  listCourseClassmates,
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

  // Tab state for student mode: "chats" | "classmates"
  const [studentTab, setStudentTab] = useState("chats");

  // Contacts & Chat state
  const [instructors, setInstructors] = useState([]);
  const [classmates, setClassmates] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [chatMetadataList, setChatMetadataList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [classmatesSearch, setClassmatesSearch] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingClassmates, setLoadingClassmates] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [sending, setSending] = useState(false);

  // On mobile: toggle between list view and chat room
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const textInputRef = useRef(null);

  // 1. Subscribe to friendships in real-time (for students)
  useEffect(() => {
    if (mode !== "student" || !user?.uid) return undefined;
    const unsub = subscribeStudentFriendships(user.uid, (list) => {
      setFriendships(list);
    });
    return () => unsub && unsub();
  }, [mode, user?.uid]);

  // 2. Load contacts & classmates based on role
  useEffect(() => {
    let isMounted = true;
    setLoadingContacts(true);

    const fetchContacts = async () => {
      try {
        if (mode === "instructor") {
          // Instructors see all students assigned to them
          const allStudents = await listUsers("student");
          const myStudents = allStudents.filter(
            (s) => Array.isArray(s.instructorIds) && s.instructorIds.includes(user?.uid)
          );
          if (isMounted) {
            const mapped = myStudents.map((s) => ({
              ...s,
              type: "student",
            }));
            setInstructors(mapped);
            if (mapped.length > 0 && !selectedContact) {
              setSelectedContact(mapped[0]);
            }
          }
        } else {
          // Students see approved instructors
          const allInstructors = await listActiveInstructors();
          const approvedIds = user?.instructorIds || [];
          const myInstructors = allInstructors
            .filter((i) => approvedIds.includes(i.uid))
            .map((inst) => ({
              ...inst,
              type: "instructor",
            }));

          if (isMounted) {
            setInstructors(myInstructors);
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

  // 3. Load course classmates (only students enrolled in same courses!)
  useEffect(() => {
    if (mode !== "student" || !user?.uid) return;
    let isMounted = true;
    setLoadingClassmates(true);

    listCourseClassmates(user.uid)
      .then((res) => {
        if (isMounted) setClassmates(res || []);
      })
      .catch((err) => console.error("Failed to load classmates:", err))
      .finally(() => {
        if (isMounted) setLoadingClassmates(false);
      });

    return () => {
      isMounted = false;
    };
  }, [mode, user?.uid]);

  // 4. Map accepted friends as chat contacts
  const acceptedFriendsContacts = useMemo(() => {
    if (mode !== "student" || !user?.uid) return [];

    const acceptedList = friendships.filter((f) => f.status === "accepted");
    return acceptedList.map((f) => {
      const friendUid = f.senderId === user.uid ? f.receiverId : f.senderId;
      const friendName = f.senderId === user.uid ? f.receiverName : f.senderName;
      const matchedClassmate = classmates.find((c) => c.uid === friendUid);

      return {
        uid: friendUid,
        displayName: matchedClassmate?.displayName || friendName || "Classmate",
        name: matchedClassmate?.name || { en: friendName, ar: friendName },
        username: matchedClassmate?.username,
        email: matchedClassmate?.email,
        type: "peer",
        role: "student",
        sharedCourses: matchedClassmate?.sharedCourses || f.sharedCourseTitles || [],
        friendshipId: f.id,
      };
    });
  }, [mode, user?.uid, friendships, classmates]);

  // Combined contacts for the chats list
  const allChatContacts = useMemo(() => {
    if (mode === "instructor") return instructors;
    // For students: instructors + accepted friends
    return [...instructors, ...acceptedFriendsContacts];
  }, [mode, instructors, acceptedFriendsContacts]);

  // Incoming and Outgoing pending friend requests
  const incomingRequests = useMemo(() => {
    return friendships.filter((f) => f.status === "pending" && f.receiverId === user?.uid);
  }, [friendships, user?.uid]);

  // Helper: check relationship status with a classmate
  const getClassmateFriendshipStatus = (classmateUid) => {
    const f = friendships.find(
      (item) =>
        (item.senderId === user?.uid && item.receiverId === classmateUid) ||
        (item.receiverId === user?.uid && item.senderId === classmateUid)
    );
    if (!f) return { status: "none", friendship: null };
    if (f.status === "accepted") return { status: "accepted", friendship: f };
    if (f.status === "pending") {
      return {
        status: f.senderId === user?.uid ? "pending_outgoing" : "pending_incoming",
        friendship: f,
      };
    }
    return { status: "none", friendship: null };
  };

  // 5. Subscribe to user conversation metadata (for unread badges & last message snippets)
  useEffect(() => {
    if (!user?.uid) return undefined;
    const unsub = subscribeUserDirectChats(user.uid, (list) => {
      setChatMetadataList(list);
    });
    return () => unsub && unsub();
  }, [user?.uid]);

  // 6. Subscribe in real-time to active channel messages
  useEffect(() => {
    if (!user?.uid || !selectedContact?.uid) {
      setMessages([]);
      return undefined;
    }

    const channelId = getDirectChatChannelId(user.uid, selectedContact.uid);

    // Mark conversation as read
    markDirectChatRead(channelId, mode, user.uid);

    const unsub = subscribeDirectChatMessages(channelId, (incomingMessages) => {
      setMessages(incomingMessages);
      markDirectChatRead(channelId, mode, user.uid);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });

    return () => unsub && unsub();
  }, [user?.uid, selectedContact?.uid, mode]);

  // Quick suggestion chips based on whether chatting with an instructor or classmate
  const quickChips = useMemo(() => {
    const isPeer = selectedContact?.type === "peer";
    if (isPeer) {
      return lang === "ar"
        ? [
            "مرحباً يا زميلي 👋",
            "هل بدأت في حل الواجب؟ 📝",
            "ما رأيك نراجع سوياً للاختبار القادم؟ 🧠",
            "شكراً جزيلاً لك يا بطل! 🚀",
          ]
        : [
            "Hey classmate 👋",
            "Did you start working on the assignment? 📝",
            "Want to review together for the quiz? 🧠",
            "Thanks a lot, keep it up! 🚀",
          ];
    }
    if (mode === "student") {
      return lang === "ar"
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
          ];
    }
    return lang === "ar"
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
  }, [mode, selectedContact?.type, lang]);

  // Handle Send Message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend || !selectedContact || !user?.uid || sending) return;

    setSending(true);
    playClickSound();

    const channelId = getDirectChatChannelId(user.uid, selectedContact.uid);
    const myName = user?.displayName || user?.name?.[lang] || user?.username || "Student";
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

  // Handle Friend Request Actions
  const handleSendFriendRequest = async (classmate) => {
    if (!user?.uid || actionLoadingId) return;
    setActionLoadingId(classmate.uid);
    playClickSound();

    try {
      const myName = user.displayName || user.username || "Classmate";
      const sharedTitles = (classmate.sharedCourses || []).map((sc) => sc.title);

      await sendFriendRequest({
        senderId: user.uid,
        senderName: myName,
        receiverId: classmate.uid,
        receiverName: classmate.displayName || classmate.username,
        sharedCourseTitles: sharedTitles,
      });

      toast.success(
        lang === "ar"
          ? `تم إرسال طلب الصداقة إلى ${classmate.displayName} 🚀`
          : `Friend request sent to ${classmate.displayName} 🚀`
      );
    } catch (err) {
      console.error("sendFriendRequest error:", err);
      toast.error(
        err.message === "MUST_SHARE_COURSE"
          ? (lang === "ar" ? "يجب أن تكونا مسجلين في نفس المقرر أولاً" : "Must be enrolled in the same course")
          : (lang === "ar" ? "تعذر إرسال الطلب" : "Failed to send request")
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptRequest = async (friendshipId, classmateName) => {
    if (!friendshipId || actionLoadingId) return;
    setActionLoadingId(friendshipId);
    playClickSound();

    try {
      const myName = user.displayName || user.username || "Student";
      await acceptFriendRequest(friendshipId, user.uid, myName);
      toast.success(
        lang === "ar"
          ? `أصبحت أنت و ${classmateName || "زميلك"} أصدقاء الآن! 🎉`
          : `You and ${classmateName || "your classmate"} are now friends! 🎉`
      );
    } catch (err) {
      console.error("acceptFriendRequest error:", err);
      toast.error(lang === "ar" ? "تعذر قبول الطلب" : "Failed to accept request");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineRequest = async (friendshipId) => {
    if (!friendshipId || actionLoadingId) return;
    setActionLoadingId(friendshipId);
    playClickSound();

    try {
      await declineFriendRequest(friendshipId);
      toast(lang === "ar" ? "تم رفض الطلب" : "Request declined");
    } catch (err) {
      console.error("declineFriendRequest error:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelRequest = async (friendshipId) => {
    if (!friendshipId || actionLoadingId) return;
    setActionLoadingId(friendshipId);
    playClickSound();

    try {
      await cancelFriendRequest(friendshipId);
      toast(lang === "ar" ? "تم إلغاء الطلب" : "Request cancelled");
    } catch (err) {
      console.error("cancelFriendRequest error:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper to get unread count for a contact
  const getContactUnreadCount = (contactUid) => {
    const channelId = getDirectChatChannelId(user?.uid, contactUid);
    const match = chatMetadataList.find((c) => c.channelId === channelId);
    if (!match?.metadata) return 0;
    if (match.metadata.unreadByRecipient?.[user?.uid] !== undefined) {
      return match.metadata.unreadByRecipient[user?.uid] || 0;
    }
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
  const filteredContacts = allChatContacts.filter((c) => {
    if (!searchQuery.trim()) return true;
    const nameStr = (c.displayName || c.name?.[lang] || c.username || "").toLowerCase();
    return nameStr.includes(searchQuery.toLowerCase());
  });

  // Filter classmates in "classmates" tab
  const filteredClassmates = classmates.filter((c) => {
    if (!classmatesSearch.trim()) return true;
    const nameStr = (c.displayName || c.name?.[lang] || c.username || "").toLowerCase();
    return nameStr.includes(classmatesSearch.toLowerCase());
  });

  return (
    <div className="space-y-4">
      {/* Main Two-Column Messenger Container */}
      <div className="glass-panel overflow-hidden h-[640px] max-h-[82vh] flex rounded-[26px] shadow-2xl border border-slate-200/80 dark:border-white/10">
        {/* ============================================================== */}
        {/* LEFT COLUMN: CONTACTS & CLASSMATES LIST */}
        {/* ============================================================== */}
        <div
          className={`w-full md:w-80 lg:w-96 shrink-0 border-e border-slate-200/80 dark:border-white/10 flex flex-col bg-white/70 dark:bg-[#081520]/80 backdrop-blur-xl ${
            mobileChatOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Mode Switcher Tabs for Students (Chats vs Course Classmates) */}
          {mode === "student" && (
            <div className="p-2.5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-200/60 dark:bg-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setStudentTab("chats")}
                  className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    studentTab === "chats"
                      ? "bg-white dark:bg-[#0c1f2d] text-teal-600 dark:text-teal-300 shadow-md"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>{lang === "ar" ? "المحادثات" : "Chats"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStudentTab("classmates")}
                  className={`relative flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    studentTab === "classmates"
                      ? "bg-white dark:bg-[#0c1f2d] text-sky-600 dark:text-sky-300 shadow-md"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>{lang === "ar" ? "زملاء المقررات" : "Classmates"}</span>
                  {incomingRequests.length > 0 && (
                    <span className="h-4 min-w-[16px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                      {incomingRequests.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW A: CHATS & ACTIVE CONTACTS (Instructors + Accepted Friends) */}
          {/* ============================================================== */}
          {(mode === "instructor" || studentTab === "chats") && (
            <>
              {/* Search Contacts Bar */}
              <div className="p-3 border-b border-slate-200/80 dark:border-white/10">
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
                        ? "بحث في المحادثات والأصدقاء..."
                        : "Search chats & friends..."
                    }
                    className="w-full ps-9 pe-3 py-2 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              {/* Contacts Scroll Area */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                {loadingContacts ? (
                  <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-teal-500" />
                    <span>{lang === "ar" ? "جاري تحميل جهات الاتصال..." : "Loading contacts..."}</span>
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 space-y-3">
                    <Users className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">
                      {mode === "instructor"
                        ? lang === "ar"
                          ? "لا يوجد طلاب مسجلون حالياً"
                          : "No students registered yet"
                        : lang === "ar"
                        ? "لا توجد محادثات نشطة بعد"
                        : "No active conversations yet"}
                    </p>
                    {mode === "student" && (
                      <button
                        type="button"
                        onClick={() => setStudentTab("classmates")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white font-black text-xs shadow-md shadow-sky-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>{lang === "ar" ? "ابحث عن زملاء في مقررك 👥" : "Find Course Classmates 👥"}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const isSelected = selectedContact?.uid === contact.uid;
                    const unreadCount = getContactUnreadCount(contact.uid);
                    const lastMsg = getContactLastMessage(contact.uid);
                    const contactName =
                      contact.name?.[lang] || contact.displayName || contact.username || "User";
                    const isPeer = contact.type === "peer";

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
                            ? "bg-teal-500/10 dark:bg-white/[0.08] border-s-4 border-teal-500"
                            : "hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div
                            className={`h-11 w-11 rounded-full text-white font-extrabold text-sm flex items-center justify-center shadow-md ${
                              isPeer
                                ? "bg-gradient-to-tr from-sky-500 to-indigo-600"
                                : "bg-gradient-to-tr from-teal-500 to-emerald-500"
                            }`}
                          >
                            {contactName.charAt(0).toUpperCase()}
                          </div>
                          <span className="absolute bottom-0 end-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#081520]" />
                        </div>

                        {/* Contact Info & Last Message Snippet */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                              {contactName}
                            </span>
                            {unreadCount > 0 && (
                              <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-teal-500 text-white font-black text-[10px] flex items-center justify-center shadow-md shadow-teal-500/30">
                                {unreadCount}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                isPeer
                                  ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                                  : "bg-teal-500/15 text-teal-700 dark:text-teal-300"
                              }`}
                            >
                              {isPeer
                                ? lang === "ar"
                                  ? "زميل دراسة"
                                  : "Classmate"
                                : mode === "instructor"
                                ? lang === "ar"
                                  ? "طالب"
                                  : "Student"
                                : lang === "ar"
                                ? "محاضر"
                                : "Instructor"}
                            </span>
                          </div>

                          {lastMsg && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                              {lastMsg}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* ============================================================== */}
          {/* VIEW B: CLASSMATES & FRIEND REQUESTS (Same Course Only) */}
          {/* ============================================================== */}
          {mode === "student" && studentTab === "classmates" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search Classmates */}
              <div className="p-3 border-b border-slate-200/80 dark:border-white/10">
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={classmatesSearch}
                    onChange={(e) => setClassmatesSearch(e.target.value)}
                    placeholder={
                      lang === "ar"
                        ? "بحث عن زميل في مقرراتك..."
                        : "Search classmate in your courses..."
                    }
                    className="w-full ps-9 pe-3 py-2 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              {/* Classmates Stream Area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* 1. Pending Incoming Requests Section */}
                {incomingRequests.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-black text-rose-600 dark:text-rose-400">
                      <HeartHandshake className="h-4 w-4" />
                      <span>
                        {lang === "ar"
                          ? `طلبات الصداقة الواردة (${incomingRequests.length})`
                          : `Incoming Friend Requests (${incomingRequests.length})`}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {incomingRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900/40 shadow-sm space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                                {req.senderName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                  {req.senderName}
                                </h4>
                                <span className="inline-flex items-center gap-1 text-[10px] text-teal-700 dark:text-teal-300 font-bold">
                                  <BookOpen className="h-2.5 w-2.5" />
                                  <span className="truncate">
                                    {req.sharedCourseTitles?.[0]?.ar ||
                                      req.sharedCourseTitles?.[0]?.en ||
                                      (typeof req.sharedCourseTitles?.[0] === "string"
                                        ? req.sharedCourseTitles[0]
                                        : "مقرر مشترك")}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              disabled={actionLoadingId === req.id}
                              onClick={() => handleAcceptRequest(req.id, req.senderName)}
                              className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-black shadow-sm flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>{lang === "ar" ? "قبول" : "Accept"}</span>
                            </button>

                            <button
                              type="button"
                              disabled={actionLoadingId === req.id}
                              onClick={() => handleDeclineRequest(req.id)}
                              className="px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-white/10 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                              <UserX className="h-3.5 w-3.5 text-rose-500" />
                              <span>{lang === "ar" ? "رفض" : "Decline"}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Course Classmates Roster */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      {lang === "ar" ? "زملاؤك في نفس المقررات" : "Classmates in Your Courses"}
                    </span>
                    <span className="text-[10.5px] font-bold text-teal-600 dark:text-teal-400">
                      {filteredClassmates.length} {lang === "ar" ? "زميل" : "students"}
                    </span>
                  </div>

                  {loadingClassmates ? (
                    <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-sky-500" />
                      <span>{lang === "ar" ? "جاري فحص المقررات المشتركة..." : "Finding classmates in your courses..."}</span>
                    </div>
                  ) : filteredClassmates.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 space-y-2 rounded-2xl glass-subtle border border-dashed border-slate-300 dark:border-white/10">
                      <BookOpen className="h-7 w-7 mx-auto text-slate-300 dark:text-slate-600" />
                      <p className="font-bold text-slate-700 dark:text-slate-200">
                        {lang === "ar"
                          ? "لم يتم العثور على زملاء مسجلين معك في نفس المقرر بعد"
                          : "No other classmates found in your enrolled courses yet"}
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        {lang === "ar"
                          ? "بمجرد تسجيل طلاب آخرين في مقرراتك ستتمكن من إرسال طلبات صداقة والتواصل المباشر معهم!"
                          : "Once other students enroll in your courses, you can send friend requests and chat with them here!"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredClassmates.map((cl) => {
                        const { status, friendship } = getClassmateFriendshipStatus(cl.uid);
                        const primaryCourse =
                          cl.sharedCourses?.[0]?.title?.[lang] ||
                          cl.sharedCourses?.[0]?.title?.ar ||
                          cl.sharedCourses?.[0]?.title?.en ||
                          "مقرر مشترك";

                        return (
                          <div
                            key={cl.uid}
                            className="p-3 rounded-2xl glass-card flex items-center justify-between gap-2.5 transition-all hover:border-teal-400/40"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm">
                                {cl.displayName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                  {cl.displayName}
                                </h4>
                                <span className="inline-flex items-center gap-1 text-[10px] text-teal-700 dark:text-teal-300 font-bold truncate">
                                  <BookOpen className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">{primaryCourse}</span>
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0">
                              {status === "accepted" ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const friendContact = acceptedFriendsContacts.find(
                                      (c) => c.uid === cl.uid
                                    ) || {
                                      uid: cl.uid,
                                      displayName: cl.displayName,
                                      name: cl.name,
                                      type: "peer",
                                      role: "student",
                                      sharedCourses: cl.sharedCourses,
                                    };
                                    setSelectedContact(friendContact);
                                    setStudentTab("chats");
                                    setMobileChatOpen(true);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 text-white text-xs font-bold shadow-sm hover:bg-teal-600 active:scale-95 transition-all cursor-pointer"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  <span>{lang === "ar" ? "محادثة" : "Chat"}</span>
                                </button>
                              ) : status === "pending_outgoing" ? (
                                <div className="flex items-center gap-1">
                                  <span className="px-2 py-1 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                                    {lang === "ar" ? "⏳ تم الإرسال" : "⏳ Sent"}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={actionLoadingId === friendship?.id}
                                    onClick={() => handleCancelRequest(friendship?.id)}
                                    title={lang === "ar" ? "إلغاء الطلب" : "Cancel request"}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : status === "pending_incoming" ? (
                                <button
                                  type="button"
                                  disabled={actionLoadingId === friendship?.id}
                                  onClick={() => handleAcceptRequest(friendship?.id, cl.displayName)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold shadow-sm hover:bg-emerald-600 active:scale-95 transition-all cursor-pointer"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>{lang === "ar" ? "قبول" : "Accept"}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={actionLoadingId === cl.uid}
                                  onClick={() => handleSendFriendRequest(cl)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm disabled:opacity-50"
                                >
                                  <UserPlus className="h-3 w-3 text-teal-500" />
                                  <span>{lang === "ar" ? "إضافة صديق" : "Add Friend"}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: ACTIVE CHAT ROOM */}
        {/* ============================================================== */}
        <div
          className={`flex-1 flex flex-col bg-slate-50/50 dark:bg-[#06111a]/70 ${
            !mobileChatOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {selectedContact ? (
            <>
              {/* Chat Room Top Header */}
              <div className="px-4 py-3 bg-white/85 dark:bg-[#0a1822]/90 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 backdrop-blur-md">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setMobileChatOpen(false)}
                    className="p-1.5 rounded-xl md:hidden text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                    title={lang === "ar" ? "رجوع" : "Back"}
                  >
                    {lang === "ar" ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
                  </button>

                  <div className="relative shrink-0">
                    <div
                      className={`h-10 w-10 rounded-full text-white font-bold text-sm flex items-center justify-center shadow-sm ${
                        selectedContact.type === "peer"
                          ? "bg-gradient-to-tr from-sky-500 to-indigo-600"
                          : "bg-gradient-to-tr from-teal-500 to-emerald-500"
                      }`}
                    >
                      {(
                        selectedContact.name?.[lang] ||
                        selectedContact.displayName ||
                        selectedContact.username ||
                        "U"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 end-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0a1822]" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {selectedContact.name?.[lang] ||
                          selectedContact.displayName ||
                          selectedContact.username}
                      </h2>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          selectedContact.type === "peer"
                            ? "bg-sky-500/15 border border-sky-400/30 text-sky-700 dark:text-sky-300"
                            : "bg-teal-500/15 border border-teal-400/30 text-teal-700 dark:text-teal-300"
                        }`}
                      >
                        {selectedContact.type === "peer"
                          ? lang === "ar"
                            ? "زميل دراسة"
                            : "Classmate"
                          : mode === "instructor"
                          ? lang === "ar"
                            ? "طالب"
                            : "Student"
                          : lang === "ar"
                          ? "محاضر"
                          : "Instructor"}
                      </span>
                    </div>

                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <span>{lang === "ar" ? "متصل الآن • ردود فورية" : "Online • Real-time"}</span>
                      {selectedContact.type === "peer" && selectedContact.sharedCourses?.[0] && (
                        <>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600 dark:text-slate-400 truncate max-w-[160px] sm:max-w-[240px]">
                            {selectedContact.sharedCourses[0].title?.[lang] ||
                              selectedContact.sharedCourses[0].title?.ar ||
                              selectedContact.sharedCourses[0].title?.en ||
                              selectedContact.sharedCourses[0]}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-300 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="hidden sm:inline text-[11px]">
                    {lang === "ar" ? "محادثة آمنة ومشفرة" : "Encrypted & Direct"}
                  </span>
                </div>
              </div>

              {/* Message Feed Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-400">
                    <div className="h-14 w-14 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
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
                          className={`max-w-[85%] sm:max-w-[75%] rounded-[18px] px-4 py-2.5 shadow-sm transition-all text-xs sm:text-sm leading-relaxed ${
                            isMine
                              ? "rounded-br-sm rtl:rounded-br-[18px] rtl:rounded-bl-sm bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-teal-500/20"
                              : "rounded-bl-sm rtl:rounded-bl-[18px] rtl:rounded-br-sm bg-white dark:bg-white/[0.08] text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-white/10"
                          }`}
                        >
                          <p className="whitespace-pre-line break-words font-medium">{msg.text}</p>

                          <div
                            className={`mt-1 flex items-center justify-end gap-1.5 text-[9.5px] ${
                              isMine ? "text-white/80" : "text-slate-400"
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
                            {isMine && <CheckCheck className="h-3 w-3 text-white/90" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestion Chips */}
              <div className="px-4 py-2 bg-slate-100/50 dark:bg-[#09151f]/70 border-t border-slate-200/40 dark:border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-[10.5px] font-bold text-slate-400 shrink-0">
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
                    className="px-3 py-1 rounded-full bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-[10.5px] font-medium text-slate-700 dark:text-slate-200 hover:border-teal-400/60 hover:text-teal-600 dark:hover:text-teal-300 transition-colors shrink-0 cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Message Input Dock */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white/90 dark:bg-[#091620]/90 border-t border-slate-200/80 dark:border-white/10 flex items-center gap-2 backdrop-blur-md"
              >
                <input
                  ref={textInputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    selectedContact.type === "peer"
                      ? lang === "ar"
                        ? `اكتب رسالتك لزميلك ${selectedContact.displayName}...`
                        : `Write a message to your classmate ${selectedContact.displayName}...`
                      : mode === "instructor"
                      ? lang === "ar"
                        ? `اكتب رسالتك إلى ${selectedContact.name?.[lang] || selectedContact.displayName}...`
                        : `Write a message to ${selectedContact.name?.[lang] || selectedContact.displayName}...`
                      : lang === "ar"
                      ? `اكتب سؤالك أو استفسارك للمحاضر...`
                      : `Type your message or question to the instructor...`
                  }
                  className="flex-1 px-4 py-2.5 rounded-2xl glass-input text-xs sm:text-sm"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="h-10 w-10 rounded-2xl glass-btn-primary text-white flex items-center justify-center active:scale-95 disabled:opacity-40 transition-all cursor-pointer shrink-0"
                  title={lang === "ar" ? "إرسال الرسالة" : "Send message"}
                >
                  <Send className={`h-4 w-4 ${lang === "ar" ? "rotate-180" : ""}`} />
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 text-slate-400">
              <div className="h-16 w-16 rounded-3xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
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
                  ? "اختر محاضرك أو أحد أصدقائك في المقرر لبدء التواصل المباشر اللحظي."
                  : "Select an instructor or course friend to start real-time messaging."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
