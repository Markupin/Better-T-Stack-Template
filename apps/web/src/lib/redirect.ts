/** Only allow same-origin relative redirects (prevents open redirects). */
export function safeRedirect(target: unknown, fallback = "/dashboard"): string {
  if (typeof target !== "string") return fallback;
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\"))
    return fallback;
  return target;
}
