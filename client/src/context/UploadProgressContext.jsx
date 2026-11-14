import { createContext, useContext, useState, useRef, useCallback } from "react";
import UploadProgressModal from "../components/common/UploadProgressModal";
import { playSuccessSound } from "../utils/soundEffects";

const UploadProgressContext = createContext(null);

export function UploadProgressProvider({ children }) {
  const [uploadState, setUploadState] = useState({
    isOpen: false,
    title: "",
    fileName: "",
    fileSize: 0,
    loadedBytes: 0,
    totalBytes: 0,
    percent: 0,
    speed: 0,
    etaSeconds: null,
    stage: "",
    status: "idle", // "idle" | "uploading" | "success" | "error"
    error: null,
  });

  const trackerRef = useRef({
    startTime: 0,
    lastTime: 0,
    lastLoaded: 0,
    totalBytes: 1,
    loadedBytes: 0,
    speedSamples: [],
    speed: 0,
    timerId: null,
  });

  const updateCalculations = useCallback((loadedBytes, customStage = null) => {
    const tr = trackerRef.current;
    const now = Date.now();
    const clampedLoaded = Math.min(tr.totalBytes, Math.max(0, loadedBytes));
    tr.loadedBytes = clampedLoaded;

    const timeDelta = (now - tr.lastTime) / 1000;
    if (timeDelta >= 0.1) {
      const bytesDelta = tr.loadedBytes - tr.lastLoaded;
      if (bytesDelta >= 0) {
        const instantSpeed = bytesDelta / timeDelta;
        tr.speedSamples.push(instantSpeed);
        if (tr.speedSamples.length > 5) tr.speedSamples.shift();
        tr.speed = tr.speedSamples.reduce((a, b) => a + b, 0) / tr.speedSamples.length;
      }
      tr.lastTime = now;
      tr.lastLoaded = tr.loadedBytes;
    }

    const elapsedTotal = (now - tr.startTime) / 1000;
    const fallbackSpeed = elapsedTotal > 0 ? tr.loadedBytes / elapsedTotal : 0;
    const effectiveSpeed = tr.speed > 0 ? tr.speed : fallbackSpeed;

    const remainingBytes = Math.max(0, tr.totalBytes - tr.loadedBytes);
    let eta = null;
    if (effectiveSpeed > 0 && remainingBytes > 0) {
      eta = remainingBytes / effectiveSpeed;
    } else if (remainingBytes === 0) {
      eta = 0;
    }

    const percent = Math.min(100, Math.round((tr.loadedBytes / tr.totalBytes) * 100));

    setUploadState((prev) => ({
      ...prev,
      loadedBytes: tr.loadedBytes,
      totalBytes: tr.totalBytes,
      percent,
      speed: effectiveSpeed,
      etaSeconds: eta,
      stage: customStage !== null ? customStage : prev.stage,
    }));

    return { percent, speed: effectiveSpeed, etaSeconds: eta };
  }, []);

  const closeUpload = useCallback(() => {
    if (trackerRef.current.timerId) {
      clearInterval(trackerRef.current.timerId);
      trackerRef.current.timerId = null;
    }
    setUploadState((prev) => ({
      ...prev,
      isOpen: false,
      status: "idle",
      error: null,
    }));
  }, []);

  /**
   * Universal upload tracker: wraps an async upload/processing action,
   * displays the loading popup, calculates ETA and upload speed live,
   * plays completion audio, and gracefully auto-closes.
   */
  const trackUpload = useCallback(
    async ({
      fileName = "file.pdf",
      fileSize = 1000000,
      totalBytes = null,
      title = "",
      action,
    }) => {
      const bytesTotal = Math.max(1024, totalBytes || fileSize || 1000000);
      const now = Date.now();

      trackerRef.current = {
        startTime: now,
        lastTime: now,
        lastLoaded: 0,
        totalBytes: bytesTotal,
        loadedBytes: 0,
        speedSamples: [],
        speed: 0,
        timerId: null,
      };

      setUploadState({
        isOpen: true,
        title,
        fileName,
        fileSize: bytesTotal,
        loadedBytes: 0,
        totalBytes: bytesTotal,
        percent: 0,
        speed: 0,
        etaSeconds: null,
        stage: "Preparing file...",
        status: "uploading",
        error: null,
      });

      // Smooth simulated heartbeat so ETA updates even if operation is processing in chunks
      trackerRef.current.timerId = setInterval(() => {
        const tr = trackerRef.current;
        if (!tr) return;
        // recalculate ETA based on time elapsed
        const elapsed = (Date.now() - tr.startTime) / 1000;
        if (elapsed > 0 && tr.loadedBytes > 0) {
          const overallSpeed = tr.loadedBytes / elapsed;
          const remaining = Math.max(0, tr.totalBytes - tr.loadedBytes);
          const eta = overallSpeed > 0 ? remaining / overallSpeed : null;
          setUploadState((prev) => {
            if (prev.status !== "uploading") return prev;
            return {
              ...prev,
              speed: tr.speed > 0 ? tr.speed : overallSpeed,
              etaSeconds: eta,
            };
          });
        }
      }, 250);

      const reportProgress = ({ percent = null, loadedBytes = null, stage = null }) => {
        const tr = trackerRef.current;
        let bytes = loadedBytes;
        if (bytes === null && percent !== null) {
          bytes = (percent / 100) * tr.totalBytes;
        }
        if (bytes !== null) {
          updateCalculations(bytes, stage);
        } else if (stage) {
          setUploadState((prev) => ({ ...prev, stage }));
        }
      };

      try {
        const result = await action(reportProgress);

        // Mark 100% complete
        updateCalculations(trackerRef.current.totalBytes, "Upload Complete!");
        setUploadState((prev) => ({
          ...prev,
          percent: 100,
          status: "success",
          stage: "Upload Complete!",
          etaSeconds: 0,
        }));

        playSuccessSound();

        // Brief delay so user sees 100% and success checkmark
        await new Promise((resolve) => setTimeout(resolve, 650));
        closeUpload();
        return result;
      } catch (err) {
        console.error("Upload failed:", err);
        setUploadState((prev) => ({
          ...prev,
          status: "error",
          error: err.message || "Upload failed",
          stage: "Upload Failed",
        }));
        throw err;
      } finally {
        if (trackerRef.current.timerId) {
          clearInterval(trackerRef.current.timerId);
          trackerRef.current.timerId = null;
        }
      }
    },
    [updateCalculations, closeUpload]
  );

  return (
    <UploadProgressContext.Provider
      value={{
        uploadState,
        trackUpload,
        closeUpload,
      }}
    >
      {children}
      <UploadProgressModal
        isOpen={uploadState.isOpen}
        title={uploadState.title}
        fileName={uploadState.fileName}
        fileSize={uploadState.fileSize}
        loadedBytes={uploadState.loadedBytes}
        totalBytes={uploadState.totalBytes}
        percent={uploadState.percent}
        speed={uploadState.speed}
        etaSeconds={uploadState.etaSeconds}
        stage={uploadState.stage}
        status={uploadState.status}
        error={uploadState.error}
        onCancel={uploadState.status === "error" ? closeUpload : null}
      />
    </UploadProgressContext.Provider>
  );
}

export const useUploadProgress = () => useContext(UploadProgressContext);
