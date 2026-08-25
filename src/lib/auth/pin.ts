import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Hashing for short secrets people type.
 *
 * A four-digit PIN has ten thousand possible values, so a bare digest of it is
 * a lookup table, not a hash. scrypt is deliberately slow and memory-hard: it
 * turns "try every PIN" from an instant into something that costs real hardware
 * time, which is the only defence a short secret can have once its hash is out.
 *
 * The parameters travel with the hash, so raising the cost later does not
 * invalidate PINs already stored — an old hash still says how it was made.
 */

/** ~64 MB and a few hundred milliseconds; a person typing a PIN will not notice. */
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLEL = 1;
const KEY_BYTES = 32;
const SALT_BYTES = 16;

function derive(
  pin: string,
  salt: Buffer,
  cost: number,
  blockSize: number,
  parallel: number,
): Promise<Buffer> {
  // Promisified by hand: `util.promisify` picks scrypt's three-argument
  // overload, which leaves no room for the cost parameters.
  return new Promise((resolve, reject) => {
    scrypt(
      pin.normalize("NFKC"),
      salt,
      KEY_BYTES,
      {
        N: cost,
        r: blockSize,
        p: parallel,
        // Node caps scrypt's memory at 32 MB by default, which N=16384 exceeds.
        maxmem: 256 * 1024 * 1024,
      },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

/** `scrypt$N$r$p$salt$key`, all hex — self-describing, so it can outlive these constants. */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(pin, salt, COST, BLOCK_SIZE, PARALLEL);

  return [
    "scrypt",
    COST,
    BLOCK_SIZE,
    PARALLEL,
    salt.toString("hex"),
    key.toString("hex"),
  ].join("$");
}

/**
 * Checks a PIN against a stored hash.
 *
 * Compared with `timingSafeEqual`: a comparison that returns early on the first
 * wrong byte tells an attacker how much of their guess was right, which is
 * exactly the leak that makes a small key space smaller.
 */
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, cost, blockSize, parallel, saltHex, keyHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  if (salt.length === 0 || expected.length !== KEY_BYTES) return false;

  try {
    const actual = await derive(
      pin,
      salt,
      Number(cost),
      Number(blockSize),
      Number(parallel),
    );
    return timingSafeEqual(actual, expected);
  } catch {
    // A malformed stored hash is a failed check, never an open door.
    return false;
  }
}
