import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, rtdb, isFirebaseConfigured } from "../lib/firebase";
import { loginWithCredentials, logoutAll } from "../services/platformService";

const AuthContext = createContext(null);
const PREVIEW_STORAGE_KEY = "athar_preview_session";

function buildPreviewUser(role) {
  if (role === "instructor") {
    return {
      uid: "preview_instructor",
      role: "instructor",
      username: "preview_instructor",
      email: "instructor.preview@athar.local",
      displayName: "Preview Instructor",
      name: { en: "Preview Instructor", ar: "معاينة المحاضر" },
      specialization: { en: "UI Preview Mode", ar: "وضع معاينة الواجهة" },
      active: true,
      isPreview: true,
    };
  }
  return {
    uid: "preview_student",
    role: "student",
    username: "preview_student",
    email: "student.preview@athar.local",
    displayName: "Preview Student",
    name: { en: "Preview Student", ar: "معاينة الطالب" },
    instructorIds: ["preview_instructor"],
    enrolledCourseIds: [],
    approvalStatus: "approved",
    active: true,
    isPreview: true,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      const savedAdmin = localStorage.getItem("admin_session");
      if (savedAdmin) {
        try {
          return JSON.parse(savedAdmin);
        } catch {}
      }
      if (!isFirebaseConfigured) {
        const savedPreview = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
        if (savedPreview) {
          try {
            return JSON.parse(savedPreview);
          } catch {}
        }
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedAdmin = localStorage.getItem("admin_session");
    if (savedAdmin) {
      try {
        setUser(JSON.parse(savedAdmin));
        setLoading(false);
        return;
      } catch {
        localStorage.removeItem("admin_session");
      }
    }

    if (isFirebaseConfigured) {
      sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
    } else {
      const savedPreview = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
      if (savedPreview) {
        try {
          setUser(JSON.parse(savedPreview));
          setLoading(false);
          return undefined;
        } catch {
          sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
        }
      }
    }

    if (!auth) {
      setLoading(false);
      return undefined;
    }

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        const adminCheck = localStorage.getItem("admin_session");
        setUser(adminCheck ? JSON.parse(adminCheck) : null);
        setLoading(false);
        return;
      }
      try {
        const snap = await get(ref(rtdb, `users/${fbUser.uid}`));
        if (snap.exists()) {
          const profile = snap.val();
          if (profile.active === false) {
            await logoutAll();
            setUser(null);
          } else {
            setUser({ uid: fbUser.uid, ...profile });
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const login = async (identifier, password) => {
    sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
    const profile = await loginWithCredentials(identifier, password);
    if (profile.role === "admin") {
      localStorage.setItem("admin_session", JSON.stringify(profile));
    } else {
      localStorage.removeItem("admin_session");
    }
    setUser(profile);
    return profile;
  };

  const enterPreviewMode = (role) => {
    if (isFirebaseConfigured) return null;
    localStorage.removeItem("admin_session");
    const mockUser = buildPreviewUser(role === "instructor" ? "instructor" : "student");
    sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(mockUser));
    setUser(mockUser);
    return mockUser;
  };

  const refreshProfile = async () => {
    if (!user || user.isPreview) return;
    if (user.role === "admin" || user.uid === "admin_123") {
      try {
        const snap = await get(ref(rtdb, "admins/admin_123"));
        if (snap.exists()) {
          const updated = { ...user, ...snap.val(), role: "admin", uid: "admin_123" };
          setUser(updated);
          localStorage.setItem("admin_session", JSON.stringify(updated));
        }
      } catch (err) {
        console.warn("Failed to refresh admin profile:", err);
      }
      return;
    }
    const snap = await get(ref(rtdb, `users/${user.uid}`));
    if (snap.exists()) {
      setUser({ uid: user.uid, ...snap.val() });
    }
  };

  const logout = async () => {
    sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
    await logoutAll();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, login, logout, refreshProfile, enterPreviewMode }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

