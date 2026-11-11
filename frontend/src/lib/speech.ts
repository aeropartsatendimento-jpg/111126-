// Browser text-to-speech helpers (Web Speech API). pt-BR voice, chunked so
// long texts don't get cut off, markdown stripped.

export const TTS_SUPPORTED = typeof window !== "undefined" && "speechSynthesis" in window;

function chunks(text: string): string[] {
  const clean = text.replace(/\*\*/g, "").replace(/\[(modo simulado)\]/gi, "").trim();
  const parts = clean.split(/(?<=[.!?\n])\s+/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let buf = "";
  for (const p of parts) {
    if ((buf + " " + p).length > 220 && buf) {
      out.push(buf);
      buf = p;
    } else {
      buf = buf ? `${buf} ${p}` : p;
    }
  }
  if (buf) out.push(buf);
  return out;
}

export function speak(text: string, onEnd?: () => void): void {
  if (!TTS_SUPPORTED) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const list = chunks(text);
  if (list.length === 0) {
    onEnd?.();
    return;
  }
  list.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    u.lang = "pt-BR";
    u.rate = 1.03;
    if (i === list.length - 1 && onEnd) {
      u.onend = () => onEnd();
      u.onerror = () => onEnd();
    }
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking(): void {
  if (TTS_SUPPORTED) window.speechSynthesis.cancel();
}
