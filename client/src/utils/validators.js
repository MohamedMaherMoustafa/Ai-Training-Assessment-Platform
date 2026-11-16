/**
 * Username validation helper for AI Training & Assessment Platform
 * Requirements:
 * 1. Not less than 8 characters (length >= 8).
 * 2. Allowed characters are ONLY letters, numbers, and the special characters (@ or _).
 * 3. Must contain at least one special character from the allowed set (@ or _).
 */
export function validateUsername(username, lang = "en") {
  const clean = String(username || "").trim();

  // 1. Not less than 8 characters
  if (!clean || clean.length < 8) {
    return {
      isValid: false,
      code: "TOO_SHORT",
      error:
        lang === "ar"
          ? "اسم المستخدم يجب ألا يقل عن 8 أحرف."
          : "Username must be at least 8 characters long.",
    };
  }

  // 2. Allowed characters: only alphanumeric and the special characters @ or _
  // Strictly prevent spaces, hyphens, periods, or other special symbols
  if (/[^a-zA-Z0-9@_]/.test(clean)) {
    return {
      isValid: false,
      code: "INVALID_CHARACTERS",
      error:
        lang === "ar"
          ? "اسم المستخدم يمكن أن يحتوي فقط على أحرف وأرقام والرموز الخاصة (@ أو _) دون مسافات أو رموز أخرى."
          : "Username can only contain letters, numbers, and the special characters (@ or _). No spaces or other symbols are allowed.",
    };
  }

  // 3. Must contain at least one special character (@ or _)
  if (!/[@_]/.test(clean)) {
    return {
      isValid: false,
      code: "MISSING_SPECIAL_CHAR",
      error:
        lang === "ar"
          ? "اسم المستخدم يجب أن يحتوي على رمز خاص واحد على الأقل (@ أو _)."
          : "Username must contain at least one special character (@ or _).",
    };
  }

  return { isValid: true, clean };
}
