// RulesPanel is mounted once at the App root, outside the routed Lobby tree,
// so there's no shared context to reach it from deep components like
// Scoreboard. This is a minimal one-way pub-sub just for "open the panel and
// expand this rule" requests — deliberately NOT a general shared-state
// context (that pattern caused a real z-index bug here before; see
// RulesPanel's isActive comment).
const listeners = new Set();

export function requestOpenRule(ruleTitle) {
  for (const fn of listeners) fn(ruleTitle);
}

export function onOpenRuleRequest(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
