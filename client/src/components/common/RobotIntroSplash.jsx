import { useEffect, useState, useRef } from "react";
import { Sparkles, ArrowRight, Zap } from "lucide-react";
import { playSuccessSound } from "../../utils/soundEffects";
import { useLang } from "../../context/LangContext";

export default function RobotIntroSplash({ onComplete }) {
  const { lang } = useLang();
  const [progress, setProgress] = useState(0); // 0 to 100
  const [phase, setPhase] = useState("walking"); // "walking" | "celebrating" | "exiting"
  const [particles, setParticles] = useState([]);
  const hasChimedRef = useRef(false);

  useEffect(() => {
    let animFrame;
    const startTime = performance.now();
    const WALK_DURATION = 3200; // 3.2 seconds walking & writing

    const animate = (now) => {
      const elapsed = now - startTime;
      const rawProgress = Math.min(100, (elapsed / WALK_DURATION) * 100);

      // Smooth easing for natural step acceleration
      setProgress(rawProgress);

      // Add writing spark particles periodically while walking
      if (rawProgress < 100 && Math.random() < 0.4) {
        setParticles((prev) => [
          ...prev.slice(-14),
          {
            id: `p_${Date.now()}_${Math.random()}`,
            x: rawProgress,
            y: 48 + (Math.random() * 24 - 12),
            size: 3 + Math.random() * 4,
            color: Math.random() > 0.5 ? "#38bdf8" : "#818cf8",
          },
        ]);
      }

      if (rawProgress < 100) {
        animFrame = requestAnimationFrame(animate);
      } else {
        // Finished walking across and writing!
        setPhase("celebrating");
        if (!hasChimedRef.current) {
          hasChimedRef.current = true;
          try {
            playSuccessSound();
          } catch {
            // ignore audio restrictions
          }
        }

        // Celebrate for 900ms then transition out
        setTimeout(() => {
          setPhase("exiting");
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 650);
        }, 900);
      }
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [onComplete]);

  const handleSkip = () => {
    setPhase("exiting");
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 350);
  };

  const isWalking = phase === "walking";

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-[#070b19] flex flex-col items-center justify-center overflow-hidden select-none transition-all duration-700 ${
        phase === "exiting" ? "opacity-0 pointer-events-none scale-105" : "opacity-100"
      }`}
      aria-label="Athar AI Intro Animation"
    >
      {/* Background ambient lighting and starry grids */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-indigo-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Skip Button */}
      <button
        type="button"
        onClick={handleSkip}
        className="absolute top-6 end-6 z-20 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-slate-300 hover:text-white text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
      >
        <span>{lang === "ar" ? "تخطي" : "Skip"}</span>
        <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
      </button>

      {/* Main Center Animation Stage */}
      <div className="relative w-full max-w-4xl px-4 sm:px-8 py-12 flex flex-col items-center justify-center">
        {/* The Text Track that gets written behind the robot */}
        <div className="relative w-full py-8 sm:py-12 flex flex-col items-center justify-center min-h-[170px] sm:min-h-[220px]">
          {/* Subtle outline / faint placeholder path */}
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 pointer-events-none text-center">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-wider text-slate-400 font-mono">
              ATHAR AI
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">
              AI Training & Assessment Platform
            </p>
          </div>

          {/* The Written Text (Progressively revealed behind the robot) */}
          <div
            className="w-full flex flex-col items-center justify-center text-center transition-none"
            style={{
              clipPath: `inset(0 ${Math.max(0, 100 - progress)}% 0 0)`,
              WebkitClipPath: `inset(0 ${Math.max(0, 100 - progress)}% 0 0)`,
            }}
          >
            {/* Primary Platform Name */}
            <div className="relative flex items-center justify-center gap-3">
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-fuchsia-400 drop-shadow-[0_0_35px_rgba(56,189,248,0.7)] leading-tight">
                ATHAR AI
              </h1>
            </div>

            {/* Bilingual Subtitles */}
            <div className="mt-3 space-y-1">
              <div className="text-xs sm:text-sm md:text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-200 to-indigo-200 tracking-[0.25em] uppercase">
                AI Training & Assessment Platform
              </div>
              <div
                className="text-xs sm:text-sm font-bold text-sky-300/80 tracking-wide mt-1"
                dir="rtl"
              >
                منصة أثر للتدريب والتقييم بالذكاء الاصطناعي
              </div>
            </div>
          </div>

          {/* Laser sparks and particles trailing behind the robot's pen */}
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute pointer-events-none rounded-full blur-[0.5px] animate-ping"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                boxShadow: `0 0 10px ${p.color}`,
              }}
            />
          ))}

          {/* The Walking Chatbot Robot Mascot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none transition-none z-10"
            style={{
              left: `calc(${progress}% - 52px)`,
            }}
          >
            {/* Robot SVG */}
            <div className="relative">
              {/* Laser Pen Beam touching the writing line */}
              {isWalking && (
                <div className="absolute bottom-6 -start-2 w-7 h-1 bg-gradient-to-r from-transparent via-sky-400 to-indigo-400 blur-[1px] rotate-[-28deg] shadow-[0_0_12px_#38bdf8]" />
              )}

              {/* Glowing Pen Tip Spark */}
              {isWalking && (
                <div className="absolute bottom-4 -start-4 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_16px_#38bdf8,0_0_24px_#818cf8] animate-pulse" />
              )}

              <svg
                width="104"
                height="112"
                viewBox="0 0 118 104"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={`w-[88px] h-[96px] sm:w-[104px] sm:h-[112px] overflow-visible drop-shadow-[0_10px_25px_rgba(2,132,199,0.55)] ${
                  phase === "celebrating" ? "animate-bounce" : ""
                }`}
              >
                <defs>
                  <linearGradient
                    id="introBotBody"
                    x1="18"
                    y1="16"
                    x2="62"
                    y2="66"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#38bdf8" />
                    <stop offset="0.55" stopColor="#2563eb" />
                    <stop offset="1" stopColor="#4f46e5" />
                  </linearGradient>
                  <linearGradient
                    id="introBotMetal"
                    x1="20"
                    y1="10"
                    x2="60"
                    y2="38"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#f8fafc" />
                    <stop offset="1" stopColor="#cbd5e1" />
                  </linearGradient>
                </defs>

                {/* Antenna */}
                <line
                  x1="44"
                  y1="17"
                  x2="44"
                  y2="8"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle
                  cx="44"
                  cy="7"
                  r="4.5"
                  fill="#fbbf24"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className={phase === "celebrating" ? "animate-ping" : ""}
                />
                <circle
                  cx="44"
                  cy="7"
                  r="7.5"
                  stroke="#fbbf24"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  className="opacity-80"
                />

                {/* Left Arm: Swinging back and forth during walk */}
                <g
                  style={{
                    transformOrigin: "20px 48px",
                    animation: isWalking
                      ? "robot-arm-left 0.42s infinite ease-in-out"
                      : "none",
                  }}
                >
                  <rect
                    x="16"
                    y="45"
                    width="8"
                    height="19"
                    rx="4"
                    fill="url(#introBotMetal)"
                    stroke="#0284c7"
                    strokeWidth="1.5"
                  />
                  <circle cx="20" cy="64" r="3.5" fill="#38bdf8" />
                </g>

                {/* Right Arm: Holding the laser pen/stylus drawing the name */}
                <g
                  style={{
                    transformOrigin: "58px 48px",
                    animation: isWalking
                      ? "robot-arm-right 0.42s infinite ease-in-out"
                      : phase === "celebrating"
                      ? "hand-wave-wiggle 0.3s infinite ease-in-out"
                      : "none",
                  }}
                >
                  <rect
                    x="56"
                    y="44"
                    width="8"
                    height="20"
                    rx="4"
                    fill="url(#introBotMetal)"
                    stroke="#0284c7"
                    strokeWidth="1.5"
                    transform={isWalking ? "rotate(-25 60 48)" : "rotate(-10 60 48)"}
                  />
                  <circle cx="56" cy="62" r="3.8" fill="#38bdf8" />
                  {/* Glowing Stylus in hand */}
                  <line
                    x1="56"
                    y1="62"
                    x2="48"
                    y2="78"
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="48" cy="78" r="2.5" fill="#38bdf8" />
                </g>

                {/* Left Leg: Swinging back and forth */}
                <g
                  style={{
                    transformOrigin: "34px 67px",
                    animation: isWalking
                      ? "robot-leg-left 0.42s infinite ease-in-out"
                      : "none",
                  }}
                >
                  <rect x="30" y="67" width="9" height="15" rx="4" fill="#334155" />
                  <rect x="28" y="78" width="13" height="6" rx="3" fill="#0284c7" />
                </g>

                {/* Right Leg: Opposite swing */}
                <g
                  style={{
                    transformOrigin: "51px 67px",
                    animation: isWalking
                      ? "robot-leg-right 0.42s infinite ease-in-out"
                      : "none",
                  }}
                >
                  <rect x="47" y="67" width="9" height="15" rx="4" fill="#334155" />
                  <rect x="45" y="78" width="13" height="6" rx="3" fill="#0284c7" />
                </g>

                {/* Robot Torso with Up-Down walking bob */}
                <g
                  style={{
                    animation: isWalking ? "robot-bob 0.42s infinite ease-in-out" : "none",
                  }}
                >
                  <rect
                    x="25"
                    y="43"
                    width="36"
                    height="27"
                    rx="10"
                    fill="url(#introBotBody)"
                    stroke="#bae6fd"
                    strokeWidth="2"
                  />
                  <rect
                    x="33"
                    y="50"
                    width="20"
                    height="12"
                    rx="4"
                    fill="#0f172a"
                    fillOpacity="0.65"
                  />
                  <circle cx="38" cy="56" r="2.2" fill="#34d399" />
                  <circle cx="43" cy="56" r="2.2" fill="#38bdf8" />
                  <circle cx="48" cy="56" r="2.2" fill="#fbbf24" />

                  {/* Robot Head */}
                  <rect
                    x="22"
                    y="16"
                    width="42"
                    height="28"
                    rx="11"
                    fill="url(#introBotMetal)"
                    stroke="#38bdf8"
                    strokeWidth="2.2"
                  />
                  <rect x="27" y="21" width="32" height="17" rx="6" fill="#0f172a" />
                  {/* Glowing Cyan Eyes */}
                  <circle cx="36" cy="28" r="3.2" fill="#38bdf8" />
                  <circle cx="50" cy="28" r="3.2" fill="#38bdf8" />
                  {/* Friendly Smile */}
                  <path
                    d="M38 33.5C40 35.5 46 35.5 48 33.5"
                    stroke="#34d399"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </g>
              </svg>

              {/* Shadow underneath robot */}
              <div className="w-16 h-3 -mt-1 mx-auto rounded-full bg-sky-500/30 blur-[4px]" />
            </div>
          </div>
        </div>

        {/* Celebrating Badge when writing completes */}
        {phase === "celebrating" && (
          <div className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/15 border border-sky-400/40 text-sky-300 text-xs font-bold animate-pulse shadow-[0_0_20px_rgba(56,189,248,0.4)]">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>
              {lang === "ar"
                ? "مرحباً بك في منصة أثر الذكية!"
                : "Welcome to Athar AI Platform!"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
