import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, rtdb } from "../lib/firebase";
import { loginWithCredentials, logoutAll } from "../services/platformService";

const AuthContext = createContext(null);

export const DEFAULT_PLATFORM_USER = {
  uid: "student_default",
  username: "student",
  displayName: "Student",
  name: { en: "Student", ar: "طالب" },
  email: "student@athar.ai",
  role: "student",
  active: true,
  approvalStatus: "approved",
  isGuest: true,
  instructorIds: ["inst_1"],
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      const savedAdmin = localStorage.getItem("admin_session");
      if (savedAdmin) {
        try {
          return JSON.parse(savedAdmin);
        } catch {}
      }
    }
    return DEFAULT_PLATFORM_USER;
  });
  const [loading, setLoading] = useState(false);

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

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        const adminCheck = localStorage.getItem("admin_session");
        setUser(adminCheck ? JSON.parse(adminCheck) : DEFAULT_PLATFORM_USER);
        setLoading(false);
        return;
      }
      try {
        const snap = await get(ref(rtdb, `users/${fbUser.uid}`));
        if (snap.exists()) {
          const profile = snap.val();
          if (profile.active === false) {
            await logoutAll();
            setUser(DEFAULT_PLATFORM_USER);
          } else {
            setUser({ uid: fbUser.uid, ...profile });
          }
        } else {
          setUser(DEFAULT_PLATFORM_USER);
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
        setUser(DEFAULT_PLATFORM_USER);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const login = async (identifier, password) => {
    const profile = await loginWithCredentials(identifier, password);
    if (profile.role === "admin") {
      localStorage.setItem("admin_session", JSON.stringify(profile));
    } else {
      localStorage.removeItem("admin_session");
    }
    setUser(profile);
    return profile;
  };

  const refreshProfile = async () => {
    if (!user) return;
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
    await logoutAll();
    setUser(DEFAULT_PLATFORM_USER);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

