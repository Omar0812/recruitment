// ── API helpers ──────────────────────────────────────────────────────────────
const api = {
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

// ── Time helpers ──────────────────────────────────────────────────────────────
function formatTime(isoStr) {
  if (!isoStr) return "-";
  const d = new Date(isoStr.endsWith("Z") ? isoStr : isoStr + "Z");
  if (isNaN(d)) return "-";
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Toast helper ──────────────────────────────────────────────────────────────
function showToast(msg, type = "info") {
  const cls = { success: "toast-success", error: "toast-error", info: "toast-info" };
  const el = document.createElement("div");
  el.textContent = msg;
  el.className = "toast " + (cls[type] || cls.info);
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 300); }, 2000);
}

// ── withLoading helper ────────────────────────────────────────────────────────
async function withLoading(btn, asyncFn) {
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

// ── Dialog helpers ────────────────────────────────────────────────────────────
function openDialog(title, contentHTML, options = {}) {
  const overlay = document.getElementById("dialog-overlay");
  document.getElementById("dialog-title").textContent = title;
  document.getElementById("dialog-body").innerHTML = contentHTML;
  const footer = document.getElementById("dialog-footer");
  footer.innerHTML = "";
  if (options.onConfirm) {
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-secondary";
    cancelBtn.textContent = options.cancelText || "取消";
    cancelBtn.onclick = closeDialog;
    footer.appendChild(cancelBtn);
    const confirmBtn = document.createElement("button");
    confirmBtn.className = "btn " + (options.confirmClass || "btn-primary");
    confirmBtn.textContent = options.confirmText || "确认";
    confirmBtn.onclick = options.onConfirm;
    footer.appendChild(confirmBtn);
  }
  overlay.classList.remove("hidden");
  document.getElementById("dialog-close-btn").onclick = closeDialog;
  if (options.onOpen) options.onOpen();
}

function closeDialog() {
  const overlay = document.getElementById("dialog-overlay");
  overlay.classList.add("hidden");
  document.getElementById("dialog-body").innerHTML = "";
  document.getElementById("dialog-footer").innerHTML = "";
}

// ── Interview overlay (for kanban) ────────────────────────────────────────────

// Shared rejection reason form renderer
function renderRejectionReasonForm(prefix, currentReason) {
  const presetReasons = ["技术/专业能力不达标","综合素质不匹配","经验年限不足","薪资期望差距过大","候选人主动放弃","地点/出行不接受","背调未通过","入职前反悔"];
  const isCustomReason = currentReason && !presetReasons.includes(currentReason);
  const groups = [
    { label: "能力维度", items: ["技术/专业能力不达标","综合素质不匹配","经验年限不足"] },
    { label: "意愿维度", items: ["薪资期望差距过大","候选人主动放弃","地点/出行不接受"] },
    { label: "流程维度", items: ["背调未通过","入职前反悔","其他"] },
  ];
  const btnsHTML = groups.map(g => `
    <div style="font-size:11px;color:#888;margin:2px 0">${g.label}</div>
    <div class="action-btn-group" style="flex-wrap:wrap;margin-bottom:4px">
      ${g.items.map(v => {
        const isActive = v === "其他" ? isCustomReason : currentReason === v;
        return `<button type="button" class="${prefix}-reason-btn iv-reason-btn${isActive?" active":""}" data-v="${v}">${v}</button>`;
      }).join("")}
    </div>`).join("");
  return `
    <label>淘汰原因</label>
    ${btnsHTML}
    <input class="${prefix}-rejection-reason" type="hidden" value="${currentReason||""}">
    <input class="${prefix}-rejection-reason-other" type="text" placeholder="请填写原因" class="${isCustomReason ? "" : "hidden"}" style="margin-top:8px;padding:5px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;width:100%;box-sizing:border-box" value="${isCustomReason ? currentReason : ""}">`;
}

function bindRejectionReasonForm(container, prefix) {
  container.querySelectorAll(`.${prefix}-reason-btn`).forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(`.${prefix}-reason-btn`).forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      container.querySelector(`.${prefix}-rejection-reason`).value = btn.dataset.v;
      const otherInput = container.querySelector(`.${prefix}-rejection-reason-other`);
      if (otherInput) btn.dataset.v === "其他" ? otherInput.classList.remove("hidden") : otherInput.classList.add("hidden");
    });
  });
  const otherInput = container.querySelector(`.${prefix}-rejection-reason-other`);
  if (otherInput) {
    otherInput.oninput = () => { container.querySelector(`.${prefix}-rejection-reason`).value = otherInput.value; };
  }
}

function openInterviewOverlay(linkId, round, stage, onSave) {
  const timeSlotOptions = [];
  for (let h = 8; h <= 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 22 && m > 0) break;
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      timeSlotOptions.push(`<option value="${hh}:${mm}">${hh}:${mm}</option>`);
    }
  }

  const html = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <span id="dlg-iv-round-label" style="font-size:13px;color:var(--c-accent);font-weight:600;background:#e0e7ff;padding:3px 10px;border-radius:12px">${round || ""}</span>
    </div>
    <div class="form-grid" style="margin-top:4px">
      <div class="form-group">
        <label>面试官</label>
        <input id="dlg-iv-interviewer" placeholder="面试官姓名">
      </div>
      <div class="form-group">
        <label>面试时间</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="dlg-iv-time-date" type="date" style="flex:1;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px">
          <select id="dlg-iv-time-slot" style="flex:1;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;background:#fff">${timeSlotOptions.join("")}</select>
        </div>
      </div>
      <div class="form-group form-full">
        <label>评分</label>
        <div id="dlg-iv-score-stars" style="display:flex;gap:4px;margin-top:6px">
          <span class="iv-star" data-v="1">★</span>
          <span class="iv-star" data-v="2">★</span>
          <span class="iv-star" data-v="3">★</span>
          <span class="iv-star" data-v="4">★</span>
          <span class="iv-star" data-v="5">★</span>
          <span id="dlg-iv-score-clear" style="font-size:12px;color:#bbb;cursor:pointer;align-self:center;margin-left:6px">清除</span>
        </div>
        <input id="dlg-iv-score" type="hidden">
      </div>
      <div class="form-group form-full">
        <label>评语</label>
        <textarea id="dlg-iv-comment" style="min-height:60px"></textarea>
      </div>
      <div class="form-group form-full">
        <label>结论</label>
        <div class="action-btn-group" style="margin-top:6px">
          <button type="button" class="iv-conclusion-btn dlg-iv-conclusion-btn" data-v="">待定</button>
          <button type="button" class="iv-conclusion-btn dlg-iv-conclusion-btn" data-v="通过">通过</button>
          <button type="button" class="iv-conclusion-btn iv-conclusion-reject dlg-iv-conclusion-btn" data-v="淘汰">淘汰</button>
        </div>
        <input id="dlg-iv-conclusion" type="hidden">
      </div>
      <div class="form-group form-full hidden" id="dlg-iv-rejection-block">
        ${renderRejectionReasonForm("dlg-iv", "")}
      </div>
    </div>`;

  openDialog("填写面评", html, {
    confirmText: "保存",
    onConfirm: async () => {
      const rejection_reason = document.getElementById("dlg-iv-rejection-reason")?.value || null;
      const conclusion = document.getElementById("dlg-iv-conclusion").value || null;
      const dateVal = document.getElementById("dlg-iv-time-date").value;
      const slotVal = document.getElementById("dlg-iv-time-slot").value;
      const interview_time = dateVal ? `${dateVal}T${slotVal}:00` : null;
      await api.post("/api/activities", {
        link_id: parseInt(linkId),
        type: "interview",
        stage: stage || "",
        round: round || null,
        actor: document.getElementById("dlg-iv-interviewer").value || null,
        interview_time,
        score: parseInt(document.getElementById("dlg-iv-score").value) || null,
        comment: document.getElementById("dlg-iv-comment").value || null,
        conclusion,
        rejection_reason: rejection_reason || null,
        status: "completed",
      });
      if (conclusion === "淘汰") {
        await api.patch(`/api/pipeline/link/${linkId}/outcome`, { outcome: "rejected", rejection_reason: rejection_reason || null });
      }
      closeDialog();
      showToast("面试记录已保存", "success");
      if (onSave) onSave();
    },
    onOpen: () => {
      // stars
      const stars = document.querySelectorAll("#dlg-iv-score-stars .iv-star");
      stars.forEach(star => {
        star.addEventListener("mouseenter", () => {
          const v = parseInt(star.dataset.v);
          stars.forEach(s => s.classList.toggle("active", parseInt(s.dataset.v) <= v));
        });
        star.addEventListener("mouseleave", () => {
          const cur = parseInt(document.getElementById("dlg-iv-score").value) || 0;
          stars.forEach(s => s.classList.toggle("active", parseInt(s.dataset.v) <= cur));
        });
        star.addEventListener("click", () => {
          const v = parseInt(star.dataset.v);
          document.getElementById("dlg-iv-score").value = v;
          stars.forEach(s => s.classList.toggle("active", parseInt(s.dataset.v) <= v));
        });
      });
      document.getElementById("dlg-iv-score-clear").onclick = () => {
        document.getElementById("dlg-iv-score").value = "";
        stars.forEach(s => s.classList.remove("active"));
      };
      // conclusion buttons
      document.querySelectorAll(".dlg-iv-conclusion-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".dlg-iv-conclusion-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          document.getElementById("dlg-iv-conclusion").value = btn.dataset.v;
          const block = document.getElementById("dlg-iv-rejection-block");
          if (btn.dataset.v === "淘汰") { block.classList.remove("hidden"); } else {
            block.classList.add("hidden");
            document.getElementById("dlg-iv-rejection-reason").value = "";
            document.querySelectorAll(".dlg-iv-reason-btn").forEach(b => b.classList.remove("active"));
          }
        });
      });
      // rejection reason buttons (shared)
      bindRejectionReasonForm(document.getElementById("dlg-iv-rejection-block"), "dlg-iv");
    }
  });
}

// initInterviewOverlay is no longer needed (overlay is now dynamic)
function initInterviewOverlay() {}

// ── Form validation ───────────────────────────────────────────────────────────
function validateCandidateForm({ phone, email, age, years_exp }) {
  if (phone && !/^\d{11}$/.test(phone)) { showToast("手机号格式不正确（需11位数字）", "error"); return false; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast("邮箱格式不正确", "error"); return false; }
  if (age !== null && age !== undefined && age !== "" && (isNaN(age) || age < 1 || age > 100)) { showToast("年龄请填写 1-100 之间的数字", "error"); return false; }
  if (years_exp !== null && years_exp !== undefined && years_exp !== "" && (isNaN(years_exp) || years_exp < 0 || years_exp > 50)) { showToast("工作年限请填写 0-50 之间的数字", "error"); return false; }
  return true;
}

// ── Hired Page ───────────────────────────────────────────────────────────────
async function renderHiredPage(el) {
  el.innerHTML = `
    <div class="page-header"><h1>已入职</h1></div>
    <div class="filter-bar" style="margin-bottom:16px">
      <input id="hired-search" type="text" placeholder="搜索候选人姓名..." style="flex:1;min-width:200px;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;outline:none">
    </div>
    <div id="hired-content"><span class="spinner" style="margin:24px"></span></div>`;

  const items = await api.get("/api/pipeline/hired");
  const contentEl = document.getElementById("hired-content");
  if (!contentEl) return;

  function renderList(filter) {
    const filtered = filter
      ? items.filter(i => (i.candidate_name || "").includes(filter))
      : items;
    if (!filtered.length) {
      contentEl.innerHTML = '<div class="empty-state">暂无已入职人员</div>';
      return;
    }
    const today = new Date();
    const rows = filtered.map(i => {
      const startDate = i.start_date || "—";
      let days = "—";
      if (i.start_date) {
        const d = new Date(i.start_date);
        days = Math.max(0, Math.floor((today - d) / 86400000));
      }
      return `<tr>
        <td><a href="#/candidates/${i.candidate_id}">${i.candidate_name || "未知"}</a></td>
        <td>${i.job_title || "—"}</td>
        <td>${startDate}</td>
        <td>${days}</td>
        <td>${i.source || "—"}</td>
      </tr>`;
    }).join("");
    contentEl.innerHTML = `
      <table class="data-table">
        <thead><tr><th>姓名</th><th>入职岗位</th><th>入职日期</th><th>入职天数</th><th>来源</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  renderList();
  document.getElementById("hired-search").addEventListener("input", e => renderList(e.target.value.trim()));
}

// ── Router ────────────────────────────────────────────────────────────────────
let _talentStarredOnly = false; // persists across page navigations

function router() {
  // clean up pipeline tooltip if exists
  const tt = document.getElementById("pt-tooltip");
  if (tt) tt.remove();

  const hash = location.hash || "#/";
  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("active", hash.startsWith("#/" + el.dataset.page) || (hash === "#/" && el.dataset.page === "dashboard"));
  });
  const content = document.getElementById("page-content");
  if (hash === "#/" || hash === "#/dashboard") return renderDashboard(content);
  if (hash === "#/candidates" || hash === "#/pipeline" || hash.startsWith("#/pipeline?")) return renderPipelineTracking(content);
  if (hash === "#/hired") return renderHiredPage(content);
  if (hash.startsWith("#/candidates/")) return renderCandidateProfile(content, hash.split("/")[2]);
  if (hash === "#/talent") return renderTalentPool(content);
  if (hash === "#/analytics") return renderAnalytics(content);
  if (hash === "#/jobs") return renderJobList(content);
  if (hash.startsWith("#/jobs/edit/")) return renderJobForm(content, hash.split("/")[3]);
  if (/^#\/jobs\/\d+$/.test(hash)) return renderJobDetail(content, hash.split("/")[2]);
  if (hash === "#/jobs/new") return renderJobForm(content, null);
  if (hash === "#/settings") return renderSettings(content);
  content.innerHTML = '<div class="empty-state">页面不存在</div>';
}

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", async () => {
  initInterviewOverlay();
  const summary = await api.get("/api/dashboard/summary");
  const banner = document.getElementById("warning-banner");
  if (!summary.ai_configured) banner.classList.remove("hidden");
  router();
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function renderDashboard(el) {
  el.innerHTML = `
    <div class="page-header"><h1>首页</h1></div>
    <div class="upload-zone" id="upload-zone">
      <div class="upload-icon">📄</div>
      <strong>拖拽简历到这里，或点击上传</strong>
      <p>支持 PDF / Word / 图片（PNG、JPG）</p>
      <input type="file" id="file-input" style="display:none" accept=".pdf,.docx,.doc,.png,.jpg,.jpeg" multiple>
    </div>
    <div class="dashboard-grid">
      <div class="card" id="stale-card"><h2>今日待跟进</h2><div id="stale-list"><span class="spinner"></span></div></div>
      <div class="card" id="health-card"><h2>岗位健康度</h2><div id="health-list"><span class="spinner"></span></div></div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h2 style="margin:0">AI 建议</h2>
        <button class="btn btn-secondary btn-sm" id="refresh-insights">刷新建议</button>
      </div>
      <div id="insights-list"><p style="color:#999;font-size:14px">点击"刷新建议"获取 AI 洞察</p></div>
    </div>`;

  setupUploadZone();

  const summary = await api.get("/api/dashboard/summary");

  // Stale candidates
  const staleList = document.getElementById("stale-list");
  if (!summary.stale_candidates.length) {
    staleList.innerHTML = '<div class="empty-state" style="padding:16px">暂无需要跟进的候选人</div>';
  } else {
    staleList.innerHTML = summary.stale_candidates.map(s => `
      <div class="stale-item">
        <span class="days-badge">${s.days_stale}天</span>
        <a href="#/candidates/${s.candidate_id}">${s.candidate_name}</a>
        <span style="color:#999">·</span>
        <span style="color:#555">${s.job_title}</span>
        <span style="color:#bbb">${s.stage}</span>
      </div>`).join("");
  }

  // Job health
  const healthList = document.getElementById("health-list");
  if (!summary.job_health.length) {
    healthList.innerHTML = '<div class="empty-state" style="padding:16px">暂无开放岗位</div>';
  } else {
    healthList.innerHTML = summary.job_health.map(j => `
      <div class="job-health-row ${j.is_stale ? "stale" : ""}">
        <a href="#/jobs/${j.job_id}" style="font-weight:600;color:#1a1a2e;text-decoration:none">${j.title}</a>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:13px;color:#666">${j.active_count}人</span>
          ${j.days_inactive !== null ? `<span style="font-size:12px;color:#999">${j.days_inactive}天未动</span>` : ""}
          ${j.is_stale ? '<span class="stale-badge">需关注</span>' : ""}
        </div>
      </div>`).join("");
  }

  document.getElementById("refresh-insights").onclick = async () => {
    const insightsList = document.getElementById("insights-list");
    insightsList.innerHTML = '<span class="spinner"></span> 生成中...';
    const res = await api.post("/api/dashboard/insights", {});
    if (!res.insights.length) {
      insightsList.innerHTML = '<p style="color:#999;font-size:14px">暂无建议（可能是 AI 未配置或数据不足）</p>';
    } else {
      insightsList.innerHTML = res.insights.map(i => `<div class="insight-item">${i}</div>`).join("");
    }
  };
}

// ── Upload zone ───────────────────────────────────────────────────────────────
function setupUploadZone() {
  const zone = document.getElementById("upload-zone");
  const input = document.getElementById("file-input");
  if (!zone) return;

  zone.onclick = () => input.click();
  input.onchange = (e) => handleFiles(Array.from(e.target.files));

  zone.ondragover = (e) => { e.preventDefault(); zone.classList.add("drag-over"); };
  zone.ondragleave = () => zone.classList.remove("drag-over");
  zone.ondrop = (e) => {
    e.preventDefault();
    zone.classList.remove("drag-over");
    handleFiles(Array.from(e.dataTransfer.files));
  };
}

async function handleFiles(files) {
  for (const file of files) {
    await uploadAndConfirm(file);
  }
}

// ── 积木块辅助函数 ────────────────────────────────────────────────────────────
function renderEduBlock(edu = {}) {
  const div = document.createElement("div");
  div.className = "block-item";
  div.innerHTML = `
    <button type="button" class="block-del">×</button>
    <div class="form-grid" style="gap:8px">
      <div class="form-group"><label style="font-size:12px">学历</label><input class="edu-degree" placeholder="如：本科、硕士、博士" value="${edu.degree || ""}"></div>
      <div class="form-group"><label style="font-size:12px">院校</label><input class="edu-school" placeholder="院校名称" value="${edu.school || ""}"></div>
      <div class="form-group"><label style="font-size:12px">专业</label><input class="edu-major" placeholder="专业（可选）" value="${edu.major || ""}"></div>
      <div class="form-group"><label style="font-size:12px">时间段</label><input class="edu-period" placeholder="如：2015-2019" value="${edu.period || ""}"></div>
    </div>`;
  div.querySelector(".block-del").onclick = () => div.remove();
  return div;
}

function renderWorkBlock(work = {}) {
  const div = document.createElement("div");
  div.className = "block-item";
  div.innerHTML = `
    <button type="button" class="block-del">×</button>
    <div class="form-grid" style="gap:8px">
      <div class="form-group"><label style="font-size:12px">公司</label><input class="work-company" placeholder="公司名称" value="${work.company || ""}"></div>
      <div class="form-group"><label style="font-size:12px">职位</label><input class="work-title" placeholder="职位名称" value="${work.title || ""}"></div>
      <div class="form-group form-full"><label style="font-size:12px">时间段</label><input class="work-period" placeholder="如：2019-至今" value="${work.period || ""}"></div>
    </div>`;
  div.querySelector(".block-del").onclick = () => div.remove();
  return div;
}

function collectBlocks(container, fields) {
  return Array.from(container.querySelectorAll(".block-item")).map(block => {
    const obj = {};
    fields.forEach(f => { obj[f.key] = block.querySelector(f.sel)?.value.trim() || null; });
    return obj;
  }).filter(obj => Object.values(obj).some(Boolean));
}

async function uploadAndConfirm(file) {
  const formData = new FormData();
  formData.append("file", file);

  const overlay = document.getElementById("modal-overlay");
  const body = document.getElementById("modal-body");
  const modalSaveBtn = document.getElementById("modal-save");
  body.innerHTML = '<span class="spinner"></span> 解析中...';
  modalSaveBtn.classList.add("hidden"); // hide bottom save button in parse mode
  overlay.classList.remove("hidden");

  let res;
  try {
    res = await fetch("/api/resume/upload", { method: "POST", body: formData }).then(r => r.json());
  } catch (e) {
    body.innerHTML = `<p style="color:red">上传失败: ${e.message}</p>`;
    return;
  }

  const p = res.parsed || {};
  const firstWork = (p.work_experience || [])[0] || {};
  const [jobs, dupRes] = await Promise.all([
    api.get("/api/jobs"),
    api.post("/api/candidates/check-duplicate", {
      name: p.name || null,
      phone: p.phone || null,
      email: p.email || null,
      last_company: firstWork.company || null,
    }),
  ]);
  const suppliers = await api.get("/api/suppliers");

  const dupMatches = dupRes.matches || [];
  const dupBanner = dupMatches.length ? `
    <div id="dup-banner" style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:12px 16px;margin-bottom:16px">
      <div style="font-weight:600;color:#854d0e;margin-bottom:8px">⚠️ 检测到可能重复的候选人：</div>
      ${dupMatches.map(m => `
        <div style="font-size:13px;color:#555;margin-bottom:4px">
          <strong>${m.name}</strong>${m.phone ? " · " + m.phone : ""}${m.email ? " · " + m.email : ""}${m.last_company ? " · " + m.last_company : ""}
          <button class="btn btn-primary btn-sm dup-update-btn" data-id="${m.id}" style="margin-left:8px">更新已有档案</button>
        </div>`).join("")}
      <button class="btn btn-secondary btn-sm" id="dup-ignore-btn" style="margin-top:8px">仍然新建</button>
    </div>` : "";

  const jobOptions = jobs.map(j => {
    const num = String(j.id).padStart(3, "0");
    return `<option value="${j.id}">${j.title} @${num}</option>`;
  }).join("");

  body.innerHTML = `
    ${res.warning ? `<div class="warning-banner" style="margin-bottom:16px">${res.warning}</div>` : ""}
    ${dupBanner}
    <input type="hidden" id="resume-path" value="${res.resume_path || ""}">
    <div class="form-grid">
      <div class="form-group"><label>姓名</label><input id="f-name" placeholder="中文名" value="${p.name || ""}"></div>
      <div class="form-group"><label>英文名</label><input id="f-name-en" placeholder="English Name" value="${p.name_en || ""}"></div>
      <div class="form-group"><label>手机号</label><input id="f-phone" value="${p.phone || ""}"></div>
      <div class="form-group"><label>邮箱</label><input id="f-email" value="${p.email || ""}"></div>
      <div class="form-group"><label>年龄</label><input id="f-age" type="number" value="${p.age || ""}"></div>
      <div class="form-group"><label>当前城市</label><input id="f-city" value="${p.city || ""}"></div>
      <div class="form-group"><label>工作年限</label><input id="f-years-exp" type="number" value="${p.years_exp || ""}"></div>
      <div class="form-group"><label>来源渠道</label>
        <div style="display:flex;gap:6px;align-items:center">
          <select id="f-supplier" style="flex:1">
            <option value="">-- 请选择 --</option>
            ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join("")}
            <option value="__other__">其他（手动输入）</option>
          </select>
          <button type="button" class="btn btn-secondary btn-sm" id="f-add-supplier-btn">+ 新增</button>
        </div>
        <input id="f-source" placeholder="手动输入来源" style="display:none;margin-top:6px">
      </div>
      <div class="form-group" id="f-referred-by-group" style="display:none"><label>内推人</label><input id="f-referred-by" placeholder="推荐人姓名"></div>
      <div class="form-group form-full"><label>投递岗位（可选）</label>
        <select id="f-job">
          <option value="">-- 暂不投递岗位 --</option>
          ${jobOptions}
        </select>
      </div>
      <div class="form-group form-full"><label>技能标签</label><input id="f-tags" placeholder="逗号分隔，如：Java, Python, React"></div>
      <div class="form-group form-full"><label>备注</label><textarea id="f-notes"></textarea></div>
    </div>

    <div style="margin-top:16px">
      <div style="font-weight:600;font-size:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <span>教育经历</span>
        <button type="button" id="add-edu-btn" class="btn btn-secondary btn-sm">+ 添加教育经历</button>
      </div>
      <div id="edu-blocks"></div>
    </div>

    <div style="margin-top:16px">
      <div style="font-weight:600;font-size:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <span>工作经历</span>
        <button type="button" id="add-work-btn" class="btn btn-secondary btn-sm">+ 添加工作经历</button>
      </div>
      <div id="work-blocks"></div>
    </div>
    <div style="margin-top:20px;display:flex;gap:12px;justify-content:flex-end">
      <button type="button" class="btn btn-secondary" id="f-cancel-btn">取消</button>
      <button type="button" class="btn btn-primary" id="f-save-btn">保存候选人</button>
    </div>`;

  // 渲染 AI 解析出的积木块（按时间倒序）
  const eduContainer = document.getElementById("edu-blocks");
  const workContainer = document.getElementById("work-blocks");

  function sortByPeriodDesc(list) {
    return [...list].sort((a, b) => {
      const getYear = p => parseInt((p || "").match(/\d{4}/g)?.slice(-1)[0] || "0");
      return getYear(b.period) - getYear(a.period);
    });
  }

  sortByPeriodDesc(p.education_list || []).forEach(edu => eduContainer.appendChild(renderEduBlock(edu)));
  sortByPeriodDesc(p.work_experience || []).forEach(work => workContainer.appendChild(renderWorkBlock(work)));

  document.getElementById("add-edu-btn").onclick = () => eduContainer.appendChild(renderEduBlock());
  document.getElementById("add-work-btn").onclick = () => workContainer.appendChild(renderWorkBlock());

  // Supplier dropdown: show/hide manual input + referred_by
  const fSupplier = document.getElementById("f-supplier");
  const fSource = document.getElementById("f-source");
  const fReferredByGroup = document.getElementById("f-referred-by-group");
  function updateSupplierUI() {
    if (fSupplier.value === "__other__") fSource.style.display = "block"; else fSource.style.display = "none";
    // show referred_by if selected supplier is type 内推
    const selectedOpt = fSupplier.options[fSupplier.selectedIndex];
    const isReferral = selectedOpt && selectedOpt.textContent.includes("内推");
    fReferredByGroup.style.display = isReferral ? "" : "none";
  }
  fSupplier.onchange = updateSupplierUI;

  // Quick-add supplier
  document.getElementById("f-add-supplier-btn").onclick = () => {
    const html = `
      <div class="form-grid">
        <div class="form-group form-full"><label>名称 *</label><input id="dlg-s-name" placeholder="供应商名称"></div>
        <div class="form-group form-full"><label>类型</label>
          <select id="dlg-s-type">
            <option value="猎头">猎头</option>
            <option value="招聘平台">招聘平台</option>
            <option value="内推">内推</option>
            <option value="其他" selected>其他</option>
          </select>
        </div>
        <div class="form-group"><label>费率（选填）</label><input id="dlg-s-fee-rate" placeholder="如：20%"></div>
        <div class="form-group"><label>保证期（天，选填）</label><input id="dlg-s-fee-days" type="number" placeholder="如：90"></div>
        <div class="form-group form-full"><label>付款备注（选填）</label><input id="dlg-s-payment-notes" placeholder="如：入职后30天付款"></div>
      </div>`;
    openDialog("新增供应商", html, {
      confirmText: "创建",
      onConfirm: async () => {
        const name = document.getElementById("dlg-s-name").value.trim();
        if (!name) { showToast("请填写供应商名称", "error"); return; }
        const newS = await api.post("/api/suppliers", {
          name,
          type: document.getElementById("dlg-s-type").value,
          fee_rate: document.getElementById("dlg-s-fee-rate").value.trim() || null,
          fee_guarantee_days: parseInt(document.getElementById("dlg-s-fee-days").value) || null,
          payment_notes: document.getElementById("dlg-s-payment-notes").value.trim() || null,
        });
        const opt = document.createElement("option");
        opt.value = newS.id;
        opt.textContent = newS.name;
        fSupplier.insertBefore(opt, fSupplier.querySelector('option[value="__other__"]'));
        fSupplier.value = newS.id;
        fSource.classList.add("hidden");
        closeDialog();
      },
    });
  };

  // 查重：更新已有档案
  body.querySelectorAll(".dup-update-btn").forEach(btn => {
    btn.onclick = async () => {
      const existingId = btn.dataset.id;
      const patch = {};
      const name = document.getElementById("f-name").value.trim();
      const nameEn = document.getElementById("f-name-en").value.trim();
      if (name) patch.name = name;
      if (nameEn) patch.name_en = nameEn;
      const simpleFields = { phone: "f-phone", email: "f-email", city: "f-city" };
      for (const [key, elId] of Object.entries(simpleFields)) {
        const val = document.getElementById(elId)?.value.trim();
        if (val) patch[key] = val;
      }
      if (fSupplier.value && fSupplier.value !== "__other__") patch.supplier_id = parseInt(fSupplier.value);
      else if (fSupplier.value === "__other__") { const sv = fSource.value.trim(); if (sv) patch.source = sv; }
      const age = parseInt(document.getElementById("f-age").value);
      if (age) patch.age = age;
      const yrs = parseFloat(document.getElementById("f-years-exp").value);
      if (yrs) patch.years_exp = yrs;
      const tags = document.getElementById("f-tags").value.split(",").map(t => t.trim()).filter(Boolean);
      if (tags.length) patch.skill_tags = tags;
      const resumePath = document.getElementById("resume-path").value;
      if (resumePath) patch.resume_path = resumePath;
      const eduList = collectBlocks(eduContainer, [{key:"degree",sel:".edu-degree"},{key:"school",sel:".edu-school"},{key:"major",sel:".edu-major"},{key:"period",sel:".edu-period"}]);
      const workList = collectBlocks(workContainer, [{key:"company",sel:".work-company"},{key:"title",sel:".work-title"},{key:"period",sel:".work-period"}]);
      if (eduList.length) patch.education_list = eduList;
      if (workList.length) patch.work_experience = workList;
      await api.patch(`/api/candidates/${existingId}`, patch);
      overlay.classList.add("hidden");
      modalSaveBtn.classList.remove("hidden");
      location.hash = `#/candidates/${existingId}`;
    };
  });

  const ignoreBtn = document.getElementById("dup-ignore-btn");
  if (ignoreBtn) ignoreBtn.onclick = () => document.getElementById("dup-banner")?.remove();

  document.getElementById("modal-cancel").onclick = () => { modalSaveBtn.classList.remove("hidden"); overlay.classList.add("hidden"); };
  document.getElementById("f-cancel-btn").onclick = () => { modalSaveBtn.classList.remove("hidden"); overlay.classList.add("hidden"); };
  const inlineSaveBtn = document.getElementById("f-save-btn");
  inlineSaveBtn.onclick = () => withLoading(inlineSaveBtn, async () => {
    const name = document.getElementById("f-name").value.trim();
    const nameEn = document.getElementById("f-name-en").value.trim();
    if (!name && !nameEn) { showToast("姓名不能为空（中文名或英文名至少填一个）", "error"); return; }

    const phone = document.getElementById("f-phone").value.trim();
    const email = document.getElementById("f-email").value.trim();
    const age = document.getElementById("f-age").value;
    const years_exp = document.getElementById("f-years-exp").value;
    if (!validateCandidateForm({ phone, email, age, years_exp })) return;

    const tags = document.getElementById("f-tags").value.split(",").map(t => t.trim()).filter(Boolean);
    const eduList = collectBlocks(eduContainer, [{key:"degree",sel:".edu-degree"},{key:"school",sel:".edu-school"},{key:"major",sel:".edu-major"},{key:"period",sel:".edu-period"}]);
    const workList = collectBlocks(workContainer, [{key:"company",sel:".work-company"},{key:"title",sel:".work-title"},{key:"period",sel:".work-period"}]);

    const candidate = await api.post("/api/candidates", {
      name: name || null,
      name_en: nameEn || null,
      phone: phone || null,
      email: email || null,
      age: parseInt(age) || null,
      city: document.getElementById("f-city").value.trim() || null,
      years_exp: parseFloat(years_exp) || null,
      supplier_id: (fSupplier.value && fSupplier.value !== "__other__") ? parseInt(fSupplier.value) : null,
      source: fSupplier.value === "__other__" ? (fSource.value.trim() || null) : null,
      referred_by: document.getElementById("f-referred-by")?.value.trim() || null,
      notes: document.getElementById("f-notes").value.trim() || null,
      resume_path: document.getElementById("resume-path").value || null,
      education_list: eduList,
      work_experience: workList,
    });

    const jobId = document.getElementById("f-job").value;
    let linkResult = null;
    if (jobId) {
      linkResult = await api.post("/api/pipeline/link", { candidate_id: candidate.id, job_id: parseInt(jobId) });
    }

    overlay.classList.add("hidden");
    modalSaveBtn.classList.remove("hidden");
    if (linkResult) {
      location.hash = `#/pipeline?expand=${linkResult.id}`;
    } else {
      showToast("已入库", "success");
      location.hash = `#/talent`;
    }
  });
}

// ── Candidate List ────────────────────────────────────────────────────────────
async function renderCandidateList(el) {
  el.innerHTML = `
    <div class="page-header">
      <h1>候选人库</h1>
    </div>
    <div class="search-bar">
      <input id="search-input" placeholder="搜索姓名、手机、邮箱...">
      <input id="tag-input" placeholder="按技能标签筛选..." style="max-width:200px">
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div id="candidate-table"><span class="spinner" style="margin:24px"></span></div>
    </div>`;

  const load = async (q = "", tag = "") => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tag) params.set("tag", tag);
    const url = `/api/candidates${params.toString() ? "?" + params.toString() : ""}`;
    const candidates = await api.get(url);
    const tableEl = document.getElementById("candidate-table");
    if (!tableEl) return;
    if (!candidates.length) {
      tableEl.innerHTML = '<div class="empty-state">暂无候选人</div>';
      return;
    }
    tableEl.innerHTML = `<table class="table">
      <thead><tr><th>姓名</th><th>手机</th><th>学历</th><th>上家公司</th><th>技能标签</th><th>来源</th><th>创建时间</th></tr></thead>
      <tbody>${candidates.map(c => `
        <tr>
          <td><a href="#/candidates/${c.id}">${c.name}</a></td>
          <td>${c.phone || "-"}</td>
          <td>${c.education || "-"}</td>
          <td>${c.last_company || "-"}</td>
          <td>${(c.skill_tags || []).map(t => `<span class="tag">${t}</span>`).join("")}</td>
          <td>${c.source || "-"}</td>
          <td>${formatTime(c.created_at)}</td>
        </tr>`).join("")}
      </tbody></table>`;
  };

  load();
  let timer;
  document.getElementById("search-input").oninput = (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => load(e.target.value, document.getElementById("tag-input").value), 300);
  };
  document.getElementById("tag-input").oninput = (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => load(document.getElementById("search-input").value, e.target.value), 300);
  };
}

// ── Candidate Profile ─────────────────────────────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll(".profile-tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
  document.querySelectorAll(".profile-tab-panel").forEach(p => p.dataset.tab === tabId ? p.classList.remove("hidden") : p.classList.add("hidden"));
}

async function renderCandidateProfile(el, id) {
  el.innerHTML = '<span class="spinner"></span>';
  let c;
  try {
    c = await api.get(`/api/candidates/${id}`);
  } catch (e) {
    el.innerHTML = '<div class="empty-state" style="padding:48px">候选人不存在或已被合并 <a href="#/talent" style="color:#4f46e5;margin-left:8px">返回人才库</a></div>';
    return;
  }

  const displayId = c.display_id || `C${String(c.id).padStart(3,'0')}`;
  const mainName = c.name || c.name_en || "?";
  const firstWork = (c.work_experience || [])[0] || {};
  const firstEdu = (c.education_list || [])[0] || {};
  const activeLinks = (c.job_links || []).filter(l => !l.outcome);
  const latestActive = activeLinks.sort((a,b) => (b.created_at||"").localeCompare(a.created_at||""))[0];
  const latestInactive = !latestActive ? (c.job_links||[]).filter(l=>l.outcome).sort((a,b)=>(b.created_at||"").localeCompare(a.created_at||""))[0] : null;

  el.innerHTML = `
    <div class="page-header">
      <button class="btn btn-secondary btn-sm" onclick="history.back()">← 返回</button>
    </div>
    ${c.blacklisted ? `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:12px 16px;margin-bottom:12px;color:#dc2626;font-size:14px">
      ⚠ 黑名单候选人 — 原因：${c.blacklist_reason || "未填写"}${c.blacklist_note ? `（${c.blacklist_note}）` : ""}
    </div>` : ""}
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
            <h1 style="margin:0;font-size:22px">${mainName} <span style="font-size:14px;color:#999;font-weight:400">@${displayId}</span></h1>
            ${c.name_en && c.name_en !== c.name ? `<span style="font-size:14px;color:#888">${c.name_en}</span>` : ""}
            ${c.blacklisted ? `<span style="background:#fee2e2;color:#dc2626;font-size:11px;padding:2px 8px;border-radius:4px;font-weight:600">黑名单</span>` : ""}
          </div>
          <div style="margin-top:6px;font-size:14px;color:#555">
            ${firstWork.title ? `${firstWork.title}${firstWork.company ? " @ " + firstWork.company : ""}` : (c.last_title || c.last_company ? [c.last_title,c.last_company].filter(Boolean).join(" @ ") : "")}
            ${firstEdu.degree ? ` &nbsp;·&nbsp; ${firstEdu.degree}${firstEdu.school ? " · " + firstEdu.school : ""}` : (c.education ? ` &nbsp;·&nbsp; ${[c.education,c.school].filter(Boolean).join(" · ")}` : "")}
          </div>
          <div style="margin-top:4px;font-size:13px;color:#888">
            ${[c.phone, c.email, c.years_exp != null ? c.years_exp + "年经验" : null].filter(Boolean).join(" &nbsp;·&nbsp; ")}
          </div>
          ${c.referred_by ? `<div style="margin-top:4px;font-size:13px;color:#888">内推人：${c.referred_by}</div>` : ""}
          ${c.supplier_name ? `<div style="margin-top:4px;font-size:13px;color:#888">来源：${c.supplier_name}${c.supplier_fee_rate ? `&nbsp;·&nbsp;费率 ${c.supplier_fee_rate}` : ""}${c.supplier_fee_guarantee_days ? `&nbsp;·&nbsp;保证期 ${c.supplier_fee_guarantee_days}天` : ""}</div>` : (c.source ? `<div style="margin-top:4px;font-size:13px;color:#888">来源：${c.source}</div>` : "")}
          <div style="margin-top:8px;font-size:13px">
            ${latestActive
              ? `<span style="color:#555">当前流程：</span><span style="color:#1a1a2e;font-weight:600">${latestActive.job_title}</span> → <span class="tag" style="font-size:11px">${latestActive.stage||"-"}</span>`
              : latestInactive
                ? `<span style="color:#bbb">最近流程：</span><span style="color:#888;font-weight:600">${latestInactive.job_title}</span> · <span class="tag" style="font-size:11px;background:#fee2e2;color:#dc2626">${latestInactive.outcome==="rejected" ? "淘汰" + (latestInactive.rejection_reason ? "（"+latestInactive.rejection_reason+"）" : "") : "已退出"}</span>`
                : `<span style="color:#bbb">当前流程：暂无</span>`}
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:flex-start;flex-shrink:0;flex-wrap:wrap">
          ${c.resume_path ? `<a href="/resumes/${c.resume_path.split('/').slice(-2).map(encodeURIComponent).join('/')}" target="_blank" class="btn btn-secondary btn-sm">下载简历</a>` : ""}
          <button class="btn btn-secondary btn-sm" id="edit-info-btn">编辑信息</button>
          ${c.blacklisted
            ? `<button class="btn btn-secondary btn-sm" id="unblacklist-btn" style="color:#dc2626;border-color:#fca5a5">解除黑名单</button>`
            : `<button class="btn btn-secondary btn-sm" id="blacklist-btn" style="color:#dc2626">加入黑名单</button>`}
        </div>
      </div>
    </div>

    <div style="display:flex;gap:0;border-bottom:2px solid #e5e7eb;margin-bottom:16px">
      <button class="profile-tab-btn active" data-tab="resume" style="padding:8px 20px;border:none;background:none;cursor:pointer;font-size:14px;font-weight:600;color:#1a1a2e;border-bottom:2px solid #1a1a2e;margin-bottom:-2px">过往背景</button>
      ${c.resume_path ? `<button class="profile-tab-btn" data-tab="preview" style="padding:8px 20px;border:none;background:none;cursor:pointer;font-size:14px;color:#888;border-bottom:2px solid transparent;margin-bottom:-2px">简历预览</button>` : ""}
      <button class="profile-tab-btn" data-tab="pipeline" style="padding:8px 20px;border:none;background:none;cursor:pointer;font-size:14px;color:#888;border-bottom:2px solid transparent;margin-bottom:-2px">流程</button>
      <button class="profile-tab-btn" data-tab="history" style="padding:8px 20px;border:none;background:none;cursor:pointer;font-size:14px;color:#888;border-bottom:2px solid transparent;margin-bottom:-2px">历史记录</button>
    </div>

    <!-- 简历预览 tab -->
    ${c.resume_path ? `<div class="profile-tab-panel" data-tab="preview" style="display:none"></div>` : ""}

    <!-- 简历背景 tab -->
    <div class="profile-tab-panel" data-tab="resume">
      <div class="card">
        <h2>工作经历</h2>
        ${(c.work_experience||[]).length ? c.work_experience.map(w => `
          <div style="padding:10px 0;border-bottom:1px solid #f0f0f0">
            <div style="font-weight:600;font-size:14px">${w.title||""}${w.company ? " @ "+w.company : ""}</div>
            ${w.period ? `<div style="font-size:12px;color:#999;margin-top:2px">${w.period}</div>` : ""}
          </div>`).join("") : '<div class="empty-state" style="padding:16px">暂无工作经历</div>'}
      </div>
      <div class="card">
        <h2>教育经历</h2>
        ${(c.education_list||[]).length ? c.education_list.map(e => `
          <div style="padding:10px 0;border-bottom:1px solid #f0f0f0">
            <div style="font-weight:600;font-size:14px">${e.degree||""}${e.school ? " · "+e.school : ""}${e.major ? " · "+e.major : ""}</div>
            ${e.period ? `<div style="font-size:12px;color:#999;margin-top:2px">${e.period}</div>` : ""}
          </div>`).join("") : '<div class="empty-state" style="padding:16px">暂无教育经历</div>'}
      </div>
      <div class="card">
        <h2>备注</h2>
        <textarea id="notes-input" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;min-height:80px;box-sizing:border-box">${c.notes||""}</textarea>
        <button class="btn btn-primary btn-sm" style="margin-top:10px" id="save-notes">保存备注</button>
      </div>
    </div>

    <!-- 流程 tab -->
    <div class="profile-tab-panel" data-tab="pipeline" style="display:none">
      <div id="pipeline-tab-content"><span class="spinner" style="margin:24px"></span></div>
    </div>

    <!-- 历史记录 tab -->
    <div class="profile-tab-panel" data-tab="history" style="display:none">
      <div class="card">
        ${c.history.length ? c.history.map(h => `
          <div class="history-item">
            <span class="history-time">${formatTime(h.timestamp)}</span>
            <span>${h.detail}</span>
          </div>`).join("") : '<div class="empty-state" style="padding:16px">暂无历史记录</div>'}
      </div>
    </div>`;

  // tab 切换
  let previewLoaded = false;
  document.querySelectorAll(".profile-tab-btn").forEach(btn => {
    btn.onclick = async () => {
      document.querySelectorAll(".profile-tab-btn").forEach(b => {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      document.querySelectorAll(".profile-tab-panel").forEach(p => p.dataset.tab === btn.dataset.tab ? p.classList.remove("hidden") : p.classList.add("hidden"));

      // 简历预览懒加载
      if (btn.dataset.tab === "preview" && !previewLoaded) {
        previewLoaded = true;
        const panel = document.querySelector(".profile-tab-panel[data-tab='preview']");
        panel.innerHTML = `<div style="padding:24px;text-align:center"><span class="spinner"></span></div>`;
        const ext = (c.resume_path || "").split(".").pop().toLowerCase();
        const staticPath = "/resumes/" + c.resume_path.replace("\\", "/").split("/").slice(-2).join("/");
        if (["jpg","jpeg","png","gif"].includes(ext)) {
          panel.innerHTML = `<img src="${staticPath}" style="max-width:100%;border-radius:8px">`;
        } else if (ext === "pdf") {
          panel.innerHTML = `<iframe src="${staticPath}" style="width:100%;height:700px;border:none;border-radius:8px"></iframe>`;
        } else if (ext === "docx") {
          try {
            const res = await api.get(`/api/candidates/${id}/resume-preview`);
            panel.innerHTML = `
              <div class="warning-banner" style="margin-bottom:12px">预览仅供参考，完整格式请下载查看</div>
              <div class="card" style="font-size:14px;line-height:1.8">${res.html || "<p>内容为空</p>"}</div>`;
          } catch {
            panel.innerHTML = `<div class="empty-state" style="padding:32px">预览失败，请下载查看</div>`;
          }
        } else {
          panel.innerHTML = `<div class="empty-state" style="padding:32px">该格式不支持预览，请下载查看</div>`;
        }
      }
    };
  });

  document.getElementById("save-notes").onclick = async () => {
    await api.patch(`/api/candidates/${id}`, { notes: document.getElementById("notes-input").value });
    showToast("备注已保存", "success");
  };

  document.getElementById("edit-info-btn").onclick = async () => {
    const editSuppliers = await api.get("/api/suppliers");
    const overlay = document.getElementById("modal-overlay");
    const body = document.getElementById("modal-body");
    document.querySelector("#modal-overlay h2").textContent = "编辑候选人信息";
    const supplierOpts = editSuppliers.map(s => `<option value="${s.id}" ${c.supplier_id === s.id ? "selected" : ""}>${s.name}</option>`).join("");
    body.innerHTML = `
      <div class="form-grid">
        <div class="form-group"><label>姓名</label><input id="e-name" value="${c.name || ""}"></div>
        <div class="form-group"><label>英文名</label><input id="e-name-en" value="${c.name_en || ""}"></div>
        <div class="form-group"><label>手机</label><input id="e-phone" value="${c.phone || ""}"></div>
        <div class="form-group"><label>邮箱</label><input id="e-email" value="${c.email || ""}"></div>
        <div class="form-group"><label>年龄</label><input id="e-age" type="number" value="${c.age || ""}"></div>
        <div class="form-group"><label>工作年限</label><input id="e-years-exp" type="number" step="0.5" value="${c.years_exp || ""}"></div>
        <div class="form-group"><label>来源渠道</label>
          <div style="display:flex;gap:6px;align-items:center">
            <select id="e-supplier" style="flex:1">
              <option value="">-- 请选择 --</option>
              ${supplierOpts}
              <option value="__other__" ${!c.supplier_id && c.source ? "selected" : ""}>其他（手动输入）</option>
            </select>
            <button type="button" class="btn btn-secondary btn-sm" id="e-add-supplier-btn">+ 新增</button>
          </div>
          <input id="e-source" value="${c.source || ""}" placeholder="手动输入来源" style="display:${!c.supplier_id && c.source ? "block" : "none"};margin-top:6px">
        </div>
        <div class="form-group" id="e-referred-by-group" style="display:${c.source === "内推" || (c.supplier && c.supplier_name && c.supplier_name.includes("内推")) ? "" : "none"}"><label>内推人</label><input id="e-referred-by" value="${c.referred_by || ""}" placeholder="推荐人姓名"></div>
        <div class="form-group"><label>城市</label><input id="e-city" value="${c.city || ""}"></div>
      </div>
      <div style="margin-top:16px">
        <div style="font-weight:600;font-size:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
          <span>教育经历</span>
          <button type="button" id="e-add-edu" class="btn btn-secondary btn-sm">+ 添加</button>
        </div>
        <div id="e-edu-blocks"></div>
      </div>
      <div style="margin-top:16px">
        <div style="font-weight:600;font-size:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
          <span>工作经历</span>
          <button type="button" id="e-add-work" class="btn btn-secondary btn-sm">+ 添加</button>
        </div>
        <div id="e-work-blocks"></div>
      </div>`;
    const eEduContainer = document.getElementById("e-edu-blocks");
    const eWorkContainer = document.getElementById("e-work-blocks");
    (c.education_list || []).forEach(edu => eEduContainer.appendChild(renderEduBlock(edu)));
    (c.work_experience || []).forEach(work => eWorkContainer.appendChild(renderWorkBlock(work)));
    document.getElementById("e-add-edu").onclick = () => eEduContainer.appendChild(renderEduBlock());
    document.getElementById("e-add-work").onclick = () => eWorkContainer.appendChild(renderWorkBlock());

    // Supplier dropdown logic
    const eSupplier = document.getElementById("e-supplier");
    const eSource = document.getElementById("e-source");
    const eReferredByGroup = document.getElementById("e-referred-by-group");
    eSupplier.onchange = () => {
      if (eSupplier.value === "__other__") eSource.style.display = "block"; else eSource.style.display = "none";
      const selOpt = eSupplier.options[eSupplier.selectedIndex];
      eReferredByGroup.style.display = (selOpt && selOpt.textContent.includes("内推")) ? "" : "none";
    };
    document.getElementById("e-add-supplier-btn").onclick = () => {
      const html = `
        <div class="form-grid">
          <div class="form-group form-full"><label>名称 *</label><input id="dlg-s-name" placeholder="供应商名称"></div>
          <div class="form-group form-full"><label>类型</label>
            <select id="dlg-s-type">
              <option value="猎头">猎头</option>
              <option value="招聘平台">招聘平台</option>
              <option value="内推">内推</option>
              <option value="其他" selected>其他</option>
            </select>
          </div>
          <div class="form-group"><label>费率（选填）</label><input id="dlg-s-fee-rate" placeholder="如：20%"></div>
          <div class="form-group"><label>保证期（天，选填）</label><input id="dlg-s-fee-days" type="number" placeholder="如：90"></div>
          <div class="form-group form-full"><label>付款备注（选填）</label><input id="dlg-s-payment-notes" placeholder="如：入职后30天付款"></div>
        </div>`;
      openDialog("新增供应商", html, {
        confirmText: "创建",
        onConfirm: async () => {
          const sName = document.getElementById("dlg-s-name").value.trim();
          if (!sName) { showToast("请填写供应商名称", "error"); return; }
          const newS = await api.post("/api/suppliers", {
            name: sName,
            type: document.getElementById("dlg-s-type").value,
            fee_rate: document.getElementById("dlg-s-fee-rate").value.trim() || null,
            fee_guarantee_days: parseInt(document.getElementById("dlg-s-fee-days").value) || null,
            payment_notes: document.getElementById("dlg-s-payment-notes").value.trim() || null,
          });
          const opt = document.createElement("option");
          opt.value = newS.id;
          opt.textContent = newS.name;
          eSupplier.insertBefore(opt, eSupplier.querySelector('option[value="__other__"]'));
          eSupplier.value = newS.id;
          eSource.classList.add("hidden");
          closeDialog();
        },
      });
    };

    overlay.classList.remove("hidden");
    document.getElementById("modal-cancel").onclick = () => overlay.classList.add("hidden");
    const editSaveBtn = document.getElementById("modal-save");
    editSaveBtn.onclick = () => withLoading(editSaveBtn, async () => {
      const phone = document.getElementById("e-phone").value;
      const email = document.getElementById("e-email").value;
      const age = document.getElementById("e-age").value;
      const years_exp = document.getElementById("e-years-exp").value;
      if (!validateCandidateForm({ phone, email, age, years_exp })) return;
      const eduList = collectBlocks(eEduContainer, [{key:"degree",sel:".edu-degree"},{key:"school",sel:".edu-school"},{key:"major",sel:".edu-major"},{key:"period",sel:".edu-period"}]);
      const workList = collectBlocks(eWorkContainer, [{key:"company",sel:".work-company"},{key:"title",sel:".work-title"},{key:"period",sel:".work-period"}]);
      await api.patch(`/api/candidates/${id}`, {
        name: document.getElementById("e-name").value || null,
        name_en: document.getElementById("e-name-en").value || null,
        phone: phone || null,
        email: email || null,
        age: parseInt(age) || null,
        years_exp: parseFloat(years_exp) || null,
        supplier_id: (eSupplier.value && eSupplier.value !== "__other__") ? parseInt(eSupplier.value) : null,
        source: eSupplier.value === "__other__" ? (eSource.value.trim() || null) : null,
        referred_by: document.getElementById("e-referred-by")?.value.trim() || null,
        city: document.getElementById("e-city").value || null,
        education_list: eduList,
        work_experience: workList,
      });
      overlay.classList.add("hidden");
      renderCandidateProfile(el, id);
    });
  };

  // 流程 tab：渲染时间轴
  const pipelineTabCache = {};

  async function renderPipelineTab() {
    const container = document.getElementById("pipeline-tab-content");
    if (!container) return;
    const activeLink = (c.job_links || []).find(l => !l.outcome);
    const inactiveLinks = (c.job_links || []).filter(l => l.outcome).sort((a,b) => (b.created_at||"").localeCompare(a.created_at||""));

    if (!activeLink) {
      container.innerHTML = `
        <div class="card" style="text-align:center;padding:32px;color:#888">
          暂无进行中的流程
        </div>
        ${inactiveLinks.length ? renderHistoryLinks(inactiveLinks) : ""}`;
      bindHistoryExpand();
      return;
    }

    let records = pipelineTabCache[activeLink.id];
    if (!records) {
      records = await api.get(`/api/activities?link_id=${activeLink.id}`);
      pipelineTabCache[activeLink.id] = records;
    }

    const realActivities = records.filter(r => r.type !== "stage_change");
    const scored = realActivities.filter(r => r.score);
    const avgScore = scored.length ? (scored.reduce((s,r)=>s+r.score,0)/scored.length).toFixed(1) : null;

    const timelineHTML = renderActivityTimeline(records, activeLink.stage, false);

    container.innerHTML = `
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <span style="font-size:13px;color:#555;font-weight:600">${activeLink.job_title||"未知岗位"}</span>
          <span class="tag" style="font-size:11px">${activeLink.stage||"-"}</span>
        </div>
        <div id="tl-iv-list" style="margin-bottom:10px">${timelineHTML}</div>
        ${avgScore ? `<div style="margin-top:8px;padding-top:12px;border-top:1px solid #f0f0f0;font-size:13px;color:#555">综合评分均值：<strong>${avgScore}</strong> <span style="color:#f59e0b">${"★".repeat(Math.round(avgScore))}</span><span style="color:#ddd">${"★".repeat(5-Math.round(avgScore))}</span></div>` : ""}
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f0f0f0">
          <a href="#/pipeline" style="font-size:13px;color:#4f46e5;text-decoration:none">→ 前往进行中页操作</a>
        </div>
      </div>
      ${inactiveLinks.length ? renderHistoryLinks(inactiveLinks) : ""}`;

    bindHistoryExpand();
  }

  function renderIvCardReadOnly(r) {
    const status = r.status || "completed";
    if (status === "cancelled") {
      return `<div class="iv-card iv-card-cancelled" data-record-id="${r.id}">
        <div class="iv-card-header">
          <span class="iv-card-round">${r.round || "面试"}</span>
          <span class="tag iv-tag-cancelled">已取消</span>
        </div>
      </div>`;
    }
    if (status === "scheduled") {
      const scheduledStr = r.scheduled_at ? formatTime(r.scheduled_at) : "";
      return `<div class="iv-card iv-card-scheduled" data-record-id="${r.id}">
        <div class="iv-card-header">
          <span class="iv-card-round">${r.round || "面试"}</span>
          <span class="tag iv-tag-scheduled">已安排</span>
        </div>
        ${scheduledStr ? `<div class="iv-card-meta">${r.interviewer ? r.interviewer + " · " : ""}${scheduledStr}${r.location ? " · " + r.location : ""}</div>` : ""}
      </div>`;
    }
    const stars = r.score ? "★".repeat(r.score) + '<span style="color:#ddd">' + "★".repeat(5 - r.score) + "</span>" : "";
    const conclusionColor = r.conclusion === "通过" ? "background:#dcfce7;color:#166534" : r.conclusion === "淘汰" ? "background:#fee2e2;color:#dc2626" : "background:#fef9c3;color:#854d0e";
    const conclusionTag = r.conclusion ? `<span class="tag" style="font-size:11px;${conclusionColor}">${r.conclusion}</span>` : "";
    const meta = [r.interviewer, r.interview_time ? formatTime(r.interview_time) : null].filter(Boolean).join(" · ");
    const commentHTML = r.comment ? `<div class="iv-card-comment">${r.comment}</div>` : "";
    return `<div class="iv-card" data-record-id="${r.id}">
      <div class="iv-card-header">
        <span class="iv-card-round">${r.round || "面试"}</span>
        ${stars ? `<span class="iv-card-score">${stars}</span>` : ""}
        ${conclusionTag}
      </div>
      ${meta ? `<div class="iv-card-meta">${meta}</div>` : ""}
      ${commentHTML}
    </div>`;
  }

  function renderHistoryLinks(links) {
    return `<div class="card" style="padding:0;overflow:hidden">
      <div style="padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-weight:600;font-size:13px;color:#555;cursor:pointer;display:flex;justify-content:space-between" id="history-links-toggle">
        历史流程（${links.length}）<span id="history-links-arrow">▶</span>
      </div>
      <div id="history-links-body" style="display:none">
        ${links.map(lnk => {
          const label = lnk.outcome === "rejected" ? "淘汰" + (lnk.rejection_reason ? "（"+lnk.rejection_reason+"）" : "") : lnk.outcome === "hired" ? "已入职" : "已退出";
          const labelStyle = lnk.outcome === "hired" ? "background:#dcfce7;color:#166534" : "background:#fee2e2;color:#dc2626";
          return `<div style="padding:10px 16px;border-bottom:1px solid #f3f4f6">
            <div style="display:flex;align-items:center;gap:8px;cursor:pointer" class="hist-link-row" data-link-id="${lnk.id}">
              <span style="font-weight:600;font-size:13px">${lnk.job_title||"未知岗位"}</span>
              <span class="tag" style="font-size:10px">${lnk.stage||"-"}</span>
              <span class="tag" style="font-size:10px;${labelStyle}">${label}</span>
              <span style="font-size:12px;color:#bbb;margin-left:auto">${formatTime(lnk.created_at)}</span>
              <span class="hist-arrow" style="color:#bbb;font-size:11px">▶</span>
            </div>
            <div class="hist-iv-detail" id="hist-iv-${lnk.id}" style="display:none;margin-top:8px;padding-left:8px"></div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
  }

  function bindHistoryExpand() {
    const toggle = document.getElementById("history-links-toggle");
    if (toggle) {
      toggle.onclick = () => {
        const body = document.getElementById("history-links-body");
        const arrow = document.getElementById("history-links-arrow");
        const open = body.classList.contains("hidden");
        open ? body.classList.remove("hidden") : body.classList.add("hidden");
        arrow.textContent = open ? "▼" : "▶";
      };
    }
    document.querySelectorAll(".hist-link-row").forEach(row => {
      row.onclick = async () => {
        const linkId = row.dataset.linkId;
        const detail = document.getElementById(`hist-iv-${linkId}`);
        const arrow = row.querySelector(".hist-arrow");
        const open = detail.classList.contains("hidden");
        open ? detail.classList.remove("hidden") : detail.classList.add("hidden");
        arrow.textContent = open ? "▼" : "▶";
        if (open && !detail.dataset.loaded) {
          detail.dataset.loaded = "1";
          detail.innerHTML = '<span class="spinner"></span>';
          const records = await api.get(`/api/activities?link_id=${linkId}`);
          const realRecs = records.filter(r => r.type !== "stage_change");
          if (!realRecs.length) { detail.innerHTML = '<span style="color:#bbb;font-size:12px">暂无活动记录</span>'; return; }
          detail.innerHTML = realRecs.map(r => `<div style="font-size:12px;padding:4px 0;color:#555">
            ${r.round || (r.type === "phone_screen" ? "电话初筛" : r.type === "note" ? "备注" : r.type === "offer" ? "Offer" : "面试")} ${r.score?"★".repeat(r.score):""} ${r.conclusion||""} ${r.comment?`· ${r.comment}`:""}
          </div>`).join("");
        }
      };
    });
  }

  }

  // Blacklist / unblacklist handlers
  const blacklistBtn = document.getElementById("blacklist-btn");
  if (blacklistBtn) {
    blacklistBtn.onclick = () => {
      const REASONS = ["简历造假", "背调不通过", "职业道德问题", "面试失约", "其他"];
      const html = `
        <div class="form-group">
          <label>原因</label>
          <select id="bl-reason">${REASONS.map(r => `<option value="${r}">${r}</option>`).join("")}</select>
        </div>
        <div class="form-group">
          <label>补充说明（选填）</label>
          <input id="bl-note" placeholder="可选">
        </div>`;
      openDialog("加入黑名单", html, {
        confirmText: "确认加入",
        onConfirm: async () => {
          const reason = document.getElementById("bl-reason").value;
          const note = document.getElementById("bl-note").value.trim() || null;
          await api.post(`/api/candidates/${id}/blacklist`, { reason, note });
          closeDialog();
          renderCandidateProfile(el, id);
        }
      });
    };
  }

  const unblacklistBtn = document.getElementById("unblacklist-btn");
  if (unblacklistBtn) {
    unblacklistBtn.onclick = () => {
      const html = `
        <div class="form-group">
          <label>解除原因（必填）</label>
          <input id="ubl-reason" placeholder="请填写解除原因">
        </div>`;
      openDialog("解除黑名单", html, {
        confirmText: "确认解除",
        onConfirm: async () => {
          const reason = document.getElementById("ubl-reason").value.trim();
          if (!reason) { showToast("请填写解除原因", "error"); return; }
          await api.delete(`/api/candidates/${id}/blacklist`, { reason });
          closeDialog();
          renderCandidateProfile(el, id);
        }
      });
    };
  }

  function openLinkJobOverlay() {
    api.get("/api/jobs").then(jobs => {
      const html = `
        <div class="form-group">
          <select id="dlg-link-job-select" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:14px">
            ${jobs.map(j => `<option value="${j.id}">${j.title} @${String(j.id).padStart(3,"0")}</option>`).join("")}
          </select>
        </div>`;
      openDialog("新增投递", html, {
        confirmText: "确认关联",
        onConfirm: async () => {
          const jobId = parseInt(document.getElementById("dlg-link-job-select").value);
          if (!jobId) return;
          try {
            await api.post("/api/pipeline/link", { candidate_id: parseInt(id), job_id: jobId });
            closeDialog();
            renderCandidateProfile(el, id);
          } catch (e) { /* toast shown */ }
        }
      });
    });
  }

  // trigger pipeline tab load when tab is clicked
  document.querySelectorAll(".profile-tab-btn").forEach(btn => {
    if (btn.dataset.tab === "pipeline") {
      const origOnclick = btn.onclick;
      btn.addEventListener("click", () => { setTimeout(renderPipelineTab, 0); });
    }
  });
}

// ── Activity chain helpers ────────────────────────────────────────────────────
const CHAIN_TYPES = new Set(["resume_review", "interview", "offer", "onboard"]);

function getCurrentTailActivity(activities) {
  const chain = activities.filter(a => CHAIN_TYPES.has(a.type));
  return chain.length ? chain[chain.length - 1] : null;
}

function isTailComplete(tail) {
  if (!tail) return true;
  return tail.conclusion != null || tail.status === "completed" || tail.status === "cancelled";
}

// ── Activity card renderer ────────────────────────────────────────────────────
function renderActivityCard(activity, editable) {
  const a = activity;
  const typeLabel = { resume_review: "简历筛选", interview: "面试", phone_screen: "电话初筛", note: "备注", offer: "Offer", stage_change: "阶段变更", onboard: "入职确认", background_check: "背调" };

  if (a.type === "stage_change") {
    return `<div class="activity-stage-change">→ 推进到 <strong>${a.to_stage || a.stage}</strong></div>`;
  }

  const conclusionColor = a.conclusion === "通过" ? "background:#dcfce7;color:#166534"
    : a.conclusion === "淘汰" ? "background:#fee2e2;color:#dc2626"
    : "background:#fef9c3;color:#854d0e";
  const conclusionTag = a.conclusion ? `<span class="tag" style="font-size:11px;${conclusionColor}">${a.conclusion}</span>` : "";
  const stars = a.score ? "★".repeat(a.score) + `<span style="color:#ddd">${"★".repeat(5 - a.score)}</span>` : "";

  let statusTag = "";
  if (a.type === "interview") {
    if (a.status === "scheduled") statusTag = `<span class="tag iv-tag-scheduled" style="font-size:11px">待面试</span>`;
    else if (a.status === "cancelled") statusTag = `<span class="tag iv-tag-cancelled" style="font-size:11px">已取消</span>`;
  }

  let metaParts = [];
  if (a.actor) metaParts.push(a.actor);
  if (a.type === "interview" && a.status === "scheduled" && a.scheduled_at) metaParts.push(formatTime(a.scheduled_at));
  else if (a.type === "interview" && a.interview_time) metaParts.push(formatTime(a.interview_time));
  if (a.location) metaParts.push(`📍 ${a.location}`);
  if (a.type === "offer") {
    const p = a.payload || {};
    const monthlySalary = p.monthly_salary || a.monthly_salary;
    const salaryMonths = p.salary_months || a.salary_months;
    const otherCash = p.other_cash || a.other_cash;
    if (monthlySalary) metaParts.push(`月薪 ¥${monthlySalary.toLocaleString()} × ${salaryMonths || 13}薪`);
    else if (a.salary) metaParts.push(`薪资：${a.salary}`);
    if (otherCash) metaParts.push(otherCash);
    if (a.start_date) metaParts.push(`入职：${a.start_date}`);
  }
  if (a.type === "background_check") {
    const p = a.payload || {};
    const conclusion = p.conclusion || a.conclusion;
    const notes = p.notes || a.notes || a.comment;
    const bgColor = conclusion === "通过" ? "#dcfce7" : conclusion === "不通过" ? "#fee2e2" : "#fef9c3";
    const bgTextColor = conclusion === "通过" ? "#166534" : conclusion === "不通过" ? "#dc2626" : "#854d0e";
    if (conclusion) metaParts.push(`<span style="background:${bgColor};color:${bgTextColor};padding:1px 6px;border-radius:4px;font-size:11px">${conclusion}</span>`);
    if (notes) metaParts.push(notes);
  }
  if (a.type === "onboard") {
    if (a.start_date) metaParts.push(`入职日期：${a.start_date}`);
  }
  const meta = metaParts.join(" · ");

  const editBtn = editable ? `<button class="btn btn-secondary btn-sm activity-edit-btn" data-id="${a.id}" style="float:right;margin-top:-2px">编辑</button>` : "";
  const completeBtn = (editable && a.type === "interview" && a.status === "scheduled")
    ? `<button class="btn btn-primary btn-sm activity-complete-btn" data-id="${a.id}" style="margin-right:4px">填写面评</button>` : "";
  const cancelBtn = (editable && a.type === "interview" && a.status === "scheduled")
    ? `<button class="btn btn-secondary btn-sm activity-cancel-btn" data-id="${a.id}">取消面试</button>` : "";

  return `<div class="iv-card activity-card" data-activity-id="${a.id}" data-type="${a.type}">
    ${editBtn}
    <div class="iv-card-header">
      <span class="iv-card-round">${typeLabel[a.type] || a.type}${a.round ? " · " + a.round : ""}</span>
      ${stars ? `<span class="iv-card-score">${stars}</span>` : ""}
      ${conclusionTag}
      ${statusTag}
    </div>
    ${meta ? `<div class="iv-card-meta">${meta}</div>` : ""}
    ${a.comment ? `<div class="iv-card-comment iv-comment-collapsible" data-expanded="false">${a.comment}</div>` : ""}
    ${a.rejection_reason ? `<div style="font-size:12px;color:#dc2626;margin-top:4px">淘汰原因：${a.rejection_reason}</div>` : ""}
    ${(completeBtn || cancelBtn) ? `<div style="display:flex;gap:6px;margin-top:8px">${completeBtn}${cancelBtn}</div>` : ""}
  </div>`;
}

// ── Activity timeline renderer ────────────────────────────────────────────────
function renderActivityTimeline(activities, currentStage, editable) {
  if (!activities || !activities.length) {
    if (editable) {
      return `<div class="activity-stage-group">
        <div class="activity-stage-label">${currentStage || "当前阶段"}</div>
        <div style="color:#aaa;font-size:13px;padding:8px 0">暂无活动记录</div>
      </div>`;
    }
    return `<div style="color:#aaa;font-size:13px;padding:8px 0">暂无活动记录</div>`;
  }

  // group by stage, preserving order of first appearance
  const stageOrder = [];
  const stageMap = {};
  for (const a of activities) {
    if (!stageMap[a.stage]) {
      stageMap[a.stage] = [];
      stageOrder.push(a.stage);
    }
    stageMap[a.stage].push(a);
  }

  let html = "";
  for (const stage of stageOrder) {
    const isCurrentStage = stage === currentStage;
    const stageActivities = stageMap[stage];
    // separate stage_change from real activities
    const realActivities = stageActivities.filter(a => a.type !== "stage_change");
    const stageChanges = stageActivities.filter(a => a.type === "stage_change");

    // render stage_change transitions first (as dividers)
    for (const sc of stageChanges) {
      html += renderActivityCard(sc, false);
    }

    html += `<div class="activity-stage-group${isCurrentStage ? " current-stage" : ""}">
      <div class="activity-stage-label">${stage}</div>`;

    if (realActivities.length) {
      html += realActivities.map(a => renderActivityCard(a, editable && isCurrentStage)).join("");
    } else if (isCurrentStage) {
      html += `<div style="color:#aaa;font-size:13px;padding:4px 0">暂无活动记录</div>`;
    }

    html += `</div>`;
  }

  // if currentStage not yet in activities, show empty group at end
  if (currentStage && !stageMap[currentStage]) {
    html += `<div class="activity-stage-group current-stage">
      <div class="activity-stage-label">${currentStage}</div>
      <div style="color:#aaa;font-size:13px;padding:4px 0">暂无活动记录</div>
    </div>`;
  }

  return html;
}

// ── Activity type forms ───────────────────────────────────────────────────────
function renderNoteFormHTML(record) {
  const r = record || {};
  return `
    <label>备注内容</label>
    <textarea class="ivf-comment" style="width:100%;padding:5px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;min-height:60px;box-sizing:border-box;margin-bottom:8px" placeholder="填写备注...">${r.comment||""}</textarea>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button type="button" class="btn btn-secondary btn-sm ivf-cancel">取消</button>
      <button type="button" class="btn btn-primary btn-sm ivf-save">保存</button>
    </div>`;
}

function getNoteFormData(container) {
  return { comment: container.querySelector(".ivf-comment")?.value || null };
}

function renderOfferFormHTML(record) {
  const r = record || {};
  const p = r.payload || {};
  const conclusionBtns = ["接受","拒绝","谈判中"].map(v =>
    `<button type="button" class="iv-conclusion-btn${(r.conclusion||p.conclusion)===v?" active":""}" data-v="${v}">${v}</button>`
  ).join("");
  return `
    <div class="iv-form-row">
      <div><label>月薪（选填）</label><input class="ivf-monthly-salary" type="number" value="${p.monthly_salary||r.monthly_salary||""}" placeholder="如：30000"></div>
      <div><label>薪资月数</label>
        <select class="ivf-salary-months">
          <option value="12" ${(p.salary_months||r.salary_months||13)==12?"selected":""}>12薪</option>
          <option value="13" ${(p.salary_months||r.salary_months||13)==13?"selected":""}>13薪</option>
          <option value="14" ${(p.salary_months||r.salary_months||13)==14?"selected":""}>14薪</option>
        </select>
      </div>
    </div>
    <div class="iv-form-row">
      <div><label>其他现金（选填）</label><input class="ivf-other-cash" value="${p.other_cash||r.other_cash||""}" placeholder="如：20万期权、5万签字费"></div>
      <div><label>入职日期（选填）</label><input class="ivf-start-date" type="date" value="${r.start_date||""}"></div>
    </div>
    <label>备注</label>
    <textarea class="ivf-comment" style="width:100%;padding:5px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;min-height:50px;box-sizing:border-box;margin-bottom:8px">${r.comment||p.comment||""}</textarea>
    <label>结论</label>
    <div style="display:flex;gap:8px;margin:4px 0 10px">${conclusionBtns}</div>
    <input class="ivf-conclusion" type="hidden" value="${r.conclusion||p.conclusion||""}">
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button type="button" class="btn btn-secondary btn-sm ivf-cancel">取消</button>
      <button type="button" class="btn btn-primary btn-sm ivf-save">保存</button>
    </div>`;
}

function bindOfferFormInteractivity(container) {
  container.querySelectorAll(".iv-conclusion-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".iv-conclusion-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      container.querySelector(".ivf-conclusion").value = btn.dataset.v;
    });
  });
}

function getOfferFormData(container) {
  return {
    monthly_salary: parseInt(container.querySelector(".ivf-monthly-salary")?.value) || null,
    salary_months: parseInt(container.querySelector(".ivf-salary-months")?.value) || 13,
    other_cash: container.querySelector(".ivf-other-cash")?.value || null,
    start_date: container.querySelector(".ivf-start-date")?.value || null,
    comment: container.querySelector(".ivf-comment")?.value || null,
    conclusion: container.querySelector(".ivf-conclusion")?.value || null,
  };
}

function renderOnboardFormHTML() {
  return `
    <div class="iv-form-row">
      <div><label>入职日期</label><input class="ivf-start-date" type="date" value=""></div>
    </div>
    <label>备注（选填）</label>
    <textarea class="ivf-comment" style="width:100%;padding:5px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;min-height:50px;box-sizing:border-box;margin-bottom:8px"></textarea>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button type="button" class="btn btn-secondary btn-sm ivf-cancel">取消</button>
      <button type="button" class="btn btn-primary btn-sm ivf-save">确认入职</button>
    </div>`;
}

function getOnboardFormData(container) {
  return {
    start_date: container.querySelector(".ivf-start-date")?.value || null,
    comment: container.querySelector(".ivf-comment")?.value || null,
  };
}

function renderBgCheckFormHTML(record) {
  const r = record || {};
  const p = r.payload || {};
  const cur = r.conclusion || p.conclusion || "";
  const conclusionBtns = ["通过","有瑕疵","不通过"].map(v =>
    `<button type="button" class="iv-conclusion-btn${cur===v?" active":""}" data-v="${v}">${v}</button>`
  ).join("");
  return `
    <label>背调结论</label>
    <div style="display:flex;gap:8px;margin:4px 0 10px">${conclusionBtns}</div>
    <input class="ivf-conclusion" type="hidden" value="${cur}">
    <label>备注（选填）</label>
    <textarea class="ivf-comment" style="width:100%;padding:5px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;min-height:60px;box-sizing:border-box;margin-bottom:8px" placeholder="背调详情...">${r.comment||p.comment||""}</textarea>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button type="button" class="btn btn-secondary btn-sm ivf-cancel">取消</button>
      <button type="button" class="btn btn-primary btn-sm ivf-save">保存</button>
    </div>`;
}

function getBgCheckFormData(container) {
  return {
    conclusion: container.querySelector(".ivf-conclusion")?.value || null,
    comment: container.querySelector(".ivf-comment")?.value || null,
  };
}

// ── Pipeline Tracking ─────────────────────────────────────────────────────────

// shared inline iv form renderer (new or edit)
function renderIvFormHTML(record, round) {
  const r = record || {};
  const score = r.score || 0;
  const stars = [1,2,3,4,5].map(v =>
    `<span class="iv-star${score >= v ? " active" : ""}" data-v="${v}">★</span>`
  ).join("");
  const conclusionBtns = [
    {v:"", label:"待定"},
    {v:"通过", label:"通过"},
    {v:"淘汰", label:"淘汰"},
  ].map(c => `<button type="button" class="iv-conclusion-btn${c.v==="淘汰"?" iv-conclusion-reject":""}${r.conclusion===c.v?" active":""}" data-v="${c.v}">${c.label}</button>`).join("");

  // split interview_time into date + slot
  let dateVal = "", slotVal = "09:00";
  const timeStr = r.interview_time || (r.scheduled_at ? r.scheduled_at.slice(0,16) : "");
  if (timeStr) {
    dateVal = timeStr.slice(0, 10);
    slotVal = timeStr.slice(11, 16) || "09:00";
  }

  const presetReasons = ["技术/专业能力不达标","综合素质不匹配","经验年限不足","薪资期望差距过大","候选人主动放弃","地点/出行不接受","背调未通过","入职前反悔"];
  const isRejected = r.conclusion === "淘汰";
  return `
    <div class="iv-form-row">
      <div><label>面试官</label><input class="ivf-actor" value="${r.actor||r.interviewer||""}" placeholder="面试官姓名"></div>
      <div><label>面试时间</label>${renderTimeSlotHTML(dateVal, slotVal)}</div>
    </div>
    <label>评分</label>
    <div style="display:flex;gap:4px;margin:4px 0 8px">${stars}<span class="ivf-score-clear" style="font-size:12px;color:#bbb;cursor:pointer;align-self:center;margin-left:6px">清除</span></div>
    <input class="ivf-score" type="hidden" value="${r.score||""}">
    <label>评语</label>
    <textarea class="ivf-comment" style="width:100%;padding:5px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;min-height:50px;box-sizing:border-box;margin-bottom:8px">${r.comment||""}</textarea>
    <label>结论</label>
    <div style="display:flex;gap:8px;margin:4px 0 10px">${conclusionBtns}</div>
    <input class="ivf-conclusion" type="hidden" value="${r.conclusion||""}">
    <div class="ivf-rejection-reason-block${isRejected ? "" : " hidden"}" style="margin-bottom:10px">
      ${renderRejectionReasonForm("ivf", r.rejection_reason || "")}
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button type="button" class="btn btn-secondary btn-sm ivf-cancel">取消</button>
      <button type="button" class="btn btn-primary btn-sm ivf-save">保存</button>
    </div>`;
}

function bindIvFormInteractivity(container) {
  // stars
  const stars = container.querySelectorAll(".iv-star");
  const scoreInput = container.querySelector(".ivf-score");
  stars.forEach(star => {
    star.addEventListener("mouseenter", () => {
      const v = parseInt(star.dataset.v);
      stars.forEach(s => s.classList.toggle("active", parseInt(s.dataset.v) <= v));
    });
    star.addEventListener("mouseleave", () => {
      const cur = parseInt(scoreInput.value) || 0;
      stars.forEach(s => s.classList.toggle("active", parseInt(s.dataset.v) <= cur));
    });
    star.addEventListener("click", () => {
      const v = parseInt(star.dataset.v);
      scoreInput.value = v;
      stars.forEach(s => s.classList.toggle("active", parseInt(s.dataset.v) <= v));
    });
  });
  const clearBtn = container.querySelector(".ivf-score-clear");
  if (clearBtn) clearBtn.onclick = () => { scoreInput.value = ""; stars.forEach(s => s.classList.remove("active")); };
  // conclusion buttons + rejection reason toggle
  const rejectionBlock = container.querySelector(".ivf-rejection-reason-block");
  container.querySelectorAll(".iv-conclusion-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".iv-conclusion-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      container.querySelector(".ivf-conclusion").value = btn.dataset.v;
      if (rejectionBlock) {
        btn.dataset.v === "淘汰" ? rejectionBlock.classList.remove("hidden") : rejectionBlock.classList.add("hidden");
        if (btn.dataset.v !== "淘汰") {
          container.querySelector(".ivf-rejection-reason").value = "";
          container.querySelectorAll(".ivf-reason-btn").forEach(b => b.classList.remove("active"));
        }
      }
    });
  });
  // rejection reason buttons (shared)
  if (rejectionBlock) {
    bindRejectionReasonForm(rejectionBlock, "ivf");
  }
}

function getIvFormData(container) {
  const interview_time = getTimeSlotValue(container, ".ivf-time-date", ".ivf-time-slot");
  return {
    actor: container.querySelector(".ivf-actor")?.value || null,
    interview_time,
    score: parseInt(container.querySelector(".ivf-score").value) || null,
    comment: container.querySelector(".ivf-comment").value || null,
    conclusion: container.querySelector(".ivf-conclusion").value || null,
    rejection_reason: container.querySelector(".ivf-rejection-reason")?.value || null,
  };
}

// ── iv card (read-only, status-aware) — module scope ─────────────────────────
function renderIvCard(r) {
  const status = r.status || "completed";

  if (status === "cancelled") {
    return `
      <div class="iv-card iv-card-cancelled" data-record-id="${r.id}">
        <div class="iv-card-header">
          <span class="iv-card-round">${r.round || "面试"}</span>
          <span class="tag iv-tag-cancelled">已取消</span>
        </div>
        ${r.interviewer ? `<div class="iv-card-meta">${r.interviewer}</div>` : ""}
      </div>`;
  }

  if (status === "scheduled") {
    const scheduledTime = r.scheduled_at ? formatTime(r.scheduled_at) : "—";
    const locationStr = r.location ? `<div class="iv-card-meta">📍 ${r.location}</div>` : "";
    return `
      <div class="iv-card iv-card-scheduled" data-record-id="${r.id}">
        <div class="iv-card-header">
          <span class="iv-card-round">${r.round || "面试"}</span>
          <span class="tag iv-tag-scheduled">待面试</span>
        </div>
        <div class="iv-card-meta">${[r.interviewer, scheduledTime].filter(Boolean).join(" · ")}</div>
        ${locationStr}
        <div style="display:flex;gap:6px;margin-top:8px">
          <button class="btn btn-primary btn-sm iv-complete-btn" data-record-id="${r.id}">填写面评</button>
          <button class="btn btn-secondary btn-sm iv-cancel-btn" data-record-id="${r.id}">取消面试</button>
        </div>
      </div>`;
  }

  // completed (default)
  const stars = r.score ? "★".repeat(r.score) + '<span style="color:#ddd">' + "★".repeat(5 - r.score) + "</span>" : "";
  const conclusionColor = r.conclusion === "通过" ? "background:#dcfce7;color:#166534" : r.conclusion === "淘汰" ? "background:#fee2e2;color:#dc2626" : "background:#fef9c3;color:#854d0e";
  const conclusionTag = r.conclusion ? `<span class="tag" style="font-size:11px;${conclusionColor}">${r.conclusion}</span>` : "";
  const meta = [r.interviewer, r.interview_time ? formatTime(r.interview_time) : null].filter(Boolean).join(" · ");
  const commentHTML = r.comment ? `<div class="iv-card-comment iv-comment-collapsible" data-expanded="false">${r.comment}</div>` : "";
  return `
    <div class="iv-card" data-record-id="${r.id}">
      <button class="btn btn-secondary btn-sm iv-edit-btn" data-record-id="${r.id}">编辑</button>
      <div class="iv-card-header">
        <span class="iv-card-round">${r.round || "面试"}</span>
        ${stars ? `<span class="iv-card-score">${stars}</span>` : ""}
        ${conclusionTag}
      </div>
      ${meta ? `<div class="iv-card-meta">${meta}</div>` : ""}
      ${commentHTML}
    </div>`;
}

// ── Time slot selector ────────────────────────────────────────────────────────
function renderTimeSlotHTML(dateVal, timeVal) {
  const slots = [];
  for (let h = 8; h <= 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 22 && m > 0) break;
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  const defaultTime = timeVal || "09:00";
  const options = slots.map(s => `<option value="${s}"${s === defaultTime ? " selected" : ""}>${s}</option>`).join("");
  return `
    <div style="display:flex;gap:8px;align-items:center">
      <input class="ivf-time-date" type="date" value="${dateVal || ""}" style="flex:1;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px">
      <select class="ivf-time-slot" style="flex:1;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;background:#fff">${options}</select>
    </div>`;
}

function getTimeSlotValue(container, dateClass, slotClass) {
  const date = container.querySelector(dateClass)?.value;
  const slot = container.querySelector(slotClass)?.value;
  if (!date) return null;
  return `${date}T${slot || "09:00"}:00`;
}

// ── schedule form — module scope ───────────────────────────────────────────────
function renderScheduleFormHTML(round) {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  const pad = n => String(n).padStart(2, "0");
  const defaultDate = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const defaultSlot = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return `
    <div class="iv-edit-form iv-schedule-form">
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px">
        <div style="flex:1;min-width:120px">
          <label style="font-size:12px;color:#666;display:block;margin-bottom:4px">轮次</label>
          <div style="padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;background:#f9fafb;color:#555">${round || ""}</div>
        </div>
        <div style="flex:2;min-width:160px">
          <label style="font-size:12px;color:#666;display:block;margin-bottom:4px">面试官 <span style="color:#dc2626">*</span></label>
          <input class="ivf-interviewer" type="text" placeholder="面试官姓名" style="width:100%;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px">
        </div>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px">
        <div style="flex:2;min-width:180px">
          <label style="font-size:12px;color:#666;display:block;margin-bottom:4px">预约时间</label>
          ${renderTimeSlotHTML(defaultDate, defaultSlot)}
        </div>
        <div style="flex:2;min-width:160px">
          <label style="font-size:12px;color:#666;display:block;margin-bottom:4px">地点/会议链接（可选）</label>
          <input class="ivf-location" type="text" placeholder="线下地址或会议链接" style="width:100%;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px">
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm ivf-schedule-save">保存</button>
        <button class="btn btn-secondary btn-sm ivf-cancel">取消</button>
      </div>
    </div>`;
}

// ── Interview auto-numbering ───────────────────────────────────────────────────
function nextInterviewRound(records) {
  const count = (records || []).filter(r => r.status !== "cancelled").length;
  return `面试${count + 1}`;
}

// ── Reject overlay ────────────────────────────────────────────────────────────
function openRejectOverlay(linkId, candidateName, jobTitle, onSuccess) {
  const html = `
    <div class="form-group">
      <select id="dlg-reject-reason" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:14px">
        <option value="">-- 请选择原因 --</option>
        <option value="能力不足">能力不足</option>
        <option value="薪资不匹配">薪资不匹配</option>
        <option value="主动放弃">主动放弃</option>
        <option value="其他">其他</option>
      </select>
    </div>`;
  openDialog("淘汰原因", html, {
    confirmText: "确认淘汰",
    confirmClass: "btn-danger",
    onConfirm: async () => {
      const reason = document.getElementById("dlg-reject-reason").value;
      if (!reason) { showToast("请选择淘汰原因", "error"); return; }
      await api.patch(`/api/pipeline/link/${linkId}/outcome`, { outcome: "rejected", rejection_reason: reason });
      closeDialog();
      showToast("已标记淘汰", "success");
      if (onSuccess) onSuccess();
    }
  });
}

// ── Withdraw overlay ──────────────────────────────────────────────────────────
function openWithdrawOverlay(linkId, candidateName, jobTitle, onSuccess) {
  const reasons = ["接受了其他Offer","薪资未达预期","岗位职责不符合预期","个人原因（家庭/健康等）","地点/出行问题","其他"];
  const html = `
    <p style="font-size:13px;color:var(--c-text-secondary);margin-bottom:12px">${candidateName} · ${jobTitle}</p>
    <div class="form-group">
      <label>退出原因 <span style="color:var(--c-reject)">*</span></label>
      <div class="action-btn-group" style="flex-wrap:wrap;margin-top:8px" id="dlg-withdraw-btns">
        ${reasons.map(r => `<button type="button" class="iv-reason-btn" data-v="${r}">${r}</button>`).join("")}
      </div>
      <input id="dlg-withdraw-reason" type="hidden">
    </div>
    <div class="form-group" style="margin-top:10px">
      <label>补充说明（选填）</label>
      <textarea id="dlg-withdraw-note" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:14px;min-height:60px;box-sizing:border-box;margin-top:6px" placeholder="可填写补充说明..."></textarea>
    </div>`;
  openDialog("候选人退出", html, {
    confirmText: "确认退出",
    confirmClass: "btn-danger",
    onConfirm: async () => {
      const reason = document.getElementById("dlg-withdraw-reason").value;
      if (!reason) { showToast("请选择退出原因", "error"); return; }
      const note = document.getElementById("dlg-withdraw-note").value.trim();
      const fullReason = note ? `${reason}：${note}` : reason;
      await api.patch(`/api/pipeline/link/${linkId}/withdraw`, { reason: fullReason });
      closeDialog();
      showToast("已标记候选人退出", "success");
      if (onSuccess) onSuccess();
    },
    onOpen: () => {
      document.querySelectorAll("#dlg-withdraw-btns .iv-reason-btn").forEach(btn => {
        btn.onclick = () => {
          document.querySelectorAll("#dlg-withdraw-btns .iv-reason-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          document.getElementById("dlg-withdraw-reason").value = btn.dataset.v;
        };
      });
    }
  });
}

// ── Hire overlay ──────────────────────────────────────────────────────────────
async function renderPipelineTracking(el) {
  el.innerHTML = `
    <div class="page-header"><h1>进行中</h1></div>
    <div class="filter-bar" style="margin-bottom:16px">
      <input id="pt-search" type="text" placeholder="搜索候选人姓名..." style="flex:1;min-width:200px;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;outline:none">
      <div style="display:flex;gap:4px;background:#f3f4f6;border-radius:8px;padding:3px">
        <button id="pt-group-job" class="btn btn-primary btn-sm" style="border-radius:6px">按岗位</button>
        <button id="pt-group-stage" class="btn btn-secondary btn-sm" style="border-radius:6px;background:transparent;border:none">按阶段</button>
      </div>
    </div>
    <div id="pt-content"><span class="spinner" style="margin:24px"></span></div>`;

  const links = await api.get("/api/pipeline/active");
  const contentEl = document.getElementById("pt-content");
  if (!contentEl) return;

  const ivCache = {}; // linkId -> records[]
  let groupMode = "job";

  // ── progress dots ──────────────────────────────────────────────────────────
  function renderProgressDots(stages, currentStage, activities) {
    const recs = (activities || []).filter(a => a.type !== "stage_change" && a.type !== "note");
    let html = '<div class="pt-progress">';
    const allDots = [...recs.sort((a,b) => a.id - b.id)];
    allDots.forEach((r, i) => {
      if (i > 0) html += `<div class="pt-dot-line done"></div>`;
      let dotClass = "pt-dot";
      let symbol = "";
      const typeLabel = { resume_review: "简历筛选", interview: "面试", phone_screen: "电话初筛", offer: "Offer", onboard: "入职确认", background_check: "背调" };
      let title = r.round || typeLabel[r.type] || r.type;
      if (r.status === "cancelled") {
        dotClass += " cancelled"; symbol = "✗"; title += " (已取消)";
      } else {
        dotClass += " done"; symbol = "●";
        if (r.status === "scheduled") title += " (已安排)";
        else if (r.conclusion) title += ` (${r.conclusion})`;
      }
      html += `<div class="${dotClass}" title="${title}">${symbol}</div>`;
    });
    if (allDots.length > 0) html += `<div class="pt-dot-line"></div>`;
    html += `<div class="pt-dot" title="待安排">○</div>`;
    html += `<span class="pt-stage-label">${currentStage || "-"}</span></div>`;
    return html;
  }

  // ── expand row ─────────────────────────────────────────────────────────────
  async function expandRow(tr, l) {
    if (!ivCache[l.id]) {
      ivCache[l.id] = await api.get(`/api/activities?link_id=${l.id}`);
    }
    const records = ivCache[l.id];

    const expandTr = document.createElement("tr");
    expandTr.className = "pt-expand-row";
    expandTr.dataset.linkId = l.id;
    const colSpan = tr.cells.length;
    expandTr.innerHTML = `<td colspan="${colSpan}"><div class="pt-expand-inner" id="pt-expand-${l.id}"></div></td>`;
    tr.after(expandTr);

    const inner = expandTr.querySelector(`#pt-expand-${l.id}`);
    renderExpandInner(inner, l, records);
  }

  function renderExpandInner(inner, l, activities) {
    const chainActs = activities.filter(a => CHAIN_TYPES.has(a.type));
    const notes = activities.filter(a => a.type === "note");
    const tail = getCurrentTailActivity(activities);
    const tailComplete = isTailComplete(tail);

    // history = all chain activities except tail
    const history = tail ? chainActs.slice(0, -1) : [];

    // render history cards (read-only)
    let historyHTML = "";
    if (history.length) {
      historyHTML = history.map(a => renderActivityCard(a, false)).join("");
    }

    // render notes (always read-only, shown after history)
    const notesHTML = notes.map(a => renderActivityCard(a, true)).join("");

    inner.innerHTML = `
      <div id="pt-tail-${l.id}"></div>
      <div id="pt-next-${l.id}" style="margin-top:8px"></div>
      ${history.length ? `
      <div class="collapsible collapsed" style="margin-top:10px" id="pt-history-wrap-${l.id}">
        <span class="collapsible-toggle" id="pt-history-toggle-${l.id}">▶ 查看历史记录(${history.length}条)</span>
        <div class="collapsible-body" style="margin-top:6px">
          <div id="pt-history-${l.id}">${historyHTML}</div>
        </div>
      </div>` : `<div id="pt-history-${l.id}"></div>`}
      <div id="pt-notes-${l.id}" style="margin-top:4px">${notesHTML}</div>
      <div class="action-btn-group" style="margin-top:10px">
        <button class="btn btn-secondary btn-sm pt-note-btn">+ 备注</button>
        <button type="button" class="btn btn-secondary btn-sm pt-transfer-btn">转移岗位</button>
        <button type="button" class="btn btn-secondary btn-sm pt-withdraw-btn" style="color:var(--c-reject);border-color:#fca5a5">候选人退出</button>
      </div>`;

    const tailDiv = inner.querySelector(`#pt-tail-${l.id}`);
    const nextDiv = inner.querySelector(`#pt-next-${l.id}`);

    async function refreshActivities() {
      delete ivCache[l.id];
      ivCache[l.id] = await api.get(`/api/activities?link_id=${l.id}`);
      // update l.stage from server
      const active = links.find(lk => lk.id === l.id);
      const fresh = await api.get(`/api/pipeline/active`);
      const freshLink = fresh.find(lk => lk.id === l.id);
      if (freshLink && active) active.stage = freshLink.stage;
      if (freshLink) l.stage = freshLink.stage;
      renderExpandInner(inner, l, ivCache[l.id]);
    }

    // ── render tail node ──────────────────────────────────────────────────────
    function renderTail() {
      if (!tail) {
        tailDiv.innerHTML = `<div style="color:#aaa;font-size:13px;padding:4px 0">暂无活动记录</div>`;
        return;
      }

      if (tail.type === "resume_review" && !tailComplete) {
        // pending resume_review: inline form — 筛选人[___] [✓通过] [✗淘汰]
        tailDiv.innerHTML = `
          <div class="iv-card activity-card" data-activity-id="${tail.id}">
            <div class="iv-card-header"><span class="iv-card-round">简历筛选</span></div>
            <div class="form-inline" style="margin-top:8px">
              <label style="font-size:12px;color:var(--c-text-secondary);white-space:nowrap">筛选人</label>
              <input class="rr-actor-input" placeholder="姓名" value="${tail.actor||""}" style="padding:5px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;width:120px;box-sizing:border-box">
              <button class="btn btn-primary btn-sm rr-pass-btn">✓ 通过</button>
              <button class="btn btn-sm rr-reject-btn" style="color:var(--c-reject);border:1px solid #fca5a5;background:var(--bg-reject)">✗ 淘汰</button>
            </div>
          </div>`;
        tailDiv.querySelector(".rr-pass-btn").onclick = async () => {
          const actor = tailDiv.querySelector(".rr-actor-input").value.trim();
          if (!actor) { showToast("请填写筛选人", "error"); return; }
          await api.patch(`/api/activities/${tail.id}`, { conclusion: "通过", status: "completed", actor });
          await refreshActivities();
        };
        tailDiv.querySelector(".rr-reject-btn").onclick = () => {
          const actor = tailDiv.querySelector(".rr-actor-input").value.trim();
          if (!actor) { showToast("请填写筛选人", "error"); return; }
          // Save actor first, then open reject overlay
          api.patch(`/api/activities/${tail.id}`, { actor }).then(() => {
            openRejectOverlay(l.id, l.candidate_name, l.job_title, async () => {
              await refreshActivities(); renderContent();
            });
          });
        };
        return;
      }

      if (tail.type === "interview" && tail.status === "scheduled") {
        // scheduled interview: show complete/cancel buttons
        tailDiv.innerHTML = renderActivityCard(tail, false);
        const actionDiv = document.createElement("div");
        actionDiv.className = "action-btn-group";
        actionDiv.innerHTML = `
          <button class="btn btn-primary btn-sm iv-complete-btn">填写面评</button>
          <button class="btn btn-secondary btn-sm iv-cancel-btn">取消面试</button>`;
        tailDiv.querySelector(".activity-card").appendChild(actionDiv);

        actionDiv.querySelector(".iv-complete-btn").onclick = () => {
          const formDiv = document.createElement("div");
          formDiv.className = "iv-edit-form";
          formDiv.innerHTML = renderIvFormHTML({...tail, status: "completed"}, tail.round);
          bindIvFormInteractivity(formDiv);
          tailDiv.innerHTML = "";
          tailDiv.appendChild(formDiv);
          formDiv.querySelector(".ivf-cancel").onclick = () => renderExpandInner(inner, l, activities);
          formDiv.querySelector(".ivf-save").onclick = async () => {
            const data = { ...getIvFormData(formDiv), status: "completed" };
            if (!data.conclusion) { showToast("请选择结论", "error"); return; }
            await api.patch(`/api/activities/${tail.id}`, data);
            if (data.conclusion === "淘汰") {
              await api.patch(`/api/pipeline/link/${l.id}/outcome`, { outcome: "rejected", rejection_reason: data.rejection_reason || null });
              await refreshActivities(); renderContent(); return;
            }
            await refreshActivities();
          };
        };
        actionDiv.querySelector(".iv-cancel-btn").onclick = async () => {
          await api.patch(`/api/activities/${tail.id}`, { status: "cancelled" });
          await refreshActivities();
        };
        return;
      }

      if (tail.type === "offer" && !tailComplete) {
        // incomplete offer: show edit form inline
        let formHTML, getFormData, bindFn;
        formHTML = renderOfferFormHTML(tail);
        getFormData = getOfferFormData;
        bindFn = bindOfferFormInteractivity;
        tailDiv.innerHTML = formHTML;
        bindFn(tailDiv);
        tailDiv.querySelector(".ivf-save").onclick = async () => {
          const data = getFormData(tailDiv);
          if (!data.conclusion) { showToast("请选择结论", "error"); return; }
          await api.patch(`/api/activities/${tail.id}`, data);
          if (tail.type === "offer" && data.conclusion === "接受") {
            openHireOverlay(l.id, l.candidate_name, l.job_title, () => {
              const idx = links.findIndex(lk => lk.id === l.id);
              if (idx !== -1) links.splice(idx, 1);
              renderContent();
            });
            return;
          }
          await refreshActivities();
        };
        tailDiv.querySelector(".ivf-cancel").onclick = () => renderExpandInner(inner, l, activities);
        return;
      }

      // completed tail: show read-only card with edit button
      tailDiv.innerHTML = renderActivityCard(tail, true);
      tailDiv.querySelectorAll(".activity-edit-btn").forEach(btn => {
        btn.onclick = () => {
          const formDiv = document.createElement("div");
          formDiv.className = "iv-edit-form";
          if (tail.type === "interview") {
            formDiv.innerHTML = renderIvFormHTML(tail, tail.round);
            bindIvFormInteractivity(formDiv);
            formDiv.querySelector(".ivf-save").onclick = async () => {
              const data = getIvFormData(formDiv);
              if (!data.conclusion) { showToast("请选择结论", "error"); return; }
              await api.patch(`/api/activities/${tail.id}`, { ...data, status: "completed" });
              await refreshActivities();
            };
          } else if (tail.type === "offer") {
            formDiv.innerHTML = renderOfferFormHTML(tail);
            bindOfferFormInteractivity(formDiv);
            formDiv.querySelector(".ivf-save").onclick = async () => {
              const data = getOfferFormData(formDiv);
              if (!data.conclusion) { showToast("请选择结论", "error"); return; }
              await api.patch(`/api/activities/${tail.id}`, data);
              await refreshActivities();
            };
          } else if (tail.type === "note") {
            formDiv.innerHTML = renderNoteFormHTML(tail);
            formDiv.querySelector(".ivf-save").onclick = async () => {
              await api.patch(`/api/activities/${tail.id}`, getNoteFormData(formDiv));
              await refreshActivities();
            };
          }
          formDiv.querySelector(".ivf-cancel").onclick = () => renderExpandInner(inner, l, activities);
          tailDiv.innerHTML = "";
          tailDiv.appendChild(formDiv);
        };
      });
    }

    // ── render next step selector ─────────────────────────────────────────────
    function renderNextStep() {
      if (!tailComplete || !tail) return;

      // Offer已接受但未入职：显示 onboard 表单
      if (tail.type === "offer" && tail.conclusion === "接受") {
        nextDiv.innerHTML = `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 12px">
            <div style="font-size:13px;color:#166534;margin-bottom:8px">Offer 已接受，请确认入职：</div>
            <div id="pt-onboard-form-${l.id}">${renderOnboardFormHTML()}</div>
          </div>`;
        const formDiv = nextDiv.querySelector(`#pt-onboard-form-${l.id}`);
        formDiv.querySelector(".ivf-save").onclick = () => withLoading(formDiv.querySelector(".ivf-save"), async () => {
          const data = getOnboardFormData(formDiv);
          if (!data.start_date) { showToast("请填写入职日期", "error"); return; }
          await api.post("/api/activities", { link_id: l.id, type: "onboard", ...data });
          showToast("已确认入职", "success");
          const idx = links.findIndex(lk => lk.id === l.id);
          if (idx !== -1) links.splice(idx, 1);
          renderContent();
        });
        formDiv.querySelector(".ivf-cancel").onclick = () => { nextDiv.innerHTML = ""; };
        return;
      }

      if (tail.conclusion !== "通过" && tail.conclusion !== "接受") return;

      // Determine primary and secondary actions
      let primary, secondary;
      if (tail.type === "resume_review") {
        primary = { type: "interview", label: "安排面试" };
        secondary = { type: "offer", label: "直接发Offer" };
      } else if (tail.type === "interview") {
        primary = { type: "interview", label: "安排下一轮面试" };
        secondary = { type: "offer", label: "发Offer" };
      } else {
        return;
      }

      nextDiv.innerHTML = `
        <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 12px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <span style="font-size:13px;color:#1e40af;font-weight:600">${primary.label}</span>
            <a href="javascript:void(0)" id="pt-alt-${l.id}" style="font-size:12px;color:#6b7280;text-decoration:underline">${secondary.label}</a>
            <a href="javascript:void(0)" id="pt-bgcheck-${l.id}" style="font-size:12px;color:#6b7280;text-decoration:underline">安排背调</a>
          </div>
          <div id="pt-next-form-${l.id}"></div>
        </div>`;

      const formDiv = nextDiv.querySelector(`#pt-next-form-${l.id}`);
      // Auto-expand primary form
      showNextForm(primary.type, formDiv);

      // Secondary text link switches form
      nextDiv.querySelector(`#pt-alt-${l.id}`).onclick = (e) => {
        e.preventDefault();
        const altLink = nextDiv.querySelector(`#pt-alt-${l.id}`);
        const titleSpan = altLink.previousElementSibling;
        const curLabel = titleSpan.textContent;
        const curType = formDiv.dataset.currentType;
        titleSpan.textContent = altLink.textContent;
        altLink.textContent = curLabel;
        const newType = curType === primary.type ? secondary.type : primary.type;
        showNextForm(newType, formDiv);
      };

      // Background check link
      nextDiv.querySelector(`#pt-bgcheck-${l.id}`).onclick = (e) => {
        e.preventDefault();
        showNextForm("background_check", formDiv);
      };
    }

    function showNextForm(type, formDiv) {
      formDiv.dataset.currentType = type;
      if (type === "interview") {
        const autoRound = nextInterviewRound(activities.filter(a => a.type === "interview"));
        formDiv.innerHTML = renderScheduleFormHTML(autoRound);
        const saveBtn = formDiv.querySelector(".ivf-schedule-save");
        saveBtn.onclick = () => withLoading(saveBtn, async () => {
          const interviewer = formDiv.querySelector(".ivf-interviewer").value.trim();
          if (!interviewer) { showToast("请填写面试官", "error"); return; }
          const scheduledAt = getTimeSlotValue(formDiv, ".ivf-time-date", ".ivf-time-slot");
          const location = formDiv.querySelector(".ivf-location").value.trim();
          await api.post("/api/activities", {
            link_id: l.id, type: "interview",
            round: autoRound, actor: interviewer,
            scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
            location: location || null, status: "scheduled",
          });
          showToast("面试已安排", "success");
          await refreshActivities();
        });
        formDiv.querySelector(".ivf-cancel").onclick = () => { formDiv.innerHTML = ""; };
      } else if (type === "offer") {
        formDiv.innerHTML = renderOfferFormHTML();
        bindOfferFormInteractivity(formDiv);
        formDiv.querySelector(".ivf-save").onclick = async () => {
          const data = getOfferFormData(formDiv);
          if (!data.conclusion) { showToast("请选择结论", "error"); return; }
          await api.post("/api/activities", { link_id: l.id, type: "offer", ...data });
          if (data.conclusion === "拒绝") {
            await api.patch(`/api/pipeline/link/${l.id}/outcome`, { outcome: "rejected", rejection_reason: "候选人拒绝Offer" });
            showToast("Offer 已拒绝，候选人已淘汰", "success");
            const idx = links.findIndex(lk => lk.id === l.id);
            if (idx !== -1) links.splice(idx, 1);
            renderContent();
            return;
          }
          showToast("Offer 已保存", "success");
          await refreshActivities();
        };
        formDiv.querySelector(".ivf-cancel").onclick = () => { formDiv.innerHTML = ""; };
      } else if (type === "background_check") {
        formDiv.innerHTML = renderBgCheckFormHTML();
        formDiv.querySelectorAll(".iv-conclusion-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            formDiv.querySelectorAll(".iv-conclusion-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            formDiv.querySelector(".ivf-conclusion").value = btn.dataset.v;
          });
        });
        formDiv.querySelector(".ivf-save").onclick = async () => {
          const data = getBgCheckFormData(formDiv);
          if (!data.conclusion) { showToast("请选择背调结论", "error"); return; }
          await api.post("/api/activities", { link_id: l.id, type: "background_check", ...data });
          if (data.conclusion === "不通过") {
            showToast("背调不通过，建议淘汰候选人", "error");
            await refreshActivities();
            // Prompt to reject
            if (confirm("背调不通过，是否立即淘汰该候选人？")) {
              await api.patch(`/api/pipeline/link/${l.id}/outcome`, { outcome: "rejected", rejection_reason: "背调不通过" });
              const idx = links.findIndex(lk => lk.id === l.id);
              if (idx !== -1) links.splice(idx, 1);
              renderContent();
            }
            return;
          }
          showToast("背调已记录", "success");
          await refreshActivities();
        };
        formDiv.querySelector(".ivf-cancel").onclick = () => { formDiv.innerHTML = ""; };
      }
    }

    renderTail();
    renderNextStep();

    // bind history toggle
    const histToggle = inner.querySelector(`#pt-history-toggle-${l.id}`);
    if (histToggle) {
      histToggle.onclick = () => {
        const wrap = inner.querySelector(`#pt-history-wrap-${l.id}`);
        const collapsed = wrap.classList.contains("collapsed");
        wrap.classList.toggle("collapsed");
        histToggle.textContent = collapsed ? `▼ 收起历史记录` : `▶ 查看历史记录(${history.length}条)`;
      };
    }

    // bind note edit buttons in notes section
    inner.querySelectorAll(`#pt-notes-${l.id} .activity-edit-btn`).forEach(btn => {
      btn.onclick = () => {
        const actId = parseInt(btn.dataset.id);
        const act = activities.find(a => a.id === actId);
        if (!act) return;
        const card = inner.querySelector(`.activity-card[data-activity-id="${actId}"]`);
        const formDiv = document.createElement("div");
        formDiv.className = "iv-edit-form";
        formDiv.innerHTML = renderNoteFormHTML(act);
        card.replaceWith(formDiv);
        formDiv.querySelector(".ivf-cancel").onclick = () => formDiv.replaceWith(card);
        formDiv.querySelector(".ivf-save").onclick = async () => {
          await api.patch(`/api/activities/${actId}`, getNoteFormData(formDiv));
          await refreshActivities();
        };
      };
    });

    // note button — always visible
    inner.querySelector(".pt-note-btn").onclick = () => {
      const noteFormDiv = document.createElement("div");
      noteFormDiv.className = "note-form-inline";
      noteFormDiv.innerHTML = renderNoteFormHTML();
      inner.querySelector(`#pt-notes-${l.id}`).prepend(noteFormDiv);
      noteFormDiv.querySelector(".ivf-save").onclick = async () => {
        await api.post("/api/activities", { link_id: l.id, type: "note", ...getNoteFormData(noteFormDiv) });
        showToast("备注已保存", "success");
        await refreshActivities();
      };
      noteFormDiv.querySelector(".ivf-cancel").onclick = () => noteFormDiv.remove();
    };

    // withdraw button
    inner.querySelector(".pt-withdraw-btn").onclick = () => {
      openWithdrawOverlay(l.id, l.candidate_name, l.job_title, () => {
        const idx = links.findIndex(lk => lk.id === l.id);
        if (idx !== -1) links.splice(idx, 1);
        renderContent();
      });
    };

    // transfer button
    inner.querySelector(".pt-transfer-btn").onclick = async () => {
      const jobs = await api.get("/api/jobs");
      const filtered = jobs.filter(j => j.id !== l.job_id);
      const html = `
        <div class="form-group">
          <select id="dlg-link-job-select" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:14px">
            ${filtered.map(j => `<option value="${j.id}">${j.title} @${String(j.id).padStart(3,"0")}</option>`).join("")}
          </select>
        </div>
        <div class="form-group" style="margin-top:10px">
          <label style="font-size:13px;color:var(--c-text-secondary)">是否保留面试记录？</label>
          <div style="display:flex;gap:16px;margin-top:6px">
            <label style="font-size:13px;cursor:pointer"><input type="radio" name="dlg-keep-records" value="keep" style="margin-right:4px">保留</label>
            <label style="font-size:13px;cursor:pointer"><input type="radio" name="dlg-keep-records" value="fresh" checked style="margin-right:4px">从头开始</label>
          </div>
        </div>`;
      openDialog("转移岗位", html, {
        confirmText: "确认关联",
        onConfirm: async () => {
          const newJobId = parseInt(document.getElementById("dlg-link-job-select").value);
          if (!newJobId) return;
          const keepRecords = document.querySelector('input[name="dlg-keep-records"]:checked')?.value === "keep";
          closeDialog();
          await api.patch(`/api/pipeline/link/${l.id}/transfer`, { new_job_id: newJobId, keep_records: keepRecords });
          showToast("已转移岗位", "success");
          const freshLinks = await api.get("/api/pipeline/active");
          links.length = 0;
          links.push(...freshLinks);
          renderContent();
        }
      });
    };
  }

  // ── render row ─────────────────────────────────────────────────────────────
  function renderRow(l, showJob) {
    const days = l.days_since_update !== null ? (l.days_since_update === 0 ? "今天" : `${l.days_since_update}天前`) : "-";
    const starTag = l.starred ? `<span style="color:#f59e0b;font-size:13px;margin-right:2px">★</span>` : "";
    const blackTag = l.blacklisted ? `<span style="background:#fee2e2;color:#dc2626;font-size:11px;padding:1px 5px;border-radius:4px;margin-left:4px">黑名单</span>` : "";
    const records = ivCache[l.id] || [];
    const progressHTML = renderProgressDots([], l.stage, records);
    const secondCell = showJob
      ? `<td>${progressHTML}</td>`
      : `<td><span style="color:#555;font-size:13px;margin-right:8px">${l.job_title || "-"}</span>${progressHTML}</td>`;
    return `<tr class="pt-row" data-link-id="${l.id}">
      <td style="width:28px;color:#aaa;font-size:11px;padding-right:0">▶</td>
      <td>${starTag}<a href="#/candidates/${l.candidate_id}" style="font-weight:600;color:#1a1a2e;text-decoration:none" onclick="event.stopPropagation()">${l.candidate_name || "-"}</a>${blackTag}</td>
      ${secondCell}
      <td style="color:#888;font-size:13px;white-space:nowrap">${days}</td>
    </tr>`;
  }

  // ── render groups ──────────────────────────────────────────────────────────
  function renderGroups(groups, secondColLabel) {
    if (!groups.length) {
      contentEl.innerHTML = '<div class="empty-state" style="padding:32px">暂无进行中的人选</div>';
      return;
    }
    contentEl.innerHTML = groups.map(({ label, items }) => `
      <div class="card" style="margin-bottom:12px;padding:0;overflow:hidden">
        <div style="padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:8px">
          <span style="font-weight:600;font-size:14px;color:#1a1a2e">${label}</span>
          <span class="tag" style="font-size:11px">${items.length}人</span>
        </div>
        <table class="table" style="margin:0">
          <thead><tr><th style="width:28px"></th><th>候选人</th><th>${secondColLabel}</th><th>更新</th></tr></thead>
          <tbody>${items.map(l => renderRow(l, secondColLabel === "阶段")).join("")}</tbody>
        </table>
      </div>`).join("");

    // bind row click to expand/collapse
    contentEl.querySelectorAll(".pt-row").forEach(tr => {
      tr.onclick = async () => {
        const linkId = parseInt(tr.dataset.linkId);
        const existingExpand = contentEl.querySelector(`.pt-expand-row[data-link-id="${linkId}"]`);
        const arrow = tr.cells[0];
        if (existingExpand) {
          existingExpand.remove();
          arrow.textContent = "▶";
          arrow.classList.remove("pt-progress-arrow", "active");
          arrow.classList.add("pt-progress-arrow");
        } else {
          const l = links.find(lk => lk.id === linkId);
          if (!l) return;
          arrow.textContent = "▼";
          arrow.classList.add("pt-progress-arrow", "active");
          await expandRow(tr, l);
        }
      };
    });
  }

  const renderContent = () => {
    const q = document.getElementById("pt-search")?.value.trim().toLowerCase() || "";
    let filtered = links;
    if (q) filtered = filtered.filter(l => (l.candidate_name || "").toLowerCase().includes(q));

    if (groupMode === "job") {
      const jobMap = new Map();
      filtered.forEach(l => {
        if (!jobMap.has(l.job_id)) jobMap.set(l.job_id, { label: l.job_title || "未知岗位", items: [] });
        jobMap.get(l.job_id).items.push(l);
      });
      renderGroups([...jobMap.values()], "阶段");
    } else {
      const stageMap = new Map();
      filtered.forEach(l => {
        const s = l.stage || "未知阶段";
        if (!stageMap.has(s)) stageMap.set(s, { label: s, items: [] });
        stageMap.get(s).items.push(l);
      });
      renderGroups([...stageMap.values()], "岗位");
    }
  };

  document.getElementById("pt-search").oninput = renderContent;

  document.getElementById("pt-group-job").onclick = () => {
    groupMode = "job";
    document.getElementById("pt-group-job").className = "btn btn-primary btn-sm pt-group-btn active";
    document.getElementById("pt-group-stage").className = "btn btn-secondary btn-sm pt-group-btn";
    renderContent();
  };
  document.getElementById("pt-group-stage").onclick = () => {
    groupMode = "stage";
    document.getElementById("pt-group-stage").className = "btn btn-primary btn-sm pt-group-btn active";
    document.getElementById("pt-group-job").className = "btn btn-secondary btn-sm pt-group-btn";
    renderContent();
  };

  renderContent();

  // Auto-expand from URL parameter (e.g. #/pipeline?expand=42)
  const expandMatch = location.hash.match(/[?&]expand=(\d+)/);
  if (expandMatch) {
    const expandLinkId = parseInt(expandMatch[1]);
    const targetRow = contentEl.querySelector(`.pt-row[data-link-id="${expandLinkId}"]`);
    if (targetRow) {
      targetRow.click();
      setTimeout(() => targetRow.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }
    // Clean up URL parameter
    history.replaceState(null, "", location.pathname + "#/pipeline");
  }
}

// ── Talent Pool ───────────────────────────────────────────────────────────────
async function renderTalentPool(el) {
  el.innerHTML = `
    <div class="page-header">
      <h1>人才库</h1>
    </div>
    <div class="filter-bar" style="margin-bottom:16px">
      <input id="tp-search" type="text" placeholder="搜索姓名、手机、邮箱..." style="flex:1;min-width:200px;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;outline:none">
      <button id="tp-starred-btn" class="btn btn-secondary" style="white-space:nowrap">☆ 只看星标</button>
      <select id="tp-source" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;background:#fff">
        <option value="">全部来源</option>
        <option value="__none__">未关联供应商</option>
      </select>
      <button class="btn btn-secondary" onclick="openDedupPanel()">查重</button>
      <label style="font-size:14px;color:#666;cursor:pointer;white-space:nowrap">
        <input type="checkbox" id="tp-show-blacklisted" style="margin-right:4px">显示黑名单
      </label>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div id="tp-table"><span class="spinner" style="margin:24px"></span></div>
    </div>`;

  const followupColor = { "待跟进": "background:#fef9c3;color:#854d0e", "已联系": "background:#dcfce7;color:#166534", "暂不考虑": "background:#f3f4f6;color:#6b7280" };

  let starredOnly = _talentStarredOnly;

  const loadTalent = async () => {
    const q = document.getElementById("tp-search")?.value || "";
    const sourceVal = document.getElementById("tp-source")?.value || "";
    const showBlacklisted = document.getElementById("tp-show-blacklisted")?.checked || false;

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sourceVal && sourceVal !== "__none__") params.set("source", "");  // we filter client-side for supplier
    if (starredOnly) params.set("starred", "true");
    if (showBlacklisted) params.set("show_blacklisted", "true");

    let candidates = await api.get(`/api/candidates${params.toString() ? "?" + params.toString() : ""}`);
    // Client-side supplier filter
    if (sourceVal === "__none__") {
      candidates = candidates.filter(c => !c.supplier_id);
    } else if (sourceVal) {
      candidates = candidates.filter(c => c.supplier_id === parseInt(sourceVal));
    }
    const tableEl = document.getElementById("tp-table");
    if (!tableEl) return;

    // 动态填充供应商下拉（仅首次）
    const sourceSelect = document.getElementById("tp-source");
    if (sourceSelect && sourceSelect.options.length <= 2) {
      try {
        const tpSuppliers = await api.get("/api/suppliers");
        tpSuppliers.forEach(s => {
          const opt = document.createElement("option");
          opt.value = s.id; opt.textContent = s.name;
          sourceSelect.appendChild(opt);
        });
      } catch {}
    }

    if (!candidates.length) {
      tableEl.innerHTML = '<div class="empty-state">暂无候选人</div>';
      return;
    }

    tableEl.innerHTML = `<table class="table">
      <thead><tr><th>姓名</th><th>技能标签</th><th>当前岗位·阶段</th><th>来源</th><th>操作</th></tr></thead>
      <tbody>${candidates.map(c => {
        const tags = (c.skill_tags || []).slice(0, 3).map(t => `<span class="tag">${t}</span>`).join(" ");
        const activeLinks = c.active_links || [];
        const allLinks = c.job_links || [];
        const hiredLink = allLinks.find(l => l.outcome === "hired");
        let activeStage;
        if (activeLinks.length) {
          activeStage = activeLinks.map(l => `<div style="font-size:12px;color:#555">${l.job_title || ""}${l.stage ? " · " + l.stage : ""}</div>`).join("");
        } else if (hiredLink) {
          activeStage = `<span class="tag" style="background:#dcfce7;color:#166534;font-size:11px">已入职 · ${hiredLink.job_title || ""}</span>`;
        } else {
          activeStage = `<span class="tag" style="background:#f3f4f6;color:#888;font-size:11px">待分配</span>`;
        }
        const starBtn = `<button class="tp-star-btn" data-id="${c.id}" data-starred="${c.starred ? '1' : '0'}" style="background:none;border:none;cursor:pointer;font-size:16px;padding:0 4px;color:${c.starred ? '#f59e0b' : '#ccc'}" title="${c.starred ? '取消星标' : '标记星标'}">${c.starred ? '★' : '☆'}</button>`;
        return `<tr>
          <td style="display:flex;align-items:center;gap:4px">${starBtn}<a href="#/candidates/${c.id}" style="font-weight:600;color:#1a1a2e;text-decoration:none">${c.name || c.name_en || "?"}</a>
            ${c.blacklisted ? `<span style="background:#fee2e2;color:#dc2626;font-size:10px;padding:1px 6px;border-radius:4px;font-weight:600;margin-left:4px">黑名单</span>` : ""}
            ${c.last_title ? `<div style="font-size:12px;color:#888">${c.last_title}${c.last_company ? " @ " + c.last_company : ""}</div>` : ""}
          </td>
          <td>${tags || "-"}</td>
          <td>${activeStage}</td>
          <td>${c.supplier_name || c.source || "-"}</td>
          <td>
            <div style="display:flex;gap:6px">
              <a href="#/candidates/${c.id}" class="btn btn-secondary btn-sm">详情</a>
              ${hiredLink ? '' : `<button class="btn btn-primary btn-sm tp-recommend-btn" data-id="${c.id}">推荐到岗位</button>`}
            </div>
          </td>
        </tr>`;
      }).join("")}
      </tbody></table>`;

    // 星标切换
    tableEl.querySelectorAll(".tp-star-btn").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const newStarred = btn.dataset.starred !== "1";
        await api.patch(`/api/candidates/${id}`, { starred: newStarred });
        btn.dataset.starred = newStarred ? "1" : "0";
        btn.textContent = newStarred ? "★" : "☆";
        newStarred ? btn.classList.add("starred") : btn.classList.remove("starred");
        if (starredOnly && !newStarred) btn.closest("tr").remove();
      };
    });

    // 推荐到岗位
    tableEl.querySelectorAll(".tp-recommend-btn").forEach(btn => {
      btn.onclick = async () => {
        const jobs = await api.get("/api/jobs");
        const html = `
          <div class="form-group">
            <select id="dlg-link-job-select" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:14px">
              ${jobs.map(j => `<option value="${j.id}">${j.title}</option>`).join("")}
            </select>
          </div>`;
        openDialog("推荐到岗位", html, {
          confirmText: "确认关联",
          onConfirm: async () => {
            const jobId = parseInt(document.getElementById("dlg-link-job-select").value);
            try {
              await api.post("/api/pipeline/link", { candidate_id: parseInt(btn.dataset.id), job_id: jobId });
              closeDialog();
              location.hash = `#/pipeline`;
            } catch (e) { /* toast already shown by api helper */ }
          }
        });
      };
    });
  };

  loadTalent();

  let timer;
  document.getElementById("tp-search").oninput = () => { clearTimeout(timer); timer = setTimeout(loadTalent, 300); };
  document.getElementById("tp-source").onchange = loadTalent;
  document.getElementById("tp-show-blacklisted").onchange = loadTalent;
  document.getElementById("tp-starred-btn").onclick = () => {
    starredOnly = !starredOnly;
    _talentStarredOnly = starredOnly;
    const btn = document.getElementById("tp-starred-btn");
    btn.textContent = starredOnly ? "★ 只看星标" : "☆ 只看星标";
    btn.className = starredOnly ? "btn btn-primary" : "btn btn-secondary";
    loadTalent();
  };
  // restore button state if starredOnly was already true
  if (starredOnly) {
    const btn = document.getElementById("tp-starred-btn");
    btn.textContent = "★ 只看星标";
    btn.className = "btn btn-primary";
  }
}

// ── Dedup Panel ───────────────────────────────────────────────────────────────
async function openDedupPanel() {
  const overlay = document.getElementById("dedup-overlay");
  const content = document.getElementById("dedup-content");
  overlay.classList.remove("hidden");
  document.getElementById("dedup-close").onclick = () => overlay.classList.add("hidden");

  content.innerHTML = '<span class="spinner" style="margin:24px auto;display:block"></span>';

  const { pairs } = await api.get("/api/candidates/dedup/scan");

  if (!pairs.length) {
    content.innerHTML = '<div class="empty-state" style="padding:32px">未发现重复候选人</div>';
    return;
  }

  // Sort: blacklisted pairs first, then exact matches, then fuzzy
  const sorted = [...pairs].sort((a, b) => {
    const aBlack = (a.a.is_blacklisted || a.b.is_blacklisted) ? 0 : 1;
    const bBlack = (b.a.is_blacklisted || b.b.is_blacklisted) ? 0 : 1;
    if (aBlack !== bBlack) return aBlack - bBlack;
    const aExact = a.match_type === "exact" ? 0 : 1;
    const bExact = b.match_type === "exact" ? 0 : 1;
    return aExact - bExact;
  });

  function renderDedupCandidate(c) {
    const app = c.last_application;
    let appHtml = "";
    if (app) {
      const outcome = app.outcome === "rejected" ? "淘汰" : app.outcome === "withdrawn" ? "退出" : app.outcome === "hired" ? "入职" : "进行中";
      const daysAgo = app.days_ago != null ? `${app.days_ago}天前` : "";
      appHtml = `<div style="margin-top:6px;padding:6px 8px;background:#f9fafb;border-radius:6px;font-size:11px;color:#555;line-height:1.6">
        <span style="color:#374151;font-weight:500">上次：</span>${app.job_title || "未知岗位"} · ${app.final_stage || ""} · ${outcome}${daysAgo ? " · " + daysAgo : ""}
        ${app.last_interview_summary ? `<br><span style="color:#6b7280">${app.last_interview_summary}</span>` : ""}
      </div>`;
    }
    const blackTag = c.is_blacklisted
      ? `<span style="background:#fee2e2;color:#dc2626;font-size:11px;padding:1px 6px;border-radius:4px;margin-left:4px">黑名单${c.blacklist_reason ? "·" + c.blacklist_reason : ""}</span>`
      : "";
    return `
      <label style="border:2px solid ${c.is_blacklisted ? "#fca5a5" : "#e5e7eb"};border-radius:8px;padding:12px;cursor:pointer;display:block;background:${c.is_blacklisted ? "#fff5f5" : ""}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
          <input type="radio" name="dedup-primary-PAIRIDX" value="${c.id}" style="accent-color:#4f46e5">
          <span style="font-weight:600">${c.name || "-"}</span>
          <span style="font-size:12px;color:#888">${c.display_id}</span>
          ${blackTag}
        </div>
        <div style="font-size:12px;color:#555;line-height:1.6">
          ${c.phone ? `📱 ${c.phone}<br>` : ""}
          ${c.email ? `✉️ ${c.email}<br>` : ""}
          ${c.last_title ? `💼 ${c.last_title}${c.last_company ? " @ " + c.last_company : ""}` : ""}
        </div>
        ${appHtml}
      </label>`;
  }

  content.innerHTML = sorted.map((pair, idx) => {
    const isExact = pair.match_type === "exact";
    const hasBlacklisted = pair.a.is_blacklisted || pair.b.is_blacklisted;
    const borderColor = hasBlacklisted ? "#fca5a5" : isExact ? "#c7d2fe" : "#e5e7eb";
    const reasonColor = isExact ? "#4338ca" : "#6b7280";
    const matchBadge = isExact
      ? `<span style="background:#e0e7ff;color:#4338ca;font-size:11px;padding:1px 6px;border-radius:4px;margin-left:6px">精确匹配</span>`
      : `<span style="background:#f3f4f6;color:#6b7280;font-size:11px;padding:1px 6px;border-radius:4px;margin-left:6px">模糊匹配</span>`;
    const blackBanner = hasBlacklisted
      ? `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;padding:6px 10px;margin-bottom:10px;font-size:12px;color:#dc2626;font-weight:500">⚠️ 该候选人在黑名单中，合并前请确认</div>`
      : "";
    const candidateHtml = [pair.a, pair.b].map(c => renderDedupCandidate(c).replace(/name="dedup-primary-PAIRIDX"/g, `name="dedup-primary-${idx}"`)).join("");
    return `
    <div class="dedup-pair" id="dedup-pair-${idx}" style="border:1px solid ${borderColor};border-radius:10px;padding:16px;margin-bottom:16px">
      ${blackBanner}
      <div style="font-size:12px;color:${reasonColor};margin-bottom:10px">重复原因：${pair.reason}${matchBadge}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${candidateHtml}</div>
      <div style="margin-top:12px;text-align:right">
        <button class="btn btn-primary btn-sm" onclick="mergeCandidate(${idx}, ${pair.a.id}, ${pair.b.id})">合并</button>
      </div>
    </div>`;
  }).join("");
}

async function mergeCandidate(pairIdx, idA, idB) {
  const radios = document.querySelectorAll(`input[name="dedup-primary-${pairIdx}"]`);
  let primaryId = null;
  radios.forEach(r => { if (r.checked) primaryId = parseInt(r.value); });
  if (!primaryId) { alert("请先选择主档案"); return; }
  const secondaryId = primaryId === idA ? idB : idA;

  await api.post("/api/candidates/dedup/merge", { primary_id: primaryId, secondary_id: secondaryId });

  // 移除该重复对
  const pairEl = document.getElementById(`dedup-pair-${pairIdx}`);
  if (pairEl) pairEl.remove();

  // 检查是否还有剩余
  const remaining = document.querySelectorAll(".dedup-pair");
  if (!remaining.length) {
    document.getElementById("dedup-content").innerHTML = '<div class="empty-state" style="padding:32px">未发现重复候选人</div>';
  }

  // 刷新人才库列表（如果当前在人才库页面）
  if (location.hash.includes("talent")) {
    const pageEl = document.getElementById("page-content");
    if (pageEl) renderTalentPool(pageEl);
  }
}

// ── Job List ──────────────────────────────────────────────────────────────────
async function renderJobList(el) {
  el.innerHTML = `
    <div class="page-header">
      <h1>岗位库</h1>
      <a href="#/jobs/new" class="btn btn-primary">+ 新建岗位</a>
    </div>
    <div class="filter-bar" style="margin-bottom:8px">
      <input id="job-search" type="text" placeholder="搜索职位名称、部门、HR..." style="flex:1;min-width:200px;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;outline:none">
      <button id="job-search-btn" class="btn btn-secondary btn-sm">搜索</button>
    </div>
    <div class="filter-bar" style="margin-bottom:16px">
      <select id="job-status-filter" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;background:#fff">
        <option value="">全部状态</option>
        <option value="open">招聘中</option>
        <option value="paused">暂停</option>
        <option value="closed">已关闭</option>
      </select>
      <select id="job-dept-filter" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;background:#fff">
        <option value="">全部部门</option>
      </select>
      <select id="job-category-filter" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;background:#fff">
        <option value="">全部类型</option>
        <option value="研发">研发</option>
        <option value="销售">销售</option>
        <option value="市场">市场</option>
        <option value="职能">职能</option>
      </select>
      <select id="job-emptype-filter" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;background:#fff">
        <option value="">全部属性</option>
        <option value="全职">全职</option>
        <option value="实习">实习</option>
        <option value="顾问">顾问</option>
      </select>
      <select id="job-priority-filter" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;background:#fff">
        <option value="">全部优先级</option>
        <option value="高">高</option>
        <option value="中">中</option>
        <option value="低">低</option>
      </select>
      <label style="font-size:14px;color:#666;cursor:pointer;white-space:nowrap">
        <input type="checkbox" id="show-closed" style="margin-right:4px">显示已关闭
      </label>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div id="job-table"><span class="spinner" style="margin:24px"></span></div>
    </div>`;

  const EMOJI_MAP = [
    { keys: ["简历", "筛选"], emoji: "📄" },
    { keys: ["电话", "初筛", "面试"], emoji: "🎯" },
    { keys: ["offer", "Offer"], emoji: "🎁" },
  ];

  function stageEmoji(stageName) {
    for (const { keys, emoji } of EMOJI_MAP) {
      if (keys.some(k => stageName.includes(k))) return emoji;
    }
    return null;
  }

  function renderProgress(stageCounts) {
    const buckets = { "📄": 0, "🎯": 0, "🎁": 0 };
    for (const [stage, count] of Object.entries(stageCounts || {})) {
      const emoji = stageEmoji(stage) || "🎯";
      buckets[emoji] = (buckets[emoji] || 0) + count;
    }
    const parts = Object.entries(buckets).filter(([, n]) => n > 0).map(([e, n]) => `${e}${n}`);
    return parts.length ? parts.join(" ") : "-";
  }

  const loadJobs = async () => {
    const q = document.getElementById("job-search")?.value || "";
    const status = document.getElementById("job-status-filter")?.value || "";
    const dept = document.getElementById("job-dept-filter")?.value || "";
    const category = document.getElementById("job-category-filter")?.value || "";
    const emptype = document.getElementById("job-emptype-filter")?.value || "";
    const priority = document.getElementById("job-priority-filter")?.value || "";
    const includeClosed = document.getElementById("show-closed")?.checked || false;

    const params = new URLSearchParams();
    // 勾选"显示已关闭"或下拉选"已关闭"时，后端包含 closed 岗位
    if (includeClosed || status === "closed") params.set("include_closed", "true");
    if (q) params.set("q", q);
    if (dept) params.set("department", dept);
    if (category) params.set("job_category", category);
    if (emptype) params.set("employment_type", emptype);
    if (priority) params.set("priority", priority);
    const url = `/api/jobs${params.toString() ? "?" + params.toString() : ""}`;

    let jobs = await api.get(url);
    // 状态筛选：只在用户明确选了某个状态时才过滤
    if (status) jobs = jobs.filter(j => j.status === status);

    const tableEl = document.getElementById("job-table");
    if (!tableEl) return;

    // 动态填充部门下拉（仅首次）
    const deptSelect = document.getElementById("job-dept-filter");
    if (deptSelect && deptSelect.options.length <= 1) {
      [...new Set(jobs.map(j => j.department).filter(Boolean))].forEach(d => {
        const opt = document.createElement("option");
        opt.value = d; opt.textContent = d;
        deptSelect.appendChild(opt);
      });
    }

    if (!jobs.length) {
      tableEl.innerHTML = '<div class="empty-state">暂无岗位</div>';
      return;
    }

    const priorityStyle = { "高": "priority-high", "中": "priority-mid", "低": "priority-low" };

    tableEl.innerHTML = `<table class="table">
      <thead><tr><th>职位名称</th><th>城市/部门/类型/属性</th><th>优先级</th><th>状态</th><th>候选人进展</th><th>入职进度</th><th>操作</th></tr></thead>
      <tbody>${jobs.map(j => {
        const num = String(j.id).padStart(3, "0");
        const info = [j.city, j.department, j.job_category, j.employment_type].filter(Boolean).join(" · ");
        const total = Object.values(j.stage_counts || {}).reduce((a, b) => a + b, 0);
        const progress = total > 0 ? renderProgress(j.stage_counts) : "-";
        const priorityTag = j.priority ? `<span class="priority-tag ${priorityStyle[j.priority] || ""}">${j.priority}</span>` : "-";
        const statusLabel = j.status === "open" ? "招聘中" : j.status === "paused" ? "暂停" : "已关闭";
        const statusStyle = j.status === "open" ? "" : "background:#f0f0f0;color:#999";
        const hiredCount = j.hired_count || 0;
        const headcount = j.headcount || 1;
        const hiredFull = hiredCount >= headcount;
        const hiredProgress = `<span style="color:${hiredFull ? "#166534" : "#555"}">${hiredCount}/${headcount}${hiredFull ? " ✓" : ""}</span>`;
        return `
        <tr>
          <td>
            <a href="#/jobs/${j.id}" class="job-title-link">${j.title}</a>
            <div class="job-subtitle">#${num}</div>
          </td>
          <td style="color:#555;font-size:13px">${info || "-"}</td>
          <td>${priorityTag}</td>
          <td><span class="tag" style="${statusStyle}">${statusLabel}</span></td>
          <td class="job-progress">${progress}</td>
          <td>${hiredProgress}</td>
          <td>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <a href="#/jobs/edit/${j.id}" class="btn btn-secondary btn-sm">编辑</a>
              <button class="btn btn-secondary btn-sm copy-job-btn" data-job-id="${j.id}">复制</button>
              ${j.status !== "closed"
                ? `<button class="btn btn-danger btn-sm close-job-btn" data-job-id="${j.id}" data-active-count="${j.active_count}">关闭</button>`
                : `<button class="btn btn-secondary btn-sm reopen-job-btn" data-job-id="${j.id}">重新激活</button>`}
            </div>
          </td>
        </tr>`;
      }).join("")}
      </tbody></table>`;

    tableEl.querySelectorAll(".close-job-btn").forEach(btn => {
      btn.onclick = async () => {
        const jobId = btn.dataset.jobId;
        const activeCount = parseInt(btn.dataset.activeCount) || 0;
        if (activeCount === 0) {
          if (!confirm("确认关闭该岗位？关闭后不再显示在招聘中列表。")) return;
          await api.post(`/api/jobs/${jobId}/close`, { bulk: false });
          loadJobs();
        } else {
          const html = `
            <p style="color:var(--c-text-secondary);font-size:14px;margin-bottom:16px">该岗位还有 <strong>${activeCount}</strong> 名候选人在流程中，请选择处理方式：</p>
            <div style="display:flex;flex-direction:column;gap:8px">
              <button id="dlg-bulk-reject-btn" class="btn btn-danger" style="width:100%">一键全部退出（原因：岗位关闭）</button>
              <button id="dlg-cancel-close-btn" class="btn btn-secondary" style="width:100%;color:var(--c-text-muted)">取消</button>
            </div>`;
          openDialog("关闭岗位", html, {
            onOpen: () => {
              document.getElementById("dlg-bulk-reject-btn").onclick = async () => {
                closeDialog();
                await api.post(`/api/jobs/${jobId}/close`, { bulk: true });
                loadJobs();
              };
              document.getElementById("dlg-cancel-close-btn").onclick = closeDialog;
            }
          });
        }
      };
    });

    tableEl.querySelectorAll(".copy-job-btn").forEach(btn => {
      btn.onclick = async () => {
        const jobId = btn.dataset.jobId;
        const job = await api.get(`/api/jobs/${jobId}`);
        const year = new Date().getFullYear();
        const prefill = {
          ...job,
          title: `${job.title}（${year}）`,
          status: "open",
          target_onboard_date: "",
          headcount: job.headcount || 1,
        };
        const content = document.getElementById("page-content");
        renderJobForm(content, null, prefill);
      };
    });

    tableEl.querySelectorAll(".reopen-job-btn").forEach(btn => {
      btn.onclick = async () => {
        await api.post(`/api/jobs/${btn.dataset.jobId}/reopen`, {});
        loadJobs();
      };
    });
  };

  loadJobs();

  const doSearch = () => loadJobs();
  let timer;
  document.getElementById("job-search").oninput = () => { clearTimeout(timer); timer = setTimeout(doSearch, 300); };
  document.getElementById("job-search").onkeydown = (e) => { if (e.key === "Enter") { clearTimeout(timer); doSearch(); } };
  document.getElementById("job-search-btn").onclick = () => { clearTimeout(timer); doSearch(); };
  document.getElementById("job-status-filter").onchange = loadJobs;
  document.getElementById("job-dept-filter").onchange = loadJobs;
  document.getElementById("job-category-filter").onchange = loadJobs;
  document.getElementById("job-emptype-filter").onchange = loadJobs;
  document.getElementById("job-priority-filter").onchange = loadJobs;
  document.getElementById("show-closed").onchange = loadJobs;
}

// ── Job Form ──────────────────────────────────────────────────────────────────
async function renderJobForm(el, id, prefill = null) {
  let job = prefill || { title: "", department: "", jd: "", persona: "", status: "open", hr_owner: "", city: "", job_category: "", employment_type: "", priority: "", headcount: 1, target_onboard_date: "" };
  if (id) job = await api.get(`/api/jobs/${id}`);

  el.innerHTML = `
    <div class="page-header">
      <button class="btn btn-secondary btn-sm" onclick="history.back()">← 返回</button>
      <h1>${id ? "编辑岗位" : "新建岗位"}</h1>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>职位名称 *</label><input id="j-title" value="${job.title}"></div>
        <div class="form-group"><label>部门</label><input id="j-dept" value="${job.department || ""}"></div>
        <div class="form-group"><label>城市（Base）</label><input id="j-city" value="${job.city || ""}"></div>
        <div class="form-group"><label>负责HR</label><input id="j-hr" value="${job.hr_owner || ""}"></div>
        <div class="form-group"><label>状态</label>
          <select id="j-status">
            <option value="open" ${job.status === "open" ? "selected" : ""}>招聘中</option>
            <option value="paused" ${job.status === "paused" ? "selected" : ""}>暂停</option>
            <option value="closed" ${job.status === "closed" ? "selected" : ""}>已关闭</option>
          </select>
        </div>
        <div class="form-group"><label>岗位类型</label>
          <select id="j-category">
            <option value="" ${!job.job_category ? "selected" : ""}>-- 不设置 --</option>
            <option value="研发" ${job.job_category === "研发" ? "selected" : ""}>研发</option>
            <option value="销售" ${job.job_category === "销售" ? "selected" : ""}>销售</option>
            <option value="市场" ${job.job_category === "市场" ? "selected" : ""}>市场</option>
            <option value="职能" ${job.job_category === "职能" ? "selected" : ""}>职能</option>
          </select>
        </div>
        <div class="form-group"><label>岗位属性</label>
          <select id="j-emptype">
            <option value="" ${!job.employment_type ? "selected" : ""}>-- 不设置 --</option>
            <option value="全职" ${job.employment_type === "全职" ? "selected" : ""}>全职</option>
            <option value="实习" ${job.employment_type === "实习" ? "selected" : ""}>实习</option>
            <option value="顾问" ${job.employment_type === "顾问" ? "selected" : ""}>顾问</option>
          </select>
        </div>
        <div class="form-group"><label>优先级</label>
          <select id="j-priority">
            <option value="" ${!job.priority ? "selected" : ""}>-- 不设置 --</option>
            <option value="高" ${job.priority === "高" ? "selected" : ""}>高</option>
            <option value="中" ${job.priority === "中" ? "selected" : ""}>中</option>
            <option value="低" ${job.priority === "低" ? "selected" : ""}>低</option>
          </select>
        </div>
        <div class="form-group"><label>招聘人数</label><input id="j-headcount" type="number" min="1" value="${job.headcount || 1}"></div>
        <div class="form-group"><label>目标入职日期</label><input id="j-target-date" type="date" value="${job.target_onboard_date || ""}"></div>
        <div class="form-group form-full"><label>JD（职位描述）</label><textarea id="j-jd" style="min-height:120px">${job.jd || ""}</textarea></div>
        <div class="form-group form-full"><label>候选人画像</label><textarea id="j-persona" style="min-height:80px">${job.persona || ""}</textarea></div>
      </div>
      <div style="margin-top:20px;display:flex;gap:12px">
        <button class="btn btn-primary" id="save-job">保存</button>
        <button class="btn btn-secondary" onclick="history.back()">取消</button>
      </div>
    </div>`;

  const saveJobBtn = document.getElementById("save-job");
  saveJobBtn.onclick = () => withLoading(saveJobBtn, async () => {
    const title = document.getElementById("j-title").value.trim();
    if (!title) { showToast("职位名称不能为空", "error"); return; }
    const data = {
      title,
      department: document.getElementById("j-dept").value || null,
      city: document.getElementById("j-city").value || null,
      hr_owner: document.getElementById("j-hr").value || null,
      status: document.getElementById("j-status").value,
      job_category: document.getElementById("j-category").value || null,
      employment_type: document.getElementById("j-emptype").value || null,
      priority: document.getElementById("j-priority").value || null,
      jd: document.getElementById("j-jd").value || null,
      persona: document.getElementById("j-persona").value || null,
      headcount: parseInt(document.getElementById("j-headcount").value) || 1,
      target_onboard_date: document.getElementById("j-target-date").value || null,
    };
    if (id) {
      await api.patch(`/api/jobs/${id}`, data);
    } else {
      await api.post("/api/jobs", data);
    }
    location.hash = "#/jobs";
  });
}

async function renderJobDetail(el, jobId) {
  el.innerHTML = '<span class="spinner"></span>';
  const job = await api.get(`/api/jobs/${jobId}`);

  const statusLabel = job.status === "open" ? "招聘中" : job.status === "paused" ? "暂停" : "已关闭";
  const statusStyle = job.status === "open" ? "background:#dcfce7;color:#166534" : "background:#f0f0f0;color:#999";

  el.innerHTML = `
    <div class="page-header">
      <button class="btn btn-secondary btn-sm" onclick="history.back()">← 返回</button>
      <h1>${job.title}</h1>
      <a href="#/jobs/edit/${job.id}" class="btn btn-secondary btn-sm">编辑岗位</a>
    </div>
    <div style="display:flex;gap:0;border-bottom:2px solid #e5e7eb;margin-bottom:16px">
      <button class="jd-tab-btn active" data-tab="info" style="padding:8px 20px;border:none;background:none;cursor:pointer;font-size:14px;font-weight:600;color:#1a1a2e;border-bottom:2px solid #1a1a2e;margin-bottom:-2px">基本信息</button>
      <button class="jd-tab-btn" data-tab="progress" style="padding:8px 20px;border:none;background:none;cursor:pointer;font-size:14px;color:#888;border-bottom:2px solid transparent;margin-bottom:-2px">招聘进展</button>
    </div>

    <div class="jd-tab-panel" data-tab="info">
      <div class="card">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tbody>
            ${[
              ["职位名称", job.title],
              ["部门", job.department || "-"],
              ["城市", job.city || "-"],
              ["类型", job.job_category || "-"],
              ["属性", job.employment_type || "-"],
              ["优先级", job.priority || "-"],
              ["负责HR", job.hr_owner || "-"],
              ["状态", `<span class="tag" style="${statusStyle}">${statusLabel}</span>`],
            ].map(([label, val]) => `
              <tr style="border-bottom:1px solid #f0f0f0">
                <td style="padding:10px 12px;color:#888;width:100px;white-space:nowrap">${label}</td>
                <td style="padding:10px 12px;color:#1a1a2e">${val}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
      ${job.jd ? `<div class="card"><h2>JD</h2><div style="font-size:14px;line-height:1.8;white-space:pre-wrap;color:#333">${job.jd}</div></div>` : ""}
      ${job.persona ? `<div class="card"><h2>候选人画像</h2><div style="font-size:14px;line-height:1.8;white-space:pre-wrap;color:#333">${job.persona}</div></div>` : ""}
    </div>

    <div class="jd-tab-panel" data-tab="progress" style="display:none">
      <div id="jd-progress-content"><span class="spinner" style="margin:24px"></span></div>
    </div>`;

  // tab 切换
  el.querySelectorAll(".jd-tab-btn").forEach(btn => {
    btn.onclick = async () => {
      el.querySelectorAll(".jd-tab-btn").forEach(b => {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      el.querySelectorAll(".jd-tab-panel").forEach(p => p.dataset.tab === btn.dataset.tab ? p.classList.remove("hidden") : p.classList.add("hidden"));

      if (btn.dataset.tab === "progress") {
        const progressEl = document.getElementById("jd-progress-content");
        if (progressEl.querySelector(".spinner")) {
          const pipeline = await api.get(`/api/pipeline/jobs/${jobId}/pipeline`);
          if (!pipeline.stages.length) {
            progressEl.innerHTML = '<div class="empty-state" style="padding:32px">暂无候选人</div>';
            return;
          }
          progressEl.innerHTML = pipeline.stages.map(stage => {
            const cards = pipeline.pipeline[stage] || [];
            const active = cards.filter(l => !l.outcome);
            if (!active.length) return "";
            return `
              <div class="card" style="margin-bottom:12px">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                  <span style="font-weight:600;font-size:14px">${stage}</span>
                  <span class="tag" style="font-size:11px">${active.length}人</span>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:8px">
                  ${active.map(l => `
                    <div style="display:flex;align-items:center;gap:6px;padding:4px 10px;background:#f3f4f6;border-radius:6px">
                      <a href="#/candidates/${l.candidate_id}" style="font-size:13px;color:#1a1a2e;text-decoration:none">${l.candidate_name}</a>
                      <a href="#/pipeline" style="font-size:11px;color:#6b7280;text-decoration:none;white-space:nowrap">→ 进行中</a>
                    </div>`).join("")}
                </div>
              </div>`;
          }).join("") || '<div class="empty-state" style="padding:32px">暂无活跃候选人</div>';
        }
      }
    };
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────
async function renderAnalytics(el) {
  el.innerHTML = `
    <div class="page-header"><h1>数据分析</h1></div>
    <div id="analytics-content"><span class="spinner" style="margin:24px"></span></div>`;

  const [analytics, candidates] = await Promise.all([
    api.get("/api/pipeline/analytics"),
    api.get("/api/candidates"),
  ]);

  const content = document.getElementById("analytics-content");
  if (!content) return;

  // 来源分布
  const sourceMap = {};
  candidates.forEach(c => {
    const s = c.source || "未设置来源";
    sourceMap[s] = (sourceMap[s] || 0) + 1;
  });
  const totalCandidates = candidates.length || 1;

  // 招聘漏斗
  const stageCounts = analytics.stage_counts || {};
  const stageTotal = Object.values(stageCounts).reduce((a, b) => a + b, 0) || 1;
  const stageEntries = Object.entries(stageCounts).sort((a, b) => b[1] - a[1]);

  // 淘汰原因
  const rejMap = analytics.rejection_reasons || {};
  const rejTotal = Object.values(rejMap).reduce((a, b) => a + b, 0) || 1;

  // 岗位汇总
  const jobStats = analytics.job_stats || [];

  function barRow(label, count, total, color = "#4f46e5") {
    const pct = Math.round(count / total * 100);
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px">
        <span style="color:#333">${label}</span>
        <span style="color:#888">${count} (${pct}%)</span>
      </div>
      <div style="background:#f0f0f0;border-radius:4px;height:8px">
        <div style="width:${pct}%;background:${color};border-radius:4px;height:8px;transition:width 0.4s"></div>
      </div>
    </div>`;
  }

  content.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

      <!-- 招聘漏斗 -->
      <div class="card">
        <h2 style="margin-bottom:16px">招聘漏斗（活跃人选）</h2>
        ${stageEntries.length ? stageEntries.map(([stage, count], i) => {
          const prev = i > 0 ? stageEntries[i-1][1] : null;
          const conv = prev ? ` <span style="font-size:11px;color:#888">← ${Math.round(count/prev*100)}%</span>` : "";
          return barRow(stage + conv, count, stageTotal, "#4f46e5");
        }).join("") : '<div class="empty-state">暂无活跃候选人</div>'}
        <div style="margin-top:12px;font-size:13px;color:#888">共 ${stageTotal} 人在流程中</div>
      </div>

      <!-- 候选人来源分布 -->
      <div class="card">
        <h2 style="margin-bottom:16px">候选人来源分布</h2>
        ${Object.entries(sourceMap).sort((a,b) => b[1]-a[1]).map(([s, n]) =>
          barRow(s, n, totalCandidates, "#0891b2")
        ).join("") || '<div class="empty-state">暂无数据</div>'}
        <div style="margin-top:12px;font-size:13px;color:#888">共 ${candidates.length} 位候选人</div>
      </div>

      <!-- 淘汰原因分布 -->
      <div class="card">
        <h2 style="margin-bottom:16px">淘汰原因分布</h2>
        ${Object.entries(rejMap).sort((a,b) => b[1]-a[1]).map(([r, n]) =>
          barRow(r, n, rejTotal, "#dc2626")
        ).join("") || '<div class="empty-state">暂无淘汰记录</div>'}
        <div style="margin-top:12px;font-size:13px;color:#888">共 ${rejTotal === 1 && !Object.keys(rejMap).length ? 0 : Object.values(rejMap).reduce((a,b)=>a+b,0)} 次淘汰</div>
      </div>

    </div>`;
}

// ── Settings Page ─────────────────────────────────────────────────────────────
async function renderSettings(el) {
  const cfg = await api.get("/api/settings/ai");
  el.innerHTML = `
    <div class="page-header"><h1>设置</h1></div>
    <div class="card" style="max-width:560px">
      <h2 style="margin-bottom:20px;font-size:16px">AI 配置</h2>
      <div class="form-grid">
        <div class="form-group form-full">
          <label>Provider</label>
          <select id="s-provider">
            <option value="openai-compatible" ${cfg.provider === "openai-compatible" ? "selected" : ""}>OpenAI Compatible</option>
            <option value="openai" ${cfg.provider === "openai" ? "selected" : ""}>OpenAI</option>
            <option value="anthropic" ${cfg.provider === "anthropic" ? "selected" : ""}>Anthropic</option>
          </select>
        </div>
        <div class="form-group form-full">
          <label>Base URL</label>
          <input id="s-base-url" value="${cfg.base_url || ""}" placeholder="https://api.openai.com/v1">
        </div>
        <div class="form-group form-full">
          <label>Model</label>
          <input id="s-model" value="${cfg.model || ""}" placeholder="gpt-4o">
        </div>
        <div class="form-group form-full">
          <label>API Key</label>
          <div style="display:flex;gap:8px">
            <input id="s-api-key" type="password" value="" placeholder="${cfg.api_key_masked || "sk-..."}" style="flex:1">
            <button class="btn btn-secondary btn-sm" id="s-toggle-key" type="button">显示</button>
          </div>
          <div style="font-size:12px;color:#888;margin-top:4px">当前：${cfg.api_key_masked || "未设置"}（留空则不修改）</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px">
        <button class="btn btn-primary" id="s-save">保存</button>
        <button class="btn btn-secondary" id="s-verify">验证连接</button>
      </div>
      <div id="s-verify-result" style="margin-top:12px;font-size:14px"></div>
    </div>`;

  document.getElementById("s-toggle-key").onclick = () => {
    const inp = document.getElementById("s-api-key");
    const btn = document.getElementById("s-toggle-key");
    if (inp.type === "password") { inp.type = "text"; btn.textContent = "隐藏"; }
    else { inp.type = "password"; btn.textContent = "显示"; }
  };

  const saveBtn = document.getElementById("s-save");
  saveBtn.onclick = () => withLoading(saveBtn, async () => {
    const patch = {
      provider: document.getElementById("s-provider").value,
      base_url: document.getElementById("s-base-url").value.trim() || null,
      model: document.getElementById("s-model").value.trim() || null,
    };
    const key = document.getElementById("s-api-key").value.trim();
    if (key) patch.api_key = key;
    await api.patch("/api/settings/ai", patch);
    showToast("配置已保存");
  });

  const verifyBtn = document.getElementById("s-verify");
  verifyBtn.onclick = () => withLoading(verifyBtn, async () => {
    const resultEl = document.getElementById("s-verify-result");
    try {
      const res = await api.post("/api/settings/ai/verify", {});
      resultEl.innerHTML = `<span style="color:#166534">✓ ${res.message}</span>`;
    } catch (e) {
      resultEl.innerHTML = `<span style="color:#dc2626">✗ ${e.message || "连接失败"}</span>`;
    }
  });
}
