import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((k) => `${JSON.stringify(k)}:${canonicalize(record[k])}`).join(",")}}`;
}
export function sha256(value: unknown): string {
  const input = typeof value === "string" ? value : Buffer.isBuffer(value) ? value : ArrayBuffer.isView(value as ArrayBufferView) ? Buffer.from((value as ArrayBufferView).buffer, (value as ArrayBufferView).byteOffset, (value as ArrayBufferView).byteLength) : canonicalize(value);
  return createHash("sha256").update(input).digest("hex");
}

function env(key: string) { return process.env[key]?.trim() || undefined; }
function keyPem(name: "PRIVATE" | "PUBLIC") {
  const pem = env(`HODGEFORM_RECEIPT_${name}_KEY_PEM`);
  if (pem) return pem.replace(/\\n/g, "\n");
  const b64 = env(`HODGEFORM_RECEIPT_${name}_KEY_B64`);
  return b64 ? Buffer.from(b64, "base64").toString("utf8") : undefined;
}
export function releaseKeyConfigured() { try { requireReleaseKeys(); return true; } catch { return false; } }
export function requireReleaseKeys() {
  const privatePem = keyPem("PRIVATE");
  const publicPem = keyPem("PUBLIC");
  if (!privatePem || !publicPem) throw new Error("Release authority keys are not configured");
  const privateKey = createPrivateKey(privatePem);
  const publicKey = createPublicKey(publicPem);
  const derivedPublic = createPublicKey(privateKey);
  const configuredDer = Buffer.from(publicKey.export({ type: "spki", format: "der" }));
  const derivedDer = Buffer.from(derivedPublic.export({ type: "spki", format: "der" }));
  if (!configuredDer.equals(derivedDer)) throw new Error("Release authority public/private keys do not form a valid pair");
  const fingerprint = sha256(configuredDer);
  return { privateKey, publicKey, fingerprint, signerId: env("HODGEFORM_SIGNER_ID") ?? "hodgeform-release-authority" };
}
export function signReceipt(payload: Record<string, unknown>) {
  const keys = requireReleaseKeys();
  const canonical = canonicalize(payload);
  const receiptHash = sha256(canonical);
  const signatureB64 = sign(null, Buffer.from(canonical), keys.privateKey).toString("base64");
  return { receiptHash, signatureB64, publicKeyFingerprint: keys.fingerprint, signerId: keys.signerId };
}
export function verifyReceipt(payload: Record<string, unknown>, signatureB64: string, publicKeyPem: string) {
  return verify(null, Buffer.from(canonicalize(payload)), createPublicKey(publicKeyPem), Buffer.from(signatureB64, "base64"));
}

export function verifySignedReceiptDocument(document: unknown) {
  if (!document || typeof document !== "object") return { ok: false, reason: "Receipt document must be an object" };
  const doc = document as Record<string, unknown>;
  if (doc.schema !== "hodgeform-signed-release/1") return { ok: false, reason: "Unsupported receipt schema" };
  const payload = doc.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { ok: false, reason: "Receipt payload is missing" };
  const receiptHash = typeof doc.receiptHash === "string" ? doc.receiptHash.toLowerCase() : "";
  const signature = typeof doc.signature === "string" ? doc.signature : "";
  const publicKeyFingerprint = typeof doc.publicKeyFingerprint === "string" ? doc.publicKeyFingerprint.toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/.test(receiptHash) || !signature || !/^[a-f0-9]{64}$/.test(publicKeyFingerprint)) return { ok: false, reason: "Receipt hash, signature, or signer fingerprint is malformed" };
  const keys = requireReleaseKeys();
  if (publicKeyFingerprint !== keys.fingerprint.toLowerCase()) return { ok: false, reason: "Receipt signer fingerprint does not match this deployment's configured release authority" };
  const canonical = canonicalize(payload);
  const computedHash = sha256(canonical);
  if (computedHash !== receiptHash) return { ok: false, reason: "Receipt payload hash mismatch", receiptHash };
  const signatureValid = verify(null, Buffer.from(canonical), keys.publicKey, Buffer.from(signature, "base64"));
  if (!signatureValid) return { ok: false, reason: "Receipt signature is invalid", receiptHash };
  const verdict = typeof (payload as Record<string, unknown>).verdict === "string" ? String((payload as Record<string, unknown>).verdict) : "UNKNOWN";
  if (verdict !== "RELEASE") return { ok: false, reason: `Receipt verdict is ${verdict}; it is not releasable`, verdict, receiptHash };
  return { ok: true, verdict, receiptHash };
}

export function generateReleaseKeys() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    fingerprint: sha256(publicKey.export({ type: "spki", format: "der" })),
  };
}
