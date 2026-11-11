import { createContext, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

const PopupContext = createContext(null);

export function PopupProvider({ children }) {
  const [popup, setPopup] = useState(null);

  const showPopup = ({
    title,
    message,
    type = "info",
    confirmLabel = "OK",
    onConfirm = null,
  }) => {
    setPopup({ title, message, type, confirmLabel, onConfirm });
  };

  const closePopup = () => setPopup(null);

  const iconMap = {
    success: <CheckCircle2 className="h-7 w-7 text-emerald-500" />,
    error: <XCircle className="h-7 w-7 text-rose-500" />,
    warning: <AlertTriangle className="h-7 w-7 text-amber-500" />,
    info: <Info className="h-7 w-7 text-sky-500" />,
  };

  return (
    <PopupContext.Provider value={{ showPopup, closePopup }}>
      {children}

      {popup && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={closePopup}
        >
          <div
            className="glass-panel rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-white/75 dark:border-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl glass-subtle flex items-center justify-center shrink-0">
                  {iconMap[popup.type] || iconMap.info}
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {popup.title}
                </h3>
              </div>
              <button
                onClick={closePopup}
                className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800/70 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
              {popup.message}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  const cb = popup.onConfirm;
                  closePopup();
                  if (cb) cb();
                }}
                className="glass-btn-primary px-5 py-2 rounded-xl text-sm"
              >
                {popup.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  );
}

export const usePopup = () => useContext(PopupContext);

