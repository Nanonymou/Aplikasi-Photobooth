/**
 * Up to two initials for an avatar fallback, from the first and last word of a
 * name. A plain util (no client boundary) so both client avatars and server-
 * rendered lists can use it.
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}
