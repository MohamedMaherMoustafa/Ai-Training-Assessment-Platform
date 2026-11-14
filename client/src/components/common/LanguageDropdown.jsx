import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useLang } from "../../context/LangContext";

// Crisp vector flags that render on all Windows, Mac, and mobile browsers
function UkFlag({ className = "h-3.5 w-5 rounded-[3px] shadow-sm shrink-0" }) {
  return (
    <svg viewBox="0 0 60 30" className={className} xmlns="http://www.w3.org/2000/svg">
      <clipPath id="ukClip">
        <rect width="60" height="30" rx="3" />
      </clipPath>
      <g clipPath="url(#ukClip)">
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

function EgyptFlag({ className = "h-3.5 w-5 rounded-[3px] shadow-sm shrink-0" }) {
  return (
    <svg viewBox="0 0 60 36" className={className} xmlns="http://www.w3.org/2000/svg">
      <clipPath id="egClip">
        <rect width="60" height="36" rx="3" />
      </clipPath>
      <g clipPath="url(#egClip)">
        <rect width="60" height="12" fill="#CE1126" />
        <rect y="12" width="60" height="12" fill="#FFFFFF" />
        <rect y="24" width="60" height="12" fill="#000000" />
        {/* Golden Eagle emblem */}
        <circle cx="30" cy="18" r="4" fill="#C09300" opacity="0.9" />
      </g>
    </svg>
  );
}

export default function LanguageDropdown({ buttonClassName = "" }) {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const languages = [
    {
      code: "en",
      name: "English",
      Flag: UkFlag,
    },
    {
      code: "ar",
      name: "العربية",
      Flag: EgyptFlag,
    },
  ];

  const currentLang = languages.find((l) => l.code === lang) || languages[0];
  const CurrentFlag = currentLang.Flag;

  return (
    <div className="relative inline-block text-start" ref={dropdownRef}>
      {/* Pill Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-3 py-1 sm:py-1.5 rounded-full border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-all select-none ${buttonClassName}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <CurrentFlag />
        <span>{currentLang.name}</span>
        <ChevronDown
          className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute end-0 mt-1.5 w-36 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200/80 dark:border-white/10 p-1.5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="space-y-0.5">
            {languages.map((item) => {
              const ItemFlag = item.Flag;
              const isSelected = item.code === lang;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setLang(item.code);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ItemFlag />
                    <span>{item.name}</span>
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

