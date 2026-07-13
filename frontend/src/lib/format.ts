/**
 * Render a phone number as a readable string.
 * Fixes values that arrived in scientific/exponential notation (e.g. "9.19034E+11"),
 * which happens when a phone is parsed as a float during import.
 */
export function formatPhone(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let s = String(value).trim();
  if (!s) return "";
  // Expand scientific notation back to a full integer string.
  if (/^[+-]?\d+(\.\d+)?e[+-]?\d+$/i.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) {
      s = n.toLocaleString("fullwide", { useGrouping: false });
    }
  }
  return s;
}
