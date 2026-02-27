// ── Time helpers ──────────────────────────────────────────────────────────────
export function formatTime(isoStr) {
  if (!isoStr) return "-";
  const d = new Date(isoStr.endsWith("Z") ? isoStr : isoStr + "Z");
  if (isNaN(d)) return "-";
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(isoStr) {
  if (!isoStr) return "-";
  const d = new Date(isoStr.endsWith("Z") ? isoStr : isoStr + "Z");
  if (isNaN(d)) return "-";
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

export function formatStage(stage) {
  if (!stage) return "-";
  return stage;
}
