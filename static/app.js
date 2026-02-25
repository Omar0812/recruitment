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

// ── Form validation ───────────────────────────────────────────────────────────
function validateCandidateForm({ phone, email, age, years_exp }) {
  if (phone && !/^\d{11}$/.test(phone)) { showToast("手机号格式不正确（需11位数字）", "error"); return false; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast("邮箱格式不正确", "error"); return false; }
  if (age !== null && age !== undefined && age !== "" && (isNaN(age) || age < 1 || age > 100)) { showToast("年龄请填写 1-100 之间的数字", "error"); return false; }
  if (years_exp !== null && years_exp !== undefined && years_exp !== "" && (isNaN(years_exp) || years_exp < 0 || years_exp > 50)) { showToast("工作年限请填写 0-50 之间的数字", "error"); return false; }
  return true;
}

// ── Router ────────────────────────────────────────────────────────────────────
function router() {
  const hash = location.hash || "#/";
  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("active", hash.startsWith("#/" + el.dataset.page) || (hash === "#/" && el.dataset.page === "dashboard"));
  });
  const content = document.getElementById("page-content");
  if (hash === "#/" || hash === "#/dashboard") return renderDashboard(content);
  if (hash === "#/candidates" || hash === "#/pipeline") return renderPipelineTracking(content);
  if (hash.startsWith("#/candidates/")) return renderCandidateProfile(content, hash.split("/")[2]);
  if (hash === "#/talent") return renderTalentPool(content);
  if (hash === "#/analytics") return renderAnalytics(content);
  if (hash === "#/jobs") return renderJobList(content);
  if (hash.startsWith("#/jobs/pipeline/")) return renderPipeline(content, hash.split("/")[3]);
  if (hash.startsWith("#/jobs/edit/")) return renderJobForm(content, hash.split("/")[3]);
  if (/^#\/jobs\/\d+$/.test(hash)) return renderJobDetail(content, hash.split("/")[2]);
  if (hash === "#/jobs/new") return renderJobForm(content, null);
  content.innerHTML = '<div class="empty-state">页面不存在</div>';
}

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", async () => {
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
  body.innerHTML = '<span class="spinner"></span> 解析中...';
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
      <div class="form-group"><label>来源渠道</label><input id="f-source" placeholder="如：Boss直聘、内推..."></div>
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

  // 查重：更新已有档案
  body.querySelectorAll(".dup-update-btn").forEach(btn => {
    btn.onclick = async () => {
      const existingId = btn.dataset.id;
      const patch = {};
      const name = document.getElementById("f-name").value.trim();
      const nameEn = document.getElementById("f-name-en").value.trim();
      if (name) patch.name = name;
      if (nameEn) patch.name_en = nameEn;
      const simpleFields = { phone: "f-phone", email: "f-email", city: "f-city", source: "f-source" };
      for (const [key, elId] of Object.entries(simpleFields)) {
        const val = document.getElementById(elId)?.value.trim();
        if (val) patch[key] = val;
      }
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
      location.hash = `#/candidates/${existingId}`;
    };
  });

  const ignoreBtn = document.getElementById("dup-ignore-btn");
  if (ignoreBtn) ignoreBtn.onclick = () => document.getElementById("dup-banner")?.remove();

  const modalSaveBtn = document.getElementById("modal-save");
  document.getElementById("modal-cancel").onclick = () => overlay.classList.add("hidden");
  modalSaveBtn.onclick = () => withLoading(modalSaveBtn, async () => {
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
      source: document.getElementById("f-source").value.trim() || null,
      notes: document.getElementById("f-notes").value.trim() || null,
      resume_path: document.getElementById("resume-path").value || null,
      education_list: eduList,
      work_experience: workList,
    });

    const jobId = document.getElementById("f-job").value;
    if (jobId) {
      await api.post("/api/pipeline/link", { candidate_id: candidate.id, job_id: parseInt(jobId) });
    }

    overlay.classList.add("hidden");
    location.hash = `#/candidates/${candidate.id}`;
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
          ${c.resume_path ? `<a href="/resumes/${encodeURIComponent(c.resume_path.split('/').slice(-2).join('/'))}" target="_blank" class="btn btn-secondary btn-sm">下载简历</a>` : ""}
          <button class="btn btn-secondary btn-sm" id="edit-info-btn">编辑信息</button>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;color:#666">跟进状态</span>
        <select id="profile-followup" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;background:#fff">
          <option value="" ${!c.followup_status ? "selected" : ""}>未设置</option>
          <option value="待跟进" ${c.followup_status === "待跟进" ? "selected" : ""}>待跟进</option>
          <option value="已联系" ${c.followup_status === "已联系" ? "selected" : ""}>已联系</option>
          <option value="暂不考虑" ${c.followup_status === "暂不考虑" ? "selected" : ""}>暂不考虑</option>
        </select>
      </div>
    </div>

    <div style="display:flex;gap:0;border-bottom:2px solid #e5e7eb;margin-bottom:16px">
      <button class="profile-tab-btn active" data-tab="resume" style="padding:8px 20px;border:none;background:none;cursor:pointer;font-size:14px;font-weight:600;color:#1a1a2e;border-bottom:2px solid #1a1a2e;margin-bottom:-2px">过往背景</button>
      ${c.resume_path ? `<button class="profile-tab-btn" data-tab="preview" style="padding:8px 20px;border:none;background:none;cursor:pointer;font-size:14px;color:#888;border-bottom:2px solid transparent;margin-bottom:-2px">简历预览</button>` : ""}
      <button class="profile-tab-btn" data-tab="pipeline" style="padding:8px 20px;border:none;background:none;cursor:pointer;font-size:14px;color:#888;border-bottom:2px solid transparent;margin-bottom:-2px">投递记录</button>
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

    <!-- 投递记录 tab -->
    <div class="profile-tab-panel" data-tab="pipeline" style="display:none">
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:12px 16px;display:flex;justify-content:flex-end">
          <button class="btn btn-primary btn-sm" id="link-job-btn">+ 新增投递</button>
        </div>
        ${(c.job_links||[]).length ? `<table class="table" style="margin:0">
          <thead><tr><th></th><th>岗位</th><th>阶段</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
          <tbody id="job-links-tbody">
            ${c.job_links.map(lnk => {
              const isActive = !lnk.outcome;
              const statusLabel = lnk.outcome === "rejected" ? "淘汰" : lnk.outcome === "withdrawn" ? "已退出" : "进行中";
              const statusStyle = lnk.outcome === "rejected" ? "background:#fee2e2;color:#dc2626" : lnk.outcome === "withdrawn" ? "background:#f3f4f6;color:#6b7280" : "background:#dcfce7;color:#166534";
              return `<tr data-link-id="${lnk.id}" data-job-id="${lnk.job_id}">
                <td style="width:28px;padding:8px 4px 8px 12px">
                  <button class="iv-expand-btn" data-link-id="${lnk.id}" style="background:none;border:none;cursor:pointer;font-size:12px;color:#888;padding:2px 4px" title="查看面试记录">▶</button>
                </td>
                <td><a href="#/jobs/pipeline/${lnk.job_id}" style="font-weight:600;color:#1a1a2e;text-decoration:none">${lnk.job_title||"未知岗位"}</a></td>
                <td><span class="tag" style="font-size:11px">${lnk.stage||"-"}</span></td>
                <td><span class="tag" style="${statusStyle}">${statusLabel}</span></td>
                <td style="font-size:12px;color:#999">${formatTime(lnk.created_at)}</td>
                <td>
                  ${isActive ? `<div style="display:flex;gap:4px">
                    <button class="btn btn-secondary btn-sm transfer-btn" data-link-id="${lnk.id}">转移岗位</button>
                    <button class="btn btn-danger btn-sm reject-link-btn" data-link-id="${lnk.id}">淘汰</button>
                  </div>` : ""}
                </td>
              </tr>
              <tr class="iv-detail-row hidden" id="iv-detail-${lnk.id}">
                <td colspan="6" style="padding:0 12px 12px 40px;background:#fafafa">
                  <div id="iv-detail-content-${lnk.id}" style="font-size:13px;color:#555"></div>
                </td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>` : '<div class="empty-state" style="padding:24px">暂无投递记录</div>'}
      </div>
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
    alert("备注已保存");
  };

  document.getElementById("profile-followup").onchange = async (e) => {
    await api.patch(`/api/candidates/${id}`, { followup_status: e.target.value || null });
  };

  document.getElementById("edit-info-btn").onclick = () => {
    const overlay = document.getElementById("modal-overlay");
    const body = document.getElementById("modal-body");
    document.querySelector("#modal-overlay h2").textContent = "编辑候选人信息";
    body.innerHTML = `
      <div class="form-grid">
        <div class="form-group"><label>姓名</label><input id="e-name" value="${c.name || ""}"></div>
        <div class="form-group"><label>英文名</label><input id="e-name-en" value="${c.name_en || ""}"></div>
        <div class="form-group"><label>手机</label><input id="e-phone" value="${c.phone || ""}"></div>
        <div class="form-group"><label>邮箱</label><input id="e-email" value="${c.email || ""}"></div>
        <div class="form-group"><label>年龄</label><input id="e-age" type="number" value="${c.age || ""}"></div>
        <div class="form-group"><label>工作年限</label><input id="e-years-exp" type="number" step="0.5" value="${c.years_exp || ""}"></div>
        <div class="form-group"><label>来源渠道</label><input id="e-source" value="${c.source || ""}"></div>
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
        source: document.getElementById("e-source").value || null,
        city: document.getElementById("e-city").value || null,
        education_list: eduList,
        work_experience: workList,
      });
      overlay.classList.add("hidden");
      renderCandidateProfile(el, id);
    });
  };

  // 投递记录展开面试记录（懒加载）
  const ivCache = {};
  document.querySelectorAll(".iv-expand-btn").forEach(btn => {
    btn.onclick = async () => {
      const linkId = btn.dataset.linkId;
      const detailRow = document.getElementById(`iv-detail-${linkId}`);
      const contentEl = document.getElementById(`iv-detail-content-${linkId}`);
      const isHidden = detailRow.classList.toggle("hidden");
      btn.textContent = isHidden ? "▶" : "▼";
      if (!isHidden && !ivCache[linkId]) {
        contentEl.innerHTML = '<span class="spinner"></span>';
        const records = await api.get(`/api/interviews?link_id=${linkId}`);
        ivCache[linkId] = records;
        if (!records.length) {
          contentEl.innerHTML = '<div style="padding:8px 0;color:#bbb">暂无面试记录</div>';
        } else {
          const scored = records.filter(r => r.score);
          const avgScore = scored.length ? (scored.reduce((s, r) => s + r.score, 0) / scored.length).toFixed(1) : null;
          const avgHtml = avgScore ? `
            <div style="margin-top:10px;padding:8px 0;border-top:1px solid #eee;font-size:13px;color:#555">
              综合评分：${"★".repeat(Math.round(avgScore))}<span style="color:#ddd">${"★".repeat(5-Math.round(avgScore))}</span>
              <span style="margin-left:6px;font-weight:600">${avgScore}</span>
              <span style="color:#999;font-size:12px">（${scored.length}条记录）</span>
            </div>` : "";
          contentEl.innerHTML = `<table style="width:100%;border-collapse:collapse;margin-top:6px">
            <thead><tr style="font-size:12px;color:#999;border-bottom:1px solid #eee">
              <th style="padding:4px 8px;font-weight:500;text-align:left">轮次</th>
              <th style="padding:4px 8px;font-weight:500;text-align:left">面试官</th>
              <th style="padding:4px 8px;font-weight:500;text-align:left">时间</th>
              <th style="padding:4px 8px;font-weight:500;text-align:left">评分</th>
              <th style="padding:4px 8px;font-weight:500;text-align:left">结论</th>
              <th style="padding:4px 8px;font-weight:500;text-align:left">评语</th>
            </tr></thead>
            <tbody>${records.map(r => `<tr style="font-size:13px;border-bottom:1px solid #f5f5f5">
              <td style="padding:6px 8px">${r.round||"-"}</td>
              <td style="padding:6px 8px;color:#555">${r.interviewer||"-"}</td>
              <td style="padding:6px 8px;color:#888;font-size:12px">${r.interview_time ? formatTime(r.interview_time) : "-"}</td>
              <td style="padding:6px 8px">${r.score ? "★".repeat(r.score) + '<span style="color:#ddd">' + "★".repeat(5-r.score) + "</span>" : "-"}</td>
              <td style="padding:6px 8px">${r.conclusion ? `<span class="tag" style="font-size:11px;${r.conclusion==="通过"?"background:#dcfce7;color:#166534":r.conclusion==="淘汰"?"background:#fee2e2;color:#dc2626":"background:#fef9c3;color:#854d0e"}">${r.conclusion}</span>` : "-"}</td>
              <td style="padding:6px 8px;color:#666;font-size:12px">${r.comment||"-"}</td>
            </tr>`).join("")}</tbody>
          </table>${avgHtml}`;
        }
      } else if (!isHidden && ivCache[linkId]) {
        // 已缓存，直接显示（内容已在 DOM 中）
      }
    };
  });

  // 新增投递
  document.getElementById("link-job-btn").onclick = async () => {
    const jobs = await api.get("/api/jobs");
    const overlay = document.getElementById("link-job-overlay");
    const select = document.getElementById("link-job-select");
    document.querySelector("#link-job-overlay h2").textContent = "新增投递";
    select.innerHTML = jobs.map(j => `<option value="${j.id}">${j.title} @${String(j.id).padStart(3,"0")}</option>`).join("");
    overlay.classList.remove("hidden");
    document.getElementById("link-job-cancel").onclick = () => overlay.classList.add("hidden");
    const linkJobConfirmBtn = document.getElementById("link-job-confirm");
    linkJobConfirmBtn.onclick = () => withLoading(linkJobConfirmBtn, async () => {
      const jobId = parseInt(select.value);
      if (!jobId) return;
      try {
        await api.post("/api/pipeline/link", { candidate_id: parseInt(id), job_id: jobId });
        overlay.classList.add("hidden");
        renderCandidateProfile(el, id);
      } catch (e) { /* toast already shown by api helper */ }
    });
  };

  // 转移岗位
  document.querySelectorAll(".transfer-btn").forEach(btn => {
    btn.onclick = async () => {
      const linkId = btn.dataset.linkId;
      const jobs = await api.get("/api/jobs");
      const overlay = document.getElementById("link-job-overlay");
      const select = document.getElementById("link-job-select");
      document.querySelector("#link-job-overlay h2").textContent = "转移岗位";
      select.innerHTML = jobs.map(j => `<option value="${j.id}">${j.title} @${String(j.id).padStart(3,"0")}</option>`).join("");
      overlay.classList.remove("hidden");
      document.getElementById("link-job-cancel").onclick = () => overlay.classList.add("hidden");
      const transferConfirmBtn = document.getElementById("link-job-confirm");
      transferConfirmBtn.onclick = () => withLoading(transferConfirmBtn, async () => {
        const newJobId = parseInt(select.value);
        if (!newJobId) return;
        overlay.classList.add("hidden");
        await api.patch(`/api/pipeline/link/${linkId}/outcome`, { outcome: "withdrawn" });
        await api.post("/api/pipeline/link", { candidate_id: parseInt(id), job_id: newJobId });
        renderCandidateProfile(el, id);
      });
    };
  });

  // 投递记录淘汰
  document.querySelectorAll(".reject-link-btn").forEach(btn => {
    btn.onclick = () => {
      const linkId = btn.dataset.linkId;
      const rejectOverlay = document.getElementById("reject-overlay");
      rejectOverlay.classList.remove("hidden");
      document.getElementById("reject-cancel").onclick = () => rejectOverlay.classList.add("hidden");
      const rejectConfirmBtn = document.getElementById("reject-confirm");
      rejectConfirmBtn.onclick = () => withLoading(rejectConfirmBtn, async () => {
        const reason = document.getElementById("reject-reason-select").value;
        rejectOverlay.classList.add("hidden");
        await api.patch(`/api/pipeline/link/${linkId}/outcome`, { outcome: "rejected", rejection_reason: reason });
        renderCandidateProfile(el, id);
      });
    };
  });
}

// ── Pipeline Tracking ─────────────────────────────────────────────────────────
async function renderPipelineTracking(el) {
  el.innerHTML = `
    <div class="page-header"><h1>流程跟进</h1></div>
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

  let groupMode = "job"; // "job" | "stage"

  const bindRejectBtn = (btn) => {
    btn.onclick = () => {
      const linkId = btn.dataset.linkId;
      const rejectOverlay = document.getElementById("reject-overlay");
      document.getElementById("reject-reason-select").value = "";
      rejectOverlay.classList.remove("hidden");
      document.getElementById("reject-cancel").onclick = () => rejectOverlay.classList.add("hidden");
      const confirmBtn = document.getElementById("reject-confirm");
      confirmBtn.onclick = () => withLoading(confirmBtn, async () => {
        const reason = document.getElementById("reject-reason-select").value;
        rejectOverlay.classList.add("hidden");
        await api.patch(`/api/pipeline/link/${linkId}/outcome`, { outcome: "rejected", rejection_reason: reason });
        if (confirm("是否补填面试记录？")) {
          const ivOverlay = document.getElementById("interview-overlay");
          ivOverlay.classList.remove("hidden");
          document.getElementById("iv-cancel").onclick = () => { ivOverlay.classList.add("hidden"); renderContent(); };
          const ivBtn = document.getElementById("iv-confirm");
          ivBtn.onclick = () => withLoading(ivBtn, async () => {
            await api.post(`/api/interviews`, {
              link_id: parseInt(linkId),
              round: document.getElementById("iv-round").value,
              interviewer: document.getElementById("iv-interviewer").value || null,
              interview_time: document.getElementById("iv-time").value || null,
              score: parseInt(document.getElementById("iv-score").value) || null,
              comment: document.getElementById("iv-comment").value || null,
              conclusion: "淘汰",
            });
            ivOverlay.classList.add("hidden");
            renderContent();
          });
        } else {
          renderContent();
        }
      });
    };
  };

  function renderRow(l, showJob) {
    const days = l.days_since_update !== null ? (l.days_since_update === 0 ? "今天" : `${l.days_since_update}天前`) : "-";
    const stages = l.job_stages || [];
    const stageCell = showJob
      ? `<td><select class="pt-stage-select" data-link-id="${l.id}" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px;background:#fff">
          ${stages.map(s => `<option value="${s}" ${s === l.stage ? "selected" : ""}>${s}</option>`).join("")}
         </select></td>`
      : `<td style="color:#555;font-size:13px">${l.job_title || "-"}</td>`;
    return `<tr data-link-id="${l.id}">
      <td><a href="#/candidates/${l.candidate_id}" style="font-weight:600;color:#1a1a2e;text-decoration:none">${l.candidate_name || "-"}</a></td>
      ${stageCell}
      <td style="color:#888;font-size:13px">${days}</td>
      <td><div style="display:flex;gap:4px">
        <button class="btn btn-secondary btn-sm pt-iv-btn" data-link-id="${l.id}">填面评</button>
        <button class="btn btn-danger btn-sm pt-reject-btn" data-link-id="${l.id}">淘汰</button>
      </div></td>
    </tr>`;
  }

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
          <thead><tr><th>候选人</th><th>${secondColLabel}</th><th>最后更新</th><th>操作</th></tr></thead>
          <tbody>${items.map(l => renderRow(l, secondColLabel === "阶段")).join("")}</tbody>
        </table>
      </div>`).join("");
    contentEl.querySelectorAll(".pt-reject-btn").forEach(bindRejectBtn);
    contentEl.querySelectorAll(".pt-stage-select").forEach(sel => {
      sel.onchange = async () => {
        await api.patch(`/api/pipeline/link/${sel.dataset.linkId}/stage`, { stage: sel.value });
        showToast("阶段已更新", "success");
        const link = links.find(l => l.id === parseInt(sel.dataset.linkId));
        if (link) link.stage = sel.value;
      };
    });
    contentEl.querySelectorAll(".pt-iv-btn").forEach(btn => {
      btn.onclick = () => {
        const linkId = btn.dataset.linkId;
        const ivOverlay = document.getElementById("interview-overlay");
        document.getElementById("iv-round").value = "";
        document.getElementById("iv-interviewer").value = "";
        document.getElementById("iv-time").value = "";
        document.getElementById("iv-score").value = "";
        document.getElementById("iv-conclusion").value = "";
        document.getElementById("iv-comment").value = "";
        ivOverlay.classList.remove("hidden");
        document.getElementById("iv-cancel").onclick = () => ivOverlay.classList.add("hidden");
        const ivBtn = document.getElementById("iv-confirm");
        ivBtn.onclick = () => withLoading(ivBtn, async () => {
          await api.post(`/api/interviews`, {
            link_id: parseInt(linkId),
            round: document.getElementById("iv-round").value || null,
            interviewer: document.getElementById("iv-interviewer").value || null,
            interview_time: document.getElementById("iv-time").value || null,
            score: parseInt(document.getElementById("iv-score").value) || null,
            comment: document.getElementById("iv-comment").value || null,
            conclusion: document.getElementById("iv-conclusion").value || null,
          });
          ivOverlay.classList.add("hidden");
          showToast("面试记录已保存", "success");
        });
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
}

// ── Talent Pool ───────────────────────────────────────────────────────────────
async function renderTalentPool(el) {
  el.innerHTML = `
    <div class="page-header">
      <h1>人才库</h1>
    </div>
    <div class="filter-bar" style="margin-bottom:16px">
      <input id="tp-search" type="text" placeholder="搜索姓名、手机、邮箱..." style="flex:1;min-width:200px;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;outline:none">
      <select id="tp-followup" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;background:#fff">
        <option value="">全部跟进状态</option>
        <option value="待跟进">待跟进</option>
        <option value="已联系">已联系</option>
        <option value="暂不考虑">暂不考虑</option>
      </select>
      <select id="tp-source" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;background:#fff">
        <option value="">全部来源</option>
      </select>
      <button class="btn btn-secondary" onclick="openDedupPanel()">查重</button>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div id="tp-table"><span class="spinner" style="margin:24px"></span></div>
    </div>`;

  const followupColor = { "待跟进": "background:#fef9c3;color:#854d0e", "已联系": "background:#dcfce7;color:#166534", "暂不考虑": "background:#f3f4f6;color:#6b7280" };

  const loadTalent = async () => {
    const q = document.getElementById("tp-search")?.value || "";
    const followup = document.getElementById("tp-followup")?.value || "";
    const source = document.getElementById("tp-source")?.value || "";

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (followup) params.set("followup_status", followup);
    if (source) params.set("source", source);

    const candidates = await api.get(`/api/candidates${params.toString() ? "?" + params.toString() : ""}`);
    const tableEl = document.getElementById("tp-table");
    if (!tableEl) return;

    // 动态填充来源下拉（仅首次）
    const sourceSelect = document.getElementById("tp-source");
    if (sourceSelect && sourceSelect.options.length <= 1) {
      [...new Set(candidates.map(c => c.source).filter(Boolean))].forEach(s => {
        const opt = document.createElement("option");
        opt.value = s; opt.textContent = s;
        sourceSelect.appendChild(opt);
      });
    }

    if (!candidates.length) {
      tableEl.innerHTML = '<div class="empty-state">暂无候选人</div>';
      return;
    }

    tableEl.innerHTML = `<table class="table">
      <thead><tr><th>姓名</th><th>技能标签</th><th>跟进状态</th><th>当前岗位·阶段</th><th>来源</th><th>操作</th></tr></thead>
      <tbody>${candidates.map(c => {
        const tags = (c.skill_tags || []).slice(0, 3).map(t => `<span class="tag">${t}</span>`).join(" ");
        const fs = c.followup_status;
        const fsTag = fs ? `<span class="tag" style="${followupColor[fs] || ""}">${fs}</span>` : "-";
        const activeLinks = c.active_links || [];
        const activeStage = activeLinks.length
          ? activeLinks.map(l => `<div style="font-size:12px;color:#555">${l.job_title || ""}${l.stage ? " · " + l.stage : ""}</div>`).join("")
          : "-";
        return `<tr>
          <td><a href="#/candidates/${c.id}" style="font-weight:600;color:#1a1a2e;text-decoration:none">${c.name}</a>
            ${c.last_title ? `<div style="font-size:12px;color:#888">${c.last_title}${c.last_company ? " @ " + c.last_company : ""}</div>` : ""}
          </td>
          <td>${tags || "-"}</td>
          <td>
            <select class="tp-followup-select" data-id="${c.id}" style="font-size:12px;padding:3px 6px;border:1px solid #ddd;border-radius:6px;background:#f9f9f9">
              <option value="" ${!fs ? "selected" : ""}>未设置</option>
              <option value="待跟进" ${fs === "待跟进" ? "selected" : ""}>待跟进</option>
              <option value="已联系" ${fs === "已联系" ? "selected" : ""}>已联系</option>
              <option value="暂不考虑" ${fs === "暂不考虑" ? "selected" : ""}>暂不考虑</option>
            </select>
          </td>
          <td>${activeStage}</td>
          <td>${c.source || "-"}</td>
          <td>
            <div style="display:flex;gap:6px">
              <a href="#/candidates/${c.id}" class="btn btn-secondary btn-sm">详情</a>
              <button class="btn btn-primary btn-sm tp-recommend-btn" data-id="${c.id}">推荐到岗位</button>
            </div>
          </td>
        </tr>`;
      }).join("")}
      </tbody></table>`;

    // 跟进状态内联修改
    tableEl.querySelectorAll(".tp-followup-select").forEach(sel => {
      sel.onchange = async () => {
        await api.patch(`/api/candidates/${sel.dataset.id}`, { followup_status: sel.value || null });
      };
    });

    // 推荐到岗位
    tableEl.querySelectorAll(".tp-recommend-btn").forEach(btn => {
      btn.onclick = async () => {
        const jobs = await api.get("/api/jobs");
        const overlay = document.getElementById("link-job-overlay");
        const select = document.getElementById("link-job-select");
        select.innerHTML = jobs.map(j => `<option value="${j.id}">${j.title}</option>`).join("");
        overlay.classList.remove("hidden");
        document.getElementById("link-job-cancel").onclick = () => overlay.classList.add("hidden");
        const tpLinkConfirmBtn = document.getElementById("link-job-confirm");
        tpLinkConfirmBtn.onclick = () => withLoading(tpLinkConfirmBtn, async () => {
          const jobId = parseInt(select.value);
          try {
            await api.post("/api/pipeline/link", { candidate_id: parseInt(btn.dataset.id), job_id: jobId });
            overlay.classList.add("hidden");
            location.hash = `#/jobs/pipeline/${jobId}`;
          } catch (e) { /* toast already shown by api helper */ }
        });
      };
    });
  };

  loadTalent();

  let timer;
  document.getElementById("tp-search").oninput = () => { clearTimeout(timer); timer = setTimeout(loadTalent, 300); };
  document.getElementById("tp-followup").onchange = loadTalent;
  document.getElementById("tp-source").onchange = loadTalent;
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

  function renderProgress(stageCounts, stages) {
    const buckets = { "📄": 0, "🎯": 0, "🎁": 0 };
    const stageList = stages || [];
    for (const [stage, count] of Object.entries(stageCounts || {})) {
      const emoji = stageEmoji(stage) || (stageList.indexOf(stage) < stageList.length / 2 ? "📄" : "🎯");
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
        const progress = total > 0 ? renderProgress(j.stage_counts, j.stages) : "-";
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
  let job = { title: "", department: "", jd: "", persona: "", status: "open", hr_owner: "", stages: ["简历筛选", "电话初筛", "面试", "Offer", "已入职"], city: "", job_category: "", employment_type: "", priority: "" };
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
        <div class="form-group form-full">
          <label>招聘流程阶段（每行一个）</label>
          <textarea id="j-stages" style="min-height:100px">${(job.stages || []).join("\n")}</textarea>
        </div>
      </div>
      <div style="margin-top:20px;display:flex;gap:12px">
        <button class="btn btn-primary" id="save-job">保存</button>
        <button class="btn btn-secondary" onclick="history.back()">取消</button>
      </div>
    </div>`;

  document.getElementById("save-job").onclick = async () => {
    const title = document.getElementById("j-title").value.trim();
    if (!title) { alert("职位名称不能为空"); return; }
    const stages = document.getElementById("j-stages").value.split("\n").map(s => s.trim()).filter(Boolean);
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
      stages,
    };
    if (id) {
      await api.patch(`/api/jobs/${id}`, data);
    } else {
      await api.post("/api/jobs", data);
    }
    location.hash = "#/jobs";
  };
}

// ── Pipeline Kanban ───────────────────────────────────────────────────────────
async function loadInterviewList(linkId) {
  const listEl = document.getElementById(`iv-list-${linkId}`);
  if (!listEl) return;
  const records = await api.get(`/api/interviews?link_id=${linkId}`);
  if (!records.length) {
    listEl.innerHTML = '<div style="color:#aaa;padding:4px 0">暂无面试记录</div>';
    return;
  }
  const conclusionColor = { "通过": "#16a34a", "淘汰": "#dc2626", "待定": "#d97706" };
  listEl.innerHTML = records.map(r => `
    <div style="border:1px solid #eee;border-radius:6px;padding:6px 8px;margin-bottom:6px;background:#fafafa">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:600">${r.round || "面试"}${r.interviewer ? " · " + r.interviewer : ""}</span>
        <span style="display:flex;gap:6px;align-items:center">
          ${r.conclusion ? `<span style="color:${conclusionColor[r.conclusion] || "#555"};font-size:12px">${r.conclusion}</span>` : ""}
          ${r.score ? `<span style="color:#f59e0b">★${r.score}</span>` : ""}
          <button class="btn btn-danger btn-sm del-interview-btn" data-id="${r.id}" data-link-id="${linkId}" style="padding:1px 6px;font-size:11px">删</button>
        </span>
      </div>
      ${r.interview_time ? `<div style="color:#888;font-size:12px;margin-top:2px">${r.interview_time.replace("T", " ")}</div>` : ""}
      ${r.comment ? `<div style="margin-top:4px;color:#555">${r.comment}</div>` : ""}
    </div>`).join("");

  listEl.querySelectorAll(".del-interview-btn").forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("确认删除该面试记录？")) return;
      await fetch(`/api/interviews/${btn.dataset.id}`, { method: "DELETE" });
      await loadInterviewList(btn.dataset.linkId);
    };
  });
}

// ── Job Detail (read-only) ─────────────────────────────────────────────────────
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
                  ${active.map(l => `<a href="#/candidates/${l.candidate_id}" style="font-size:13px;color:#1a1a2e;text-decoration:none;padding:4px 10px;background:#f3f4f6;border-radius:6px">${l.candidate_name}</a>`).join("")}
                </div>
              </div>`;
          }).join("") || '<div class="empty-state" style="padding:32px">暂无活跃候选人</div>';
        }
      }
    };
  });
}

async function renderPipeline(el, jobId) {
  el.innerHTML = '<span class="spinner"></span>';
  const [job, pipeline] = await Promise.all([
    api.get(`/api/jobs/${jobId}`),
    api.get(`/api/pipeline/jobs/${jobId}/pipeline`),
  ]);

  el.innerHTML = `
    <div class="page-header">
      <button class="btn btn-secondary btn-sm" onclick="history.back()">← 返回</button>
      <h1>${job.title}</h1>
    </div>
    <div class="kanban" id="kanban-board">
      ${pipeline.stages.map(stage => {
        const allCards = pipeline.pipeline[stage] || [];
        const activeCards = allCards.filter(l => !l.outcome);
        const inactiveCards = allCards.filter(l => l.outcome);
        const inactiveCount = inactiveCards.length;
        return `
        <div class="kanban-col" data-stage="${stage}">
          <div class="kanban-col-header">
            <span>${stage}</span>
            <span class="kanban-count">${activeCards.length}</span>
          </div>
          <div class="kanban-cards">
            ${activeCards.map(lnk => renderCard(lnk, pipeline.stages)).join("")}
          </div>
          ${inactiveCount > 0 ? `
          <div class="kanban-inactive-cards hidden" id="inactive-${stage.replace(/\s/g,'_')}">
            ${inactiveCards.map(lnk => renderCard(lnk, pipeline.stages)).join("")}
          </div>
          <button class="kanban-toggle-inactive btn btn-secondary btn-sm" data-stage="${stage.replace(/\s/g,'_')}" style="margin:6px 8px;font-size:11px;width:calc(100% - 16px)">显示已淘汰 (${inactiveCount})</button>
          ` : ""}
        </div>`;
      }).join("")}
    </div>`;

  el.querySelectorAll(".move-stage-select").forEach(sel => {
    sel.onchange = async (e) => {
      e.stopPropagation();
      const linkId = sel.dataset.linkId;
      const stage = sel.value;
      await api.patch(`/api/pipeline/link/${linkId}/stage`, { stage });
      renderPipeline(el, jobId);
    };
  });

  el.querySelectorAll(".reject-btn").forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const overlay = document.getElementById("reject-overlay");
      const sel = document.getElementById("reject-reason-select");
      sel.value = "";
      overlay.classList.remove("hidden");

      document.getElementById("reject-cancel").onclick = () => overlay.classList.add("hidden");
      const kanbanRejectConfirmBtn = document.getElementById("reject-confirm");
      kanbanRejectConfirmBtn.onclick = () => withLoading(kanbanRejectConfirmBtn, async () => {
        if (!sel.value) { showToast("请选择淘汰原因", "error"); return; }
        overlay.classList.add("hidden");
        await api.patch(`/api/pipeline/link/${btn.dataset.linkId}/outcome`, { outcome: "rejected", rejection_reason: sel.value });
        renderPipeline(el, jobId);
      });
    };
  });

  // 面试记录展开/收起
  el.querySelectorAll(".interview-toggle-btn").forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const linkId = btn.dataset.linkId;
      const panel = document.getElementById(`iv-panel-${linkId}`);
      const isHidden = panel.classList.toggle("hidden");
      if (!isHidden) {
        await loadInterviewList(linkId);
      }
    };
  });

  // 新增面试记录
  el.querySelectorAll(".add-interview-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const linkId = btn.dataset.linkId;
      const overlay = document.getElementById("interview-overlay");
      document.getElementById("iv-round").value = "一面";
      document.getElementById("iv-interviewer").value = "";
      document.getElementById("iv-time").value = "";
      document.getElementById("iv-score").value = "";
      document.getElementById("iv-comment").value = "";
      document.getElementById("iv-conclusion").value = "";
      overlay.classList.remove("hidden");

      document.getElementById("iv-cancel").onclick = () => overlay.classList.add("hidden");
      const kanbanIvConfirmBtn = document.getElementById("iv-confirm");
      kanbanIvConfirmBtn.onclick = () => withLoading(kanbanIvConfirmBtn, async () => {
        const score = document.getElementById("iv-score").value;
        if (score && (score < 1 || score > 5)) { showToast("评分须在 1-5 之间", "error"); return; }
        overlay.classList.add("hidden");
        await api.post("/api/interviews", {
          link_id: parseInt(linkId),
          round: document.getElementById("iv-round").value,
          interviewer: document.getElementById("iv-interviewer").value || null,
          interview_time: document.getElementById("iv-time").value || null,
          score: score ? parseInt(score) : null,
          comment: document.getElementById("iv-comment").value || null,
          conclusion: document.getElementById("iv-conclusion").value || null,
        });
        await loadInterviewList(linkId);
      });
    };
  });

  el.querySelectorAll(".note-btn").forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const overlay = document.getElementById("note-overlay");
      const input = document.getElementById("note-input");
      input.value = btn.dataset.notes || "";
      overlay.classList.remove("hidden");
      input.focus();

      document.getElementById("note-cancel").onclick = () => overlay.classList.add("hidden");
      const noteConfirmBtn = document.getElementById("note-confirm");
      noteConfirmBtn.onclick = () => withLoading(noteConfirmBtn, async () => {
        overlay.classList.add("hidden");
        await api.patch(`/api/pipeline/link/${btn.dataset.linkId}/notes`, { notes: input.value });
        renderPipeline(el, jobId);
      });
    };
  });

  // 折叠/展开已淘汰卡片
  el.querySelectorAll(".kanban-toggle-inactive").forEach(btn => {
    btn.onclick = () => {
      const stage = btn.dataset.stage;
      const group = document.getElementById(`inactive-${stage}`);
      const isHidden = group.classList.toggle("hidden");
      btn.textContent = isHidden ? `显示已淘汰 (${group.querySelectorAll(".kanban-card").length})` : "隐藏已淘汰";
    };
  });

  // drag-and-drop
  let dragLinkId = null;
  el.querySelectorAll(".kanban-card").forEach(card => {
    card.addEventListener("dragstart", (e) => {
      dragLinkId = card.dataset.linkId;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
  });

  el.querySelectorAll(".kanban-col").forEach(col => {
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("drag-over"); });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
    col.addEventListener("drop", async (e) => {
      e.preventDefault();
      col.classList.remove("drag-over");
      const stage = col.dataset.stage;
      if (!dragLinkId) return;
      await api.patch(`/api/pipeline/link/${dragLinkId}/stage`, { stage });
      renderPipeline(el, jobId);
    });
  });
}

function renderCard(lnk, stages) {
  const isInactive = !!lnk.outcome;
  const lastUpdate = lnk.days_since_update !== null ? (lnk.days_since_update === 0 ? "今天" : `${lnk.days_since_update}天前`) : "";
  const rejectionTag = lnk.rejection_reason ? `<span class="tag" style="background:#fee2e2;color:#dc2626;font-size:11px">${lnk.rejection_reason}</span>` : "";

  if (isInactive) {
    return `
    <div class="kanban-card" data-link-id="${lnk.id}" data-stage="${lnk.stage}" style="opacity:0.5;background:#f9f9f9;cursor:default">
      <div class="card-name"><a href="#/candidates/${lnk.candidate_id}" style="color:#888;text-decoration:none">${lnk.candidate_name}</a></div>
      <div class="card-meta" style="margin-top:4px">${rejectionTag}${lnk.outcome==="withdrawn"?'<span class="tag" style="background:#f3f4f6;color:#6b7280;font-size:11px">已退出</span>':""}</div>
    </div>`;
  }

  const stageOptions = stages.map(s => `<option value="${s}" ${s === lnk.stage ? "selected" : ""}>${s}</option>`).join("");
  return `
    <div class="kanban-card" draggable="true" data-link-id="${lnk.id}" data-stage="${lnk.stage}">
      <div class="card-name"><a href="#/candidates/${lnk.candidate_id}" style="color:inherit;text-decoration:none">${lnk.candidate_name}</a></div>
      <div class="card-meta">${lastUpdate ? `🕐 ${lastUpdate}` : ""}${lnk.notes ? ` 📝 ${lnk.notes}` : ""}</div>
      <div class="card-actions">
        <select class="move-stage-select" data-link-id="${lnk.id}" style="flex:1;font-size:12px;padding:3px 6px;border:1px solid #ddd;border-radius:6px;background:#f9f9f9">${stageOptions}</select>
      </div>
      <div class="card-actions" style="margin-top:4px">
        <button class="btn btn-secondary btn-sm note-btn" data-link-id="${lnk.id}" data-notes="${(lnk.notes || "").replace(/"/g, '&quot;')}">备注</button>
        <button class="btn btn-secondary btn-sm interview-toggle-btn" data-link-id="${lnk.id}">面试记录</button>
        <button class="btn btn-danger btn-sm reject-btn" data-link-id="${lnk.id}">淘汰</button>
      </div>
      <div class="interview-panel hidden" id="iv-panel-${lnk.id}">
        <div id="iv-list-${lnk.id}" style="margin-top:8px;font-size:13px;color:#555"></div>
        <button class="btn btn-secondary btn-sm add-interview-btn" data-link-id="${lnk.id}" style="margin-top:6px">+ 新增面试记录</button>
      </div>
    </div>`;
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
