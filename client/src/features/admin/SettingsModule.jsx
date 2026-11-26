import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { CheckCircle2, AlertTriangle, Server, Database } from "lucide-react";
import { firebaseConfig } from "../../lib/firebase";
import { checkRtdbHealth } from "../../services/platformService";

export default function SettingsModule() {
  const { t } = useTranslation();
  const [rtdbOk, setRtdbOk] = useState(null);
  const [llmOk, setLlmOk] = useState(false);

  useEffect(() => {
    checkRtdbHealth().then(setRtdbOk);
    axios
      .get("http://localhost:3001/health", { timeout: 1500 })
      .then(() => setLlmOk(true))
      .catch(() => setLlmOk(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[26px] p-5 flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-500 via-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/25">
          <Server className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-black">{t("settings.firebaseStatus")}</h1>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            Live status of your provisioned Firebase project and local AI runtime.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Database className="h-4 w-4 text-teal-500" />
            Firebase Configuration
          </div>
          <div className="text-xs space-y-2.5">
            <div>
              <span className="text-slate-500 dark:text-slate-400">{t("settings.projectId")}:</span>{" "}
              <code className="font-semibold text-teal-700 dark:text-teal-300">{firebaseConfig.projectId}</code>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">{t("settings.authStatus")}:</span>{" "}
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" /> {t("settings.connected")}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">{t("settings.rtdbStatus")}:</span>{" "}
              {rtdbOk === null ? (
                "Checking…"
              ) : rtdbOk ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t("settings.connected")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" /> Disconnected
                </span>
              )}
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-900 dark:text-amber-200">
              <div className="font-bold">{t("settings.firestoreStatus")}</div>
              <div className="mt-1">{t("settings.lockedNote")}</div>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Server className="h-4 w-4 text-emerald-500" />
            {t("settings.llmProxyStatus")}
          </div>
          <div className="text-xs space-y-2">
            {llmOk ? (
              <div className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="h-4 w-4" /> Local LLM Proxy Online (localhost:3001)
              </div>
            ) : (
              <div className="p-3 rounded-xl glass-subtle text-slate-600 dark:text-slate-300">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> {t("settings.offlineNote")}
                </div>
                <p className="mt-1.5">
                  When you are ready to run the local trained Ollama model, the platform automatically connects to <code>http://localhost:3001</code> for AI quiz drafting and learner study feedback.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

