const KEY = "texassmashem:session";

export function saveSession(code, playerId) {
  localStorage.setItem(KEY, JSON.stringify({ code, playerId }));
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
