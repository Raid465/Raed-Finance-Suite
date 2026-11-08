// Colors used by the stock comparison UI and chart tooltips.

export const C = {
  s1: "#4f8cff", s2: "#fb923c", bg: "#0f1117",
  card: "#222640", border: "#2e3350",
  text: "#e8e8f0", muted: "#a0a0b8",
  green: "#34d399", red: "#f87171",
};

export const tip = {
  contentStyle: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 13 },
  itemStyle: { color: C.text },
  labelStyle: { color: C.muted },
};
