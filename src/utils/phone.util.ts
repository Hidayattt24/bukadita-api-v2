// Phone number utility functions
/**
 * Normalize Indonesian phone number to international format
 * Supports: 0xxx, 62xxx, +62xxx
 * Output: +62xxx
 */
export const normalizePhone = (phone: string): string => {
  if (!phone) return "";

  // Remove all spaces, dashes, parentheses
  let normalized = phone.replace(/[\s\-\(\)]/g, "");

  // Handle different formats
  if (normalized.startsWith("0")) {
    // 0812xxx → +62812xxx
    normalized = "+62" + normalized.slice(1);
  } else if (normalized.startsWith("62")) {
    // 62812xxx → +62812xxx
    normalized = "+" + normalized;
  } else if (!normalized.startsWith("+")) {
    // 812xxx → +62812xxx
    normalized = "+62" + normalized;
  }

  return normalized;
};

/**
 * Validate Indonesian phone number format
 * Valid formats: 0xxx, 62xxx, +62xxx
 * Length: 10-13 digits after country code
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone) return false;

  const normalized = normalizePhone(phone);

  // Check format: +62 followed by 9-12 digits
  const phoneRegex = /^\+62[0-9]{9,12}$/;
  return phoneRegex.test(normalized);
};

/**
 * Get all possible phone formats for database query
 * Input: 081234567890
 * Output: ['+6281234567890', '6281234567890', '081234567890']
 */
export const getPhoneVariants = (phone: string): string[] => {
  if (!phone) return [];

  const normalized = normalizePhone(phone);
  const without62 = normalized.replace("+62", "62");
  const with0 = "0" + normalized.replace("+62", "");

  return [normalized, without62, with0];
};

/**
 * Format phone for display
 * +628123456789 → 0812-3456-789
 */
export const formatPhoneDisplay = (phone: string): string => {
  if (!phone) return "";

  const normalized = normalizePhone(phone);
  const without62 = normalized.replace("+62", "");

  // Format as: 0xxx-xxxx-xxx(x)
  if (without62.length >= 10) {
    return `0${without62.slice(0, 3)}-${without62.slice(3, 7)}-${without62.slice(7)}`;
  }

  return "0" + without62;
};

/**
 * Check if string is likely a phone number
 */
export const isPhoneNumber = (identifier: string): boolean => {
  if (!identifier) return false;

  // Remove spaces and dashes
  const cleaned = identifier.replace(/[\s\-\(\)]/g, "");

  // Check if starts with valid phone prefixes
  return (
    cleaned.startsWith("0") ||
    cleaned.startsWith("62") ||
    cleaned.startsWith("+62") ||
    /^[0-9]{9,13}$/.test(cleaned)
  );
};

/**
 * Check if string is email
 */
export const isEmail = (identifier: string): boolean => {
  if (!identifier) return false;
  return (
    identifier.includes("@") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)
  );
};

/**
 * Determine identifier type
 */
export const getIdentifierType = (
  identifier: string
): "email" | "phone" | "unknown" => {
  if (isEmail(identifier)) return "email";
  if (isPhoneNumber(identifier)) return "phone";
  return "unknown";
};

// Export for testing
export const phoneUtil = {
  normalizePhone,
  validatePhone,
  getPhoneVariants,
  formatPhoneDisplay,
  isPhoneNumber,
  isEmail,
  getIdentifierType,
};

export default phoneUtil;
