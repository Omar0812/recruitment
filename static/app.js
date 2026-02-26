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
  const colors = { success: "#166534", error: "#dc2626", info: "#1a1a2e" };
  const bg = { success: "#dcfce7", error: "#fee2e2", info: "#e0e7ff" };
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.cssText = `position:fixed;top:20px;right:20px;z-index:9999;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:500;color:${colors[type]||colors.info};background:${bg[type]||bg.info};box-shadow:0 2px 12px rgba(0,0,0,0.12);transition:opacity 0.3s`;
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

// ── Interview overlay (for kanban) ────────────────────────────────────────────
function openInterviewOverlay(linkId, round, stage, onSave) {
  const overlay = document.getElementById("interview-overlay");
  // reset fields
  document.getElementById("iv-round").value = round || "";
  document.getElementById("iv-round-label").textContent = round || "";
  document.getElementById("iv-interviewer").value = "";
  document.getElementById("iv-time-date").value = "";
  document.getElementById("iv-time-slot").value = "09:00";
  document.getElementById("iv-score").value = "";
  document.getElementById("iv-comment").value = "";
  document.getElementById("iv-conclusion").value = "";
  // reset stars
  document.querySelectorAll(".iv-star").forEach(s => s.classList.remove("active"));
  // reset conclusion buttons
  document.querySelectorAll("#interview-overlay .iv-conclusion-btn").forEach(b => b.classList.remove("active"));
  // reset rejection reason block
  const rejBlock = document.getElementById("iv-rejection-reason-block");
  if (rejBlock) {
    rejBlock.style.display = "none";
    document.getElementById("iv-rejection-reason").value = "";
    document.querySelectorAll("#iv-rejection-reason-btns .iv-reason-btn").forEach(b => b.classList.remove("active"));
    const otherInput = document.getElementById("iv-rejection-reason-other");
    if (otherInput) { otherInput.style.display = "none"; otherInput.value = ""; }
  }
  overlay.classList.remove("hidden");

  document.getElementById("iv-cancel").onclick = () => overlay.classList.add("hidden");
  const confirmBtn = document.getElementById("iv-confirm");
  confirmBtn.onclick = () => withLoading(confirmBtn, async () => {
    const rejection_reason = document.getElementById("iv-rejection-reason")?.value || null;
    const conclusion = document.getElementById("iv-conclusion").value || null;
    const dateVal = document.getElementById("iv-time-date").value;
    const slotVal = document.getElementById("iv-time-slot").value;
    const interview_time = dateVal ? `${dateVal}T${slotVal}:00` : null;
    await api.post("/api/activities", {
      link_id: parseInt(linkId),
      type: "interview",
      stage: stage || "",
      round: document.getElementById("iv-round").value || null,
      actor: document.getElementById("iv-interviewer").value || null,
      interview_time,
      score: parseInt(document.getElementById("iv-score").value) || null,
      comment: document.getElementById("iv-comment").value || null,
      conclusion,
      rejection_reason: rejection_reason || null,
      status: "completed",
    });
    if (conclusion === "淘汰") {
      await api.patch(`/api/pipeline/link/${linkId}/outcome`, { outcome: "rejected", rejection_reason: rejection_reason || null });
    }
    overlay.classList.add("hidden");
    showToast("面试记录已保存", "success");
    if (onSave) onSave();
  });
}

// bind star + conclusion interactivity for the overlay (called once on DOMContentLoaded)
function initInterviewOverlay() {
  // populate time slot select
  const slotSelect = document.getElementById("iv-time-slot");
  if (slotSelect) {
    for (let h = 8; h <= 22; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === 22 && m > 0) break;
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        const opt = document.createElement("option");
        opt.value = `${hh}:${mm}`;
        opt.textContent = `${hh}:${mm}`;
        slotSelect.appendChild(opt);
      }
    }
  }
  // stars
  const stars = document.querySelectorAll("#iv-score-stars .iv-star");
  stars.forEach(star => {
    star.addEventListener("mouseenter", () => {
      const v = parseInt(star.dataset.v);
      stars.forEach(s => s.classList.toggle("active", parseInt(s.dataset.v) <= v));
    });
    star.addEventListener("mouseleave", () => {
      const cur = parseInt(document.getElementById("iv-score").value) || 0;
      stars.forEach(s => s.classList.toggle("active", parseInt(s.dataset.v) <= cur));
    });
    star.addEventListener("click", () => {
      const v = parseInt(star.dataset.v);
      document.getElementById("iv-score").value = v;
      stars.forEach(s => s.classList.toggle("active", parseInt(s.dataset.v) <= v));
    });
  });
  document.getElementById("iv-score-clear").onclick = () => {
    document.getElementById("iv-score").value = "";
    stars.forEach(s => s.classList.remove("active"));
  };
  // conclusion buttons + rejection reason toggle
  document.querySelectorAll("#interview-overlay .iv-conclusion-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#interview-overlay .iv-conclusion-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("iv-conclusion").value = btn.dataset.v;
      const block = document.getElementById("iv-rejection-reason-block");
      if (block) {
        block.style.display = btn.dataset.v === "淘汰" ? "" : "none";
        if (btn.dataset.v !== "淘汰") {
          document.getElementById("iv-rejection-reason").value = "";
          document.querySelectorAll("#iv-rejection-reason-btns .iv-reason-btn").forEach(b => b.classList.remove("active"));
        }
      }
    });
  });
  // rejection reason buttons in overlay
  document.querySelectorAll("#iv-rejection-reason-btns .iv-reason-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#iv-rejection-reason-btns .iv-reason-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("iv-rejection-reason").value = btn.dataset.v;
      const otherInput = document.getElementById("iv-rejection-reason-other");
      if (otherInput) otherInput.style.display = btn.dataset.v === "其他" ? "" : "none";
    });
  });
  const otherInput = document.getElementById("iv-rejection-reason-other");
  if (otherInput) {
    otherInput.oninput = () => {
      document.getElementById("iv-rejection-reason").value = otherInput.value;
    };
  }
}

// ── Form validation ───────────────────────────────────────────────────────────
function validateCandidateForm({ phone, email, age, years_exp }) {
  if (phone && !/^\d{11}$/.test(phone)) { showToast("手机号格式不正确（需11位数字）", "error"); return false; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast("邮箱格式不正确", "error"); return false; }
  if (age !== null && age !== undefined && age !== "" && (isNaN(age) || age < 1 || age > 100)) { showToast("年龄请填写 1-100 之间的数字", "error"); return false; }
  if (years_exp !== null && years_exp !== undefined && years_exp !== "" && (isNaN(years_exp) || years_exp < 0 || years_exp > 50)) { showToast("工作年限请填写 0-50 之间的数字", "error"); return false; }
  return true;
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
  if (hash.startsWith("#/candidates/")) return renderCandidateProfile(content, hash.split("/")[2]);
  if (hash === "#/talent") return renderTalentPool(content);
  if (hash === "#/analytics") return renderAnalytics(content);
  if (hash === "#/jobs") return renderJobList(content);
  if (hash.startsWith("#/jobs/edit/")) return renderJobForm(content, hash.split("/")[3]);
  if (/^#\/jobs\/\d+$/.test(hash)) return renderJobDetail(content, hash.split("/")[2]);
  if (hash === "#/jobs/new") return renderJobForm(content, null);
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
  div.style.cssText = "border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:8px;background:#fafafa;position:relative";
  div.innerHTML = `
    <button type="button" class="block-del" style="position:absolute;top:8px;right:8px;background:none;border:none;cursor:pointer;color:#999;font-size:16px">×</button>
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
  div.style.cssText = "border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:8px;background:#fafafa;position:relative";
  div.innerHTML = `
    <button type="button" class="block-del" style="position:absolute;top:8px;right:8px;background:none;border:none;cursor:pointer;color:#999;font-size:16px">×</button>
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
  modalSaveBtn.style.display = "none"; // hide bottom save button in parse mode
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

  // Supplier dropdown: show/hide manual input
  const fSupplier = document.getElementById("f-supplier");
  const fSource = document.getElementById("f-source");
  fSupplier.onchange = () => { fSource.style.display = fSupplier.value === "__other__" ? "" : "none"; };

  // Quick-add supplier
  document.getElementById("f-add-supplier-btn").onclick = async () => {
    const name = prompt("供应商名称：");
    if (!name || !name.trim()) return;
    const typeVal = prompt("类型（猎头/招聘平台/内推/其他）：") || "其他";
    const newS = await api.post("/api/suppliers", { name: name.trim(), type: typeVal.trim() });
    const opt = document.createElement("option");
    opt.value = newS.id;
    opt.textContent = newS.name;
    fSupplier.insertBefore(opt, fSupplier.querySelector('option[value="__other__"]'));
    fSupplier.value = newS.id;
    fSource.style.display = "none";
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
      modalSaveBtn.style.display = "";
      location.hash = `#/candidates/${existingId}`;
    };
  });

  const ignoreBtn = document.getElementById("dup-ignore-btn");
  if (ignoreBtn) ignoreBtn.onclick = () => document.getElementById("dup-banner")?.remove();

  document.getElementById("modal-cancel").onclick = () => { modalSaveBtn.style.display = ""; overlay.classList.add("hidden"); };
  document.getElementById("f-cancel-btn").onclick = () => { modalSaveBtn.style.display = ""; overlay.classList.add("hidden"); };
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
    modalSaveBtn.style.display = "";
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
  document.querySelectorAll(".profile-tab-panel").forEach(p => p.style.display = p.dataset.tab === tabId ? "" : "none");
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
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
            <h1 style="margin:0;font-size:22px">${mainName} <span style="font-size:14px;color:#999;font-weight:400">@${displayId}</span></h1>
            ${c.name_en && c.name_en !== c.name ? `<span style="font-size:14px;color:#888">${c.name_en}</span>` : ""}
          </div>
          <div style="margin-top:6px;font-size:14px;color:#555">
            ${firstWork.title ? `${firstWork.title}${firstWork.company ? " @ " + firstWork.company : ""}` : (c.last_title || c.last_company ? [c.last_title,c.last_company].filter(Boolean).join(" @ ") : "")}
            ${firstEdu.degree ? ` &nbsp;·&nbsp; ${firstEdu.degree}${firstEdu.school ? " · " + firstEdu.school : ""}` : (c.education ? ` &nbsp;·&nbsp; ${[c.education,c.school].filter(Boolean).join(" · ")}` : "")}
          </div>
          <div style="margin-top:4px;font-size:13px;color:#888">
            ${[c.phone, c.email, c.years_exp != null ? c.years_exp + "年经验" : null].filter(Boolean).join(" &nbsp;·&nbsp; ")}
          </div>
          <div style="margin-top:8px;font-size:13px">
            ${latestActive
              ? `<span style="color:#555">当前流程：</span><span style="color:#1a1a2e;font-weight:600">${latestActive.job_title}</span> → <span class="tag" style="font-size:11px">${latestActive.stage||"-"}</span>`
              : latestInactive
                ? `<span style="color:#bbb">最近流程：</span><span style="color:#888;font-weight:600">${latestInactive.job_title}</span> · <span class="tag" style="font-size:11px;background:#fee2e2;color:#dc2626">${latestInactive.outcome==="rejected" ? "淘汰" + (latestInactive.rejection_reason ? "（"+latestInactive.rejection_reason+"）" : "") : "已退出"}</span>`
                : `<span style="color:#bbb">当前流程：暂无</span>`}
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:flex-start;flex-shrink:0">
          ${c.resume_path ? `<a href="/resumes/${c.resume_path.split('/').slice(-2).map(encodeURIComponent).join('/')}" target="_blank" class="btn btn-secondary btn-sm">下载简历</a>` : ""}
          <button class="btn btn-secondary btn-sm" id="edit-info-btn">编辑信息</button>
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
        b.style.color = "#888";
        b.style.borderBottomColor = "transparent";
      });
      btn.classList.add("active");
      btn.style.color = "#1a1a2e";
      btn.style.borderBottomColor = "#1a1a2e";
      document.querySelectorAll(".profile-tab-panel").forEach(p => p.style.display = p.dataset.tab === btn.dataset.tab ? "" : "none");

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
    eSupplier.onchange = () => { eSource.style.display = eSupplier.value === "__other__" ? "" : "none"; };
    document.getElementById("e-add-supplier-btn").onclick = async () => {
      const sName = prompt("供应商名称：");
      if (!sName || !sName.trim()) return;
      const sType = prompt("类型（猎头/招聘平台/内推/其他）：") || "其他";
      const newS = await api.post("/api/suppliers", { name: sName.trim(), type: sType.trim() });
      const opt = document.createElement("option");
      opt.value = newS.id;
      opt.textContent = newS.name;
      eSupplier.insertBefore(opt, eSupplier.querySelector('option[value="__other__"]'));
      eSupplier.value = newS.id;
      eSource.style.display = "none";
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
        const open = body.style.display === "none";
        body.style.display = open ? "" : "none";
        arrow.textContent = open ? "▼" : "▶";
      };
    }
    document.querySelectorAll(".hist-link-row").forEach(row => {
      row.onclick = async () => {
        const linkId = row.dataset.linkId;
        const detail = document.getElementById(`hist-iv-${linkId}`);
        const arrow = row.querySelector(".hist-arrow");
        const open = detail.style.display === "none";
        detail.style.display = open ? "" : "none";
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

  function openLinkJobOverlay() {
    api.get("/api/jobs").then(jobs => {
      const overlay = document.getElementById("link-job-overlay");
      const select = document.getElementById("link-job-select");
      document.querySelector("#link-job-overlay h2").textContent = "新增投递";
      select.innerHTML = jobs.map(j => `<option value="${j.id}">${j.title} @${String(j.id).padStart(3,"0")}</option>`).join("");
      const keepBlock = document.getElementById("link-job-keep-records-block");
      if (keepBlock) keepBlock.style.display = "none";
      overlay.classList.remove("hidden");
      document.getElementById("link-job-cancel").onclick = () => overlay.classList.add("hidden");
      const confirmBtn = document.getElementById("link-job-confirm");
      confirmBtn.onclick = () => withLoading(confirmBtn, async () => {
        const jobId = parseInt(select.value);
        if (!jobId) return;
        try {
          await api.post("/api/pipeline/link", { candidate_id: parseInt(id), job_id: jobId });
          overlay.classList.add("hidden");
          renderCandidateProfile(el, id);
        } catch (e) { /* toast shown */ }
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
const CHAIN_TYPES = new Set(["resume_review", "interview", "offer"]);

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
  const typeLabel = { resume_review: "简历筛选", interview: "面试", phone_screen: "电话初筛", note: "备注", offer: "Offer", stage_change: "阶段变更" };

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
    if (a.salary) metaParts.push(`薪资：${a.salary}`);
    if (a.start_date) metaParts.push(`入职：${a.start_date}`);
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
  const conclusionBtns = ["接受","拒绝","谈判中"].map(v =>
    `<button type="button" class="iv-conclusion-btn${r.conclusion===v?" active":""}" data-v="${v}">${v}</button>`
  ).join("");
  return `
    <div class="iv-form-row">
      <div><label>薪资（选填）</label><input class="ivf-salary" value="${r.salary||""}" placeholder="如：25k×14"></div>
      <div><label>入职日期（选填）</label><input class="ivf-start-date" type="date" value="${r.start_date||""}"></div>
    </div>
    <label>备注</label>
    <textarea class="ivf-comment" style="width:100%;padding:5px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;min-height:50px;box-sizing:border-box;margin-bottom:8px">${r.comment||""}</textarea>
    <label>结论</label>
    <div style="display:flex;gap:8px;margin:4px 0 10px">${conclusionBtns}</div>
    <input class="ivf-conclusion" type="hidden" value="${r.conclusion||""}">
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
    salary: container.querySelector(".ivf-salary")?.value || null,
    start_date: container.querySelector(".ivf-start-date")?.value || null,
    comment: container.querySelector(".ivf-comment")?.value || null,
    conclusion: container.querySelector(".ivf-conclusion")?.value || null,
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
  const isCustomReason = r.rejection_reason && !presetReasons.includes(r.rejection_reason);
  const rejectionReasonBtns = `
    <div style="font-size:11px;color:#888;margin:2px 0">能力维度</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">
      ${["技术/专业能力不达标","综合素质不匹配","经验年限不足"].map(v => {
        const isActive = r.rejection_reason === v;
        return `<button type="button" class="ivf-reason-btn${isActive?" active":""}" data-v="${v}">${v}</button>`;
      }).join("")}
    </div>
    <div style="font-size:11px;color:#888;margin:2px 0">意愿维度</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">
      ${["薪资期望差距过大","候选人主动放弃","地点/出行不接受"].map(v => {
        const isActive = r.rejection_reason === v;
        return `<button type="button" class="ivf-reason-btn${isActive?" active":""}" data-v="${v}">${v}</button>`;
      }).join("")}
    </div>
    <div style="font-size:11px;color:#888;margin:2px 0">流程维度</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">
      ${["背调未通过","入职前反悔","其他"].map(v => {
        const isActive = v === "其他" ? isCustomReason : r.rejection_reason === v;
        return `<button type="button" class="ivf-reason-btn${isActive?" active":""}" data-v="${v}">${v}</button>`;
      }).join("")}
    </div>`;
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
    <div class="ivf-rejection-reason-block" style="margin-bottom:10px;${isRejected?"":"display:none"}">
      <label>淘汰原因</label>
      ${rejectionReasonBtns}
      <input class="ivf-rejection-reason" type="hidden" value="${r.rejection_reason||""}">
      <input class="ivf-rejection-reason-other" type="text" placeholder="请填写原因" style="${isCustomReason ? "" : "display:none;"}padding:5px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;width:100%;box-sizing:border-box" value="${isCustomReason ? r.rejection_reason : ""}">
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
        rejectionBlock.style.display = btn.dataset.v === "淘汰" ? "" : "none";
        if (btn.dataset.v !== "淘汰") {
          container.querySelector(".ivf-rejection-reason").value = "";
          container.querySelectorAll(".ivf-reason-btn").forEach(b => b.classList.remove("active"));
        }
      }
    });
  });
  // rejection reason buttons
  if (rejectionBlock) {
    container.querySelectorAll(".ivf-reason-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(".ivf-reason-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        container.querySelector(".ivf-rejection-reason").value = btn.dataset.v;
        const otherInput = container.querySelector(".ivf-rejection-reason-other");
        if (otherInput) otherInput.style.display = btn.dataset.v === "其他" ? "" : "none";
      });
    });
    const otherInput = container.querySelector(".ivf-rejection-reason-other");
    if (otherInput) {
      otherInput.oninput = () => {
        container.querySelector(".ivf-rejection-reason").value = otherInput.value;
      };
    }
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
  const overlay = document.getElementById("reject-overlay");
  overlay.classList.remove("hidden");
  document.getElementById("reject-reason-select").value = "";
  document.getElementById("reject-cancel").onclick = () => overlay.classList.add("hidden");
  const confirmBtn = document.getElementById("reject-confirm");
  confirmBtn.onclick = () => withLoading(confirmBtn, async () => {
    const reason = document.getElementById("reject-reason-select").value;
    if (!reason) { showToast("请选择淘汰原因", "error"); return; }
    await api.patch(`/api/pipeline/link/${linkId}/outcome`, { outcome: "rejected", rejection_reason: reason });
    overlay.classList.add("hidden");
    showToast("已标记淘汰", "success");
    if (onSuccess) onSuccess();
  });
}

// ── Withdraw overlay ──────────────────────────────────────────────────────────
function openWithdrawOverlay(linkId, candidateName, jobTitle, onSuccess) {
  const overlay = document.getElementById("withdraw-overlay");
  document.getElementById("withdraw-info").textContent = `${candidateName} · ${jobTitle}`;
  document.getElementById("withdraw-reason-value").value = "";
  document.getElementById("withdraw-reason-note").value = "";
  document.querySelectorAll("#withdraw-reason-btns .iv-reason-btn").forEach(b => b.classList.remove("active"));
  overlay.classList.remove("hidden");

  // bind reason buttons
  document.querySelectorAll("#withdraw-reason-btns .iv-reason-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll("#withdraw-reason-btns .iv-reason-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("withdraw-reason-value").value = btn.dataset.v;
    };
  });

  document.getElementById("withdraw-cancel").onclick = () => overlay.classList.add("hidden");
  const confirmBtn = document.getElementById("withdraw-confirm");
  confirmBtn.onclick = () => withLoading(confirmBtn, async () => {
    const reason = document.getElementById("withdraw-reason-value").value;
    if (!reason) { showToast("请选择退出原因", "error"); return; }
    const note = document.getElementById("withdraw-reason-note").value.trim();
    const fullReason = note ? `${reason}：${note}` : reason;
    await api.patch(`/api/pipeline/link/${linkId}/withdraw`, { reason: fullReason });
    overlay.classList.add("hidden");
    showToast("已标记候选人退出", "success");
    if (onSuccess) onSuccess();
  });
}

// ── Hire overlay ──────────────────────────────────────────────────────────────
function openHireOverlay(linkId, candidateName, jobTitle, onSuccess) {
  const overlay = document.getElementById("hire-overlay");
  document.getElementById("hire-info").textContent = `确认 ${candidateName} 入职「${jobTitle}」？`;
  overlay.classList.remove("hidden");
  document.getElementById("hire-cancel").onclick = () => overlay.classList.add("hidden");
  const confirmBtn = document.getElementById("hire-confirm");
  confirmBtn.onclick = () => withLoading(confirmBtn, async () => {
    await api.patch(`/api/pipeline/link/${linkId}/hire`, {});
    overlay.classList.add("hidden");
    showToast("已确认入职", "success");
    if (onSuccess) onSuccess();
  });
}

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
      const typeLabel = { resume_review: "简历筛选", interview: "面试", phone_screen: "电话初筛", offer: "Offer" };
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
      <div id="pt-history-${l.id}">${historyHTML}</div>
      <div id="pt-tail-${l.id}"></div>
      <div id="pt-next-${l.id}" style="margin-top:8px"></div>
      <div id="pt-notes-${l.id}" style="margin-top:4px">${notesHTML}</div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px">
        <button class="btn btn-secondary btn-sm pt-note-btn">+ 备注</button>
        <button type="button" class="btn btn-secondary btn-sm pt-transfer-btn">转移岗位</button>
        <button type="button" class="btn btn-secondary btn-sm pt-withdraw-btn" style="color:#dc2626;border-color:#fca5a5">候选人退出</button>
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
        // pending resume_review: show actor input + pass/reject buttons
        tailDiv.innerHTML = `
          <div class="iv-card activity-card" data-activity-id="${tail.id}">
            <div class="iv-card-header"><span class="iv-card-round">简历筛选</span></div>
            <div style="margin-top:8px">
              <label style="font-size:12px;color:#555">筛选人</label>
              <input class="rr-actor-input" placeholder="筛选人姓名" value="${tail.actor||""}" style="width:100%;padding:5px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:8px;box-sizing:border-box">
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary btn-sm rr-pass-btn">通过</button>
              <button class="btn btn-secondary btn-sm rr-reject-btn" style="color:#dc2626;border-color:#fca5a5">淘汰</button>
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
        actionDiv.style.cssText = "display:flex;gap:6px;margin-top:8px";
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

      // Offer已接受但未入职：显示"确认入职"按钮
      if (tail.type === "offer" && tail.conclusion === "接受") {
        nextDiv.innerHTML = `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 12px">
            <div style="font-size:13px;color:#166534;margin-bottom:8px">Offer 已接受，请确认入职：</div>
            <button class="btn btn-primary btn-sm" id="pt-confirm-hire-${l.id}">确认入职</button>
          </div>`;
        nextDiv.querySelector(`#pt-confirm-hire-${l.id}`).onclick = () => {
          openHireOverlay(l.id, l.candidate_name, l.job_title, () => {
            const idx = links.findIndex(lk => lk.id === l.id);
            if (idx !== -1) links.splice(idx, 1);
            renderContent();
          });
        };
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
          </div>
          <div id="pt-next-form-${l.id}"></div>
        </div>`;

      const formDiv = nextDiv.querySelector(`#pt-next-form-${l.id}`);
      // Auto-expand primary form
      showNextForm(primary.type, formDiv);

      // Secondary text link switches form
      nextDiv.querySelector(`#pt-alt-${l.id}`).onclick = (e) => {
        e.preventDefault();
        // Swap labels
        const altLink = nextDiv.querySelector(`#pt-alt-${l.id}`);
        const titleSpan = altLink.previousElementSibling;
        const curLabel = titleSpan.textContent;
        const curType = formDiv.dataset.currentType;
        titleSpan.textContent = altLink.textContent;
        altLink.textContent = curLabel;
        const newType = curType === primary.type ? secondary.type : primary.type;
        showNextForm(newType, formDiv);
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
          if (data.conclusion === "接受") {
            openHireOverlay(l.id, l.candidate_name, l.job_title, () => {
              const idx = links.findIndex(lk => lk.id === l.id);
              if (idx !== -1) links.splice(idx, 1);
              renderContent();
            });
            return;
          }
          showToast("Offer 已保存", "success");
          await refreshActivities();
        };
        formDiv.querySelector(".ivf-cancel").onclick = () => { formDiv.innerHTML = ""; };
      }
    }

    renderTail();
    renderNextStep();

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
      noteFormDiv.style.cssText = "margin-top:8px";
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
      const overlay = document.getElementById("link-job-overlay");
      const select = document.getElementById("link-job-select");
      document.querySelector("#link-job-overlay h2").textContent = "转移岗位";
      select.innerHTML = jobs.filter(j => j.id !== l.job_id).map(j => `<option value="${j.id}">${j.title} @${String(j.id).padStart(3,"0")}</option>`).join("");
      const keepBlock = document.getElementById("link-job-keep-records-block");
      if (keepBlock) keepBlock.style.display = "";
      document.querySelector('input[name="keep-records"][value="fresh"]').checked = true;
      overlay.classList.remove("hidden");
      document.getElementById("link-job-cancel").onclick = () => { overlay.classList.add("hidden"); if (keepBlock) keepBlock.style.display = "none"; };
      const confirmBtn = document.getElementById("link-job-confirm");
      confirmBtn.onclick = () => withLoading(confirmBtn, async () => {
        const newJobId = parseInt(select.value);
        if (!newJobId) return;
        const keepRecords = document.querySelector('input[name="keep-records"]:checked')?.value === "keep";
        overlay.classList.add("hidden");
        if (keepBlock) keepBlock.style.display = "none";
        await api.patch(`/api/pipeline/link/${l.id}/transfer`, { new_job_id: newJobId, keep_records: keepRecords });
        showToast("已转移岗位", "success");
        const freshLinks = await api.get("/api/pipeline/active");
        links.length = 0;
        links.push(...freshLinks);
        renderContent();
      });
    };
  }

  // ── render row ─────────────────────────────────────────────────────────────
  function renderRow(l, showJob) {
    const days = l.days_since_update !== null ? (l.days_since_update === 0 ? "今天" : `${l.days_since_update}天前`) : "-";
    const starTag = l.starred ? `<span style="color:#f59e0b;font-size:13px;margin-right:2px">★</span>` : "";
    const records = ivCache[l.id] || [];
    const progressHTML = renderProgressDots([], l.stage, records);
    const secondCell = showJob
      ? `<td>${progressHTML}</td>`
      : `<td><span style="color:#555;font-size:13px;margin-right:8px">${l.job_title || "-"}</span>${progressHTML}</td>`;
    return `<tr class="pt-row" data-link-id="${l.id}">
      <td style="width:28px;color:#aaa;font-size:11px;padding-right:0">▶</td>
      <td>${starTag}<a href="#/candidates/${l.candidate_id}" style="font-weight:600;color:#1a1a2e;text-decoration:none" onclick="event.stopPropagation()">${l.candidate_name || "-"}</a></td>
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
          arrow.style.color = "#aaa";
        } else {
          const l = links.find(lk => lk.id === linkId);
          if (!l) return;
          arrow.textContent = "▼";
          arrow.style.color = "#4f46e5";
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
    document.getElementById("pt-group-job").className = "btn btn-primary btn-sm";
    document.getElementById("pt-group-stage").className = "btn btn-secondary btn-sm";
    document.getElementById("pt-group-stage").style.cssText = "border-radius:6px;background:transparent;border:none";
    renderContent();
  };
  document.getElementById("pt-group-stage").onclick = () => {
    groupMode = "stage";
    document.getElementById("pt-group-stage").className = "btn btn-primary btn-sm";
    document.getElementById("pt-group-job").className = "btn btn-secondary btn-sm";
    document.getElementById("pt-group-job").style.cssText = "border-radius:6px;background:transparent;border:none";
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
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div id="tp-table"><span class="spinner" style="margin:24px"></span></div>
    </div>`;

  const followupColor = { "待跟进": "background:#fef9c3;color:#854d0e", "已联系": "background:#dcfce7;color:#166534", "暂不考虑": "background:#f3f4f6;color:#6b7280" };

  let starredOnly = _talentStarredOnly;

  const loadTalent = async () => {
    const q = document.getElementById("tp-search")?.value || "";
    const sourceVal = document.getElementById("tp-source")?.value || "";

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sourceVal && sourceVal !== "__none__") params.set("source", "");  // we filter client-side for supplier
    if (starredOnly) params.set("starred", "true");

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
            ${c.last_title ? `<div style="font-size:12px;color:#888">${c.last_title}${c.last_company ? " @ " + c.last_company : ""}</div>` : ""}
          </td>
          <td>${tags || "-"}</td>
          <td>${activeStage}</td>
          <td>${c.supplier_name || c.source || "-"}</td>
          <td>
            <div style="display:flex;gap:6px">
              <a href="#/candidates/${c.id}" class="btn btn-secondary btn-sm">详情</a>
              <button class="btn btn-primary btn-sm tp-recommend-btn" data-id="${c.id}">推荐到岗位</button>
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
        btn.style.color = newStarred ? "#f59e0b" : "#ccc";
        if (starredOnly && !newStarred) btn.closest("tr").remove();
      };
    });

    // 推荐到岗位
    tableEl.querySelectorAll(".tp-recommend-btn").forEach(btn => {
      btn.onclick = async () => {
        const jobs = await api.get("/api/jobs");
        const overlay = document.getElementById("link-job-overlay");
        const select = document.getElementById("link-job-select");
        select.innerHTML = jobs.map(j => `<option value="${j.id}">${j.title}</option>`).join("");
        const keepBlock = document.getElementById("link-job-keep-records-block");
        if (keepBlock) keepBlock.style.display = "none";
        overlay.classList.remove("hidden");
        document.getElementById("link-job-cancel").onclick = () => overlay.classList.add("hidden");
        const tpLinkConfirmBtn = document.getElementById("link-job-confirm");
        tpLinkConfirmBtn.onclick = () => withLoading(tpLinkConfirmBtn, async () => {
          const jobId = parseInt(select.value);
          try {
            await api.post("/api/pipeline/link", { candidate_id: parseInt(btn.dataset.id), job_id: jobId });
            overlay.classList.add("hidden");
            location.hash = `#/pipeline`;
          } catch (e) { /* toast already shown by api helper */ }
        });
      };
    });
  };

  loadTalent();

  let timer;
  document.getElementById("tp-search").oninput = () => { clearTimeout(timer); timer = setTimeout(loadTalent, 300); };
  document.getElementById("tp-source").onchange = loadTalent;
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

  content.innerHTML = pairs.map((pair, idx) => `
    <div class="dedup-pair" id="dedup-pair-${idx}" style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:16px">
      <div style="font-size:12px;color:#888;margin-bottom:10px">重复原因：${pair.reason}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${[pair.a, pair.b].map(c => `
          <label style="border:2px solid #e5e7eb;border-radius:8px;padding:12px;cursor:pointer;display:block">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <input type="radio" name="dedup-primary-${idx}" value="${c.id}" style="accent-color:#4f46e5">
              <span style="font-weight:600">${c.name || "-"}</span>
              <span style="font-size:12px;color:#888">${c.display_id}</span>
            </div>
            <div style="font-size:12px;color:#555;line-height:1.6">
              ${c.phone ? `📱 ${c.phone}<br>` : ""}
              ${c.email ? `✉️ ${c.email}<br>` : ""}
              ${c.last_title ? `💼 ${c.last_title}${c.last_company ? " @ " + c.last_company : ""}` : ""}
            </div>
          </label>`).join("")}
      </div>
      <div style="margin-top:12px;text-align:right">
        <button class="btn btn-primary btn-sm" onclick="mergeCandidate(${idx}, ${pair.a.id}, ${pair.b.id})">合并</button>
      </div>
    </div>`).join("");
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
      <thead><tr><th>职位名称</th><th>城市/部门/类型/属性</th><th>优先级</th><th>状态</th><th>候选人进展</th><th>操作</th></tr></thead>
      <tbody>${jobs.map(j => {
        const num = String(j.id).padStart(3, "0");
        const info = [j.city, j.department, j.job_category, j.employment_type].filter(Boolean).join(" · ");
        const total = Object.values(j.stage_counts || {}).reduce((a, b) => a + b, 0);
        const progress = total > 0 ? renderProgress(j.stage_counts) : "-";
        const priorityTag = j.priority ? `<span class="priority-tag ${priorityStyle[j.priority] || ""}">${j.priority}</span>` : "-";
        const statusLabel = j.status === "open" ? "招聘中" : j.status === "paused" ? "暂停" : "已关闭";
        const statusStyle = j.status === "open" ? "" : "background:#f0f0f0;color:#999";
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
          <td>
            <div style="display:flex;gap:6px">
              <a href="#/jobs/edit/${j.id}" class="btn btn-secondary btn-sm">编辑</a>
              ${j.status !== "closed"
                ? `<button class="btn btn-danger btn-sm close-job-btn" data-job-id="${j.id}" data-active-count="${j.active_count}">关闭</button>`
                : `<button class="btn btn-secondary btn-sm reopen-job-btn" data-job-id="${j.id}">重新打开</button>`}
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
          await api.patch(`/api/jobs/${jobId}`, { status: "closed" });
          loadJobs();
        } else {
          // 自定义弹窗
          const overlay = document.createElement("div");
          overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9999;display:flex;align-items:center;justify-content:center";
          overlay.innerHTML = `
            <div style="background:#fff;border-radius:12px;padding:28px;max-width:400px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.18)">
              <h3 style="margin:0 0 12px;font-size:16px">关闭岗位</h3>
              <p style="margin:0 0 20px;color:#555;font-size:14px">该岗位还有 <strong>${activeCount}</strong> 名候选人在流程中，请选择处理方式：</p>
              <div style="display:flex;flex-direction:column;gap:8px">
                <button id="bulk-reject-btn" class="btn btn-danger" style="width:100%">批量淘汰并关闭（此操作不可撤销）</button>
                <button id="close-only-btn" class="btn btn-secondary" style="width:100%">仅关闭岗位（保留流程记录）</button>
                <button id="cancel-close-btn" class="btn btn-secondary" style="width:100%;color:#888">取消</button>
              </div>
            </div>`;
          document.body.appendChild(overlay);
          overlay.querySelector("#bulk-reject-btn").onclick = async () => {
            document.body.removeChild(overlay);
            await api.patch(`/api/jobs/${jobId}`, { status: "closed", bulk_reject: true });
            loadJobs();
          };
          overlay.querySelector("#close-only-btn").onclick = async () => {
            document.body.removeChild(overlay);
            await api.patch(`/api/jobs/${jobId}`, { status: "closed" });
            loadJobs();
          };
          overlay.querySelector("#cancel-close-btn").onclick = () => document.body.removeChild(overlay);
        }
      };
    });

    tableEl.querySelectorAll(".reopen-job-btn").forEach(btn => {
      btn.onclick = async () => {
        await api.patch(`/api/jobs/${btn.dataset.jobId}`, { status: "open" });
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
async function renderJobForm(el, id) {
  let job = { title: "", department: "", jd: "", persona: "", status: "open", hr_owner: "", city: "", job_category: "", employment_type: "", priority: "" };
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
        b.style.color = "#888";
        b.style.borderBottomColor = "transparent";
        b.style.fontWeight = "400";
      });
      btn.classList.add("active");
      btn.style.color = "#1a1a2e";
      btn.style.borderBottomColor = "#1a1a2e";
      btn.style.fontWeight = "600";
      el.querySelectorAll(".jd-tab-panel").forEach(p => p.style.display = p.dataset.tab === btn.dataset.tab ? "" : "none");

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

      <!-- 岗位汇总 -->
      <div class="card" style="overflow:auto">
        <h2 style="margin-bottom:16px">岗位汇总</h2>
        ${jobStats.length ? `<table class="table" style="margin:0">
          <thead><tr><th>岗位</th><th>总投递</th><th>进行中</th><th>已淘汰</th></tr></thead>
          <tbody>${jobStats.sort((a,b) => b.total - a.total).map(j => `
            <tr>
              <td style="font-size:13px">${j.title}</td>
              <td style="text-align:center">${j.total}</td>
              <td style="text-align:center;color:#166534">${j.active}</td>
              <td style="text-align:center;color:#dc2626">${j.rejected}</td>
            </tr>`).join("")}
          </tbody>
        </table>` : '<div class="empty-state">暂无岗位数据</div>'}
      </div>

    </div>`;
}
