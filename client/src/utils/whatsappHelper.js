/**
 * WhatsApp Integration Helper for AI Training & Assessment Platform
 * Handles conversion of Egyptian phone numbers to international format (+20)
 * and generates pre-populated WhatsApp chat URLs that require manual sending.
 */

export const SUPPORT_MESSAGE_TEMPLATE =
  "We detected that you may need support based on our platform's tracking. We are contacting you to understand how we can help you. Please let us know if there is anything you need assistance with.";

export const SUPPORT_MESSAGE_TEMPLATE_AR =
  "لاحظنا أنك قد تحتاج إلى دعم بناءً على متابعة المنصة لأدائك. نتواصل معك لمعرفة كيف يمكننا مساعدتك. يُرجى إعلامنا إذا كان هناك أي شيء تحتاج إلى مساعدة بشأنه.";

/**
 * Converts Egyptian mobile numbers into the international format required by WhatsApp.
 * - Standard 11-digit Egyptian mobile number: 01XXXXXXXXX (e.g. 01012345678, 011..., 012..., 015...)
 * - Output format: 201XXXXXXXXX (without +, spaces, or dashes)
 */
export function formatEgyptianPhoneForWhatsApp(phone) {
  if (!phone) return "";
  // Strip any non-digit characters
  let digits = String(phone).replace(/\D/g, "").trim();

  // If standard Egyptian 11 digits starting with '0' (e.g. 01012345678)
  if (digits.length === 11 && digits.startsWith("0")) {
    return `20${digits.slice(1)}`;
  }

  // If 10 digits without leading '0' (e.g. 1012345678)
  if (digits.length === 10 && digits.startsWith("1")) {
    return `20${digits}`;
  }

  // If 12 digits starting with '20' (e.g. 201012345678)
  if (digits.length === 12 && digits.startsWith("20")) {
    return digits;
  }

  // If starts with '0', replace leading 0 with 20
  if (digits.startsWith("0")) {
    return `20${digits.slice(1)}`;
  }

  // Default fallback: prepend 20 if not already present
  if (!digits.startsWith("20")) {
    return `20${digits}`;
  }

  return digits;
}

/**
 * Builds the WhatsApp web / app link with pre-populated message.
 * IMPORTANT: This only prepares the message inside WhatsApp.
 * It NEVER sends automatically — the instructor must manually press Send.
 */
export function buildWhatsAppSupportUrl(phone, customMessage = null, lang = "en") {
  const intlNumber = formatEgyptianPhoneForWhatsApp(phone);
  if (!intlNumber) return null;
  const message =
    customMessage ||
    (lang === "ar" ? SUPPORT_MESSAGE_TEMPLATE_AR : SUPPORT_MESSAGE_TEMPLATE);
  return `https://wa.me/${intlNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Opens WhatsApp chat in a new tab with the prepared support message.
 * Returns true if opened, false if phone is missing or invalid.
 */
export function openWhatsAppSupportChat(phone, customMessage = null, lang = "en") {
  const url = buildWhatsAppSupportUrl(phone, customMessage, lang);
  if (!url) return false;
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  return true;
}
