export async function copyToClipboard(text) {
  const value = String(text || "").trim();
  if (!value) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall back for HTTP / older mobile browsers.
    }
  }

  if (typeof document === "undefined") return false;

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, value.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

export function buildInviteShareUrl(inviteCode, apiShareUrl = "") {
  const code = String(inviteCode || "").trim();
  if (!code) return String(apiShareUrl || "").trim();

  if (typeof window === "undefined") {
    return String(apiShareUrl || "").trim();
  }

  const localUrl = `${window.location.origin}/register?ref=${encodeURIComponent(code)}`;
  const remote = String(apiShareUrl || "").trim();
  if (!remote) return localUrl;

  try {
    const remoteHost = new URL(remote).hostname;
    const localHost = window.location.hostname;
    if (
      (remoteHost === "localhost" || remoteHost === "127.0.0.1") &&
      localHost !== "localhost" &&
      localHost !== "127.0.0.1"
    ) {
      return localUrl;
    }
  } catch {
    return localUrl;
  }

  return remote;
}
