const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export const sha256Hex = async (text) => {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    // Server rendering should not attempt verification; return empty string.
    return "";
  }
  const data = new TextEncoder().encode(String(text ?? ""));
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
};

export const verifyServerSeed = async ({ serverSeed, serverSeedHash }) => {
  if (!serverSeed || !serverSeedHash) return { ok: false, reason: "missing" };
  const digest = await sha256Hex(serverSeed);
  if (!digest) return { ok: false, reason: "unavailable" };
  return { ok: digest.toLowerCase() === String(serverSeedHash).toLowerCase(), digest };
};

export const formatProvablyFair = (pf) => {
  if (!pf) return null;
  return {
    serverSeedHash: pf.serverSeedHash || pf.server_seed_hash || "",
    serverSeed: pf.serverSeed || pf.server_seed || "",
    clientSeed: pf.clientSeed || pf.client_seed || "",
    nonce: pf.nonce ?? pf.round ?? pf.roll ?? null,
  };
};

