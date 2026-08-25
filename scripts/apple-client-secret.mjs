#!/usr/bin/env node
/**
 * Mints the "client secret" Sign in with Apple expects.
 *
 * Apple is the odd one out: every other provider hands you a secret string to
 * paste once. Apple hands you a signing key and expects a short-lived JWT,
 * signed ES256, that you regenerate at most every six months. Doing that by
 * hand — base64url, the exact claim set, the `kid` header — is exactly the sort
 * of fiddly job that gets done wrong at the moment sign-in is already broken.
 *
 *   node scripts/apple-client-secret.mjs \
 *     --team-id ABCDE12345 \
 *     --key-id FGHIJ67890 \
 *     --services-id id.framestudio.signin \
 *     --key ./AuthKey_FGHIJ67890.p8
 *
 * Prints the JWT on stdout and nothing else, so it can be piped or captured.
 */
import { createSign, createPrivateKey } from "node:crypto";
import { readFile } from "node:fs/promises";

/** Apple's ceiling. Going longer is rejected outright. */
const MAX_LIFETIME_SECONDS = 60 * 60 * 24 * 180;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    if (!flag?.startsWith("--")) continue;
    args[flag.slice(2)] = argv[i + 1];
  }
  return args;
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Node signs ES256 in DER; JWT wants the raw r||s pair. Without this the token
 * is silently rejected by Apple as malformed rather than as unsigned, which is
 * a memorably unhelpful hour to spend.
 */
function derToJose(der) {
  let offset = 2;
  if (der[1] & 0x80) offset += der[1] & 0x7f;

  const readInt = () => {
    const length = der[offset + 1];
    let value = der.subarray(offset + 2, offset + 2 + length);
    offset += 2 + length;
    // Strip the sign byte DER adds, then left-pad to the curve's 32 bytes.
    while (value.length > 32 && value[0] === 0) value = value.subarray(1);
    return Buffer.concat([Buffer.alloc(32 - value.length), value]);
  };

  return Buffer.concat([readInt(), readInt()]);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const missing = ["team-id", "key-id", "services-id", "key"].filter(
    (flag) => !args[flag],
  );

  if (missing.length > 0) {
    console.error(`Missing: ${missing.map((f) => `--${f}`).join(", ")}`);
    console.error(
      "Usage: node scripts/apple-client-secret.mjs --team-id … --key-id … --services-id … --key ./AuthKey_….p8",
    );
    process.exit(1);
  }

  const pem = await readFile(args.key, "utf8");
  const key = createPrivateKey(pem);

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: args["key-id"] };
  const payload = {
    iss: args["team-id"],
    iat: now,
    exp: now + MAX_LIFETIME_SECONDS,
    aud: "https://appleid.apple.com",
    sub: args["services-id"],
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload),
  )}`;

  const signer = createSign("SHA256");
  signer.update(signingInput);
  const signature = derToJose(signer.sign(key));

  process.stdout.write(`${signingInput}.${base64url(signature)}\n`);

  const expires = new Date(payload.exp * 1000).toISOString().slice(0, 10);
  console.error(`Expires ${expires} — regenerate before then.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
