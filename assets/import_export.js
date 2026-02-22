// Export embeds JSON inside LaTeX so re-import restores all UI state perfectly.

export function encodeStateToComment(state) {
  const json = JSON.stringify(state);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return `%% CVMAKER_JSON: ${b64}\n`;
}

export function tryDecodeStateFromTex(texContent) {
  const m = texContent.match(/%%\s*CVMAKER_JSON:\s*([A-Za-z0-9+/=]+)\s*/);
  if (!m) return null;
  try {
    const json = decodeURIComponent(escape(atob(m[1])));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(fr.error);
    fr.readAsText(file);
  });
}

export async function readFileAsUint8(file) {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}
