const PLACEHOLDER_ORIGIN = "https://mhungry.invalid";

/**
 * Returns a same-origin path that is safe to pass to `location.replace()`.
 *
 * Rejects protocol-relative URLs (`//evil.com`), backslash variants that
 * browsers normalise to `//` (`/\evil.com`), and control characters that the
 * URL parser strips (`/\t/evil.com`). Anything else falls back to `fallback`.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const url = new URL(value, PLACEHOLDER_ORIGIN);
    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
