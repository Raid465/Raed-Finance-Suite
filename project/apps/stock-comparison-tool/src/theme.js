// Colors used by the stock comparison UI and chart tooltips.
// Clean Light theme - same tokens as project/design-system/tokens.css.

export const C = {
  s1: "#2563eb", s2: "#ea580c", bg: "#f6f7f9",
  card: "#ffffff", border: "#e3e6eb",
  text: "#1a1f2b", muted: "#5b6472",
  green: "#15803d", red: "#dc2626",
};

export const tip = {
  contentStyle: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 13, boxShadow: "0 4px 16px rgba(15,23,42,.08)" },
  itemStyle: { color: C.text },
  labelStyle: { color: C.muted },
};
