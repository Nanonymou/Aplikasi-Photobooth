/**
 * Object/page id generator.
 *
 * Ids are only ever minted from client interactions, so `crypto.randomUUID` is
 * safe here — seed data ships with hardcoded ids so server and client render the
 * same tree.
 */
export function createId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);

  return `${prefix}_${uuid.slice(0, 8)}`;
}
