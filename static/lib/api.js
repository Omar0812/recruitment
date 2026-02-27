// ── Toast helper ──────────────────────────────────────────────────────────────
export function showToast(msg, type = "info") {
  const cls = { success: "toast-success", error: "toast-error", info: "toast-info" };
  const el = document.createElement("div");
  el.textContent = msg;
  el.className = "toast " + (cls[type] || cls.info);
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 300); }, 2000);
}

// ── API helpers ──────────────────────────────────────────────────────────────
export const api = {
  get: (url) => fetch(url).then(r => {
    if (!r.ok) return r.json().then(d => { showToast(d.detail || "请求失败", "error"); throw new Error(d.detail); });
    return r.json();
  }),
  post: (url, data) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => {
    if (!r.ok) return r.json().then(d => { showToast(d.detail || "操作失败", "error"); throw new Error(d.detail); });
    return r.json();
  }),
  patch: (url, data) => fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => {
    if (!r.ok) return r.json().then(d => { showToast(d.detail || "保存失败", "error"); throw new Error(d.detail); });
    return r.json();
  }),
  delete: (url) => fetch(url, { method: "DELETE" }).then(r => {
    if (!r.ok) return r.json().then(d => { showToast(d.detail || "删除失败", "error"); throw new Error(d.detail); });
    return r.json();
  }),
};

// ── withLoading helper ────────────────────────────────────────────────────────
export async function withLoading(btn, asyncFn) {
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = "保存中...";
  try {
    await asyncFn();
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}
