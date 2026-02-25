// ── API helpers ──────────────────────────────────────────────────────────────
const api = {
  get: (url) => fetch(url).then(r => r.json()),
  post: (url, data) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
  patch: (url, data) => fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
};

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
  if (hash === "#/jobs") return renderJobList(content);
  if (hash.startsWith("#/jobs/pipeline/")) return renderPipeline(content, hash.split("/")[3]);
  if (hash.startsWith("#/jobs/edit/")) return renderJobForm(content, hash.split("/")[3]);
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
        <a href="#/jobs/pipeline/${s.job_id}">${s.job_title}</a>
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
        <a href="#/jobs/pipeline/${j.job_id}" style="font-weight:600;color:#1a1a2e;text-decoration:none">${j.title}</a>
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
  const [jobs, dupRes] = await Promise.all([
    api.get("/api/jobs"),
    api.post("/api/candidates/check-duplicate", {
      name: p.name || null,
      phone: p.phone || null,
      email: p.email || null,
      last_company: p.last_company || null,
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

  body.innerHTML = `
    ${res.warning ? `<div class="warning-banner" style="margin-bottom:16px">${res.warning}</div>` : ""}
    ${dupBanner}
    <input type="hidden" id="resume-path" value="${res.resume_path || ""}">
    <div class="form-grid">
      <div class="form-group"><label>姓名 *</label><input id="f-name" value="${p.name || ""}"></div>
      <div class="form-group"><label>手机号</label><input id="f-phone" value="${p.phone || ""}"></div>
      <div class="form-group"><label>邮箱</label><input id="f-email" value="${p.email || ""}"></div>
      <div class="form-group"><label>年龄</label><input id="f-age" type="number" value="${p.age || ""}"></div>
      <div class="form-group"><label>学历</label><input id="f-education" value="${p.education || ""}"></div>
      <div class="form-group"><label>毕业院校</label><input id="f-school" value="${p.school || ""}"></div>
      <div class="form-group"><label>当前城市</label><input id="f-city" value="${p.city || ""}"></div>
      <div class="form-group"><label>上家公司</label><input id="f-last-company" value="${p.last_company || ""}"></div>
      <div class="form-group"><label>上家职位</label><input id="f-last-title" value="${p.last_title || ""}"></div>
      <div class="form-group"><label>工作年限</label><input id="f-years-exp" type="number" value="${p.years_exp || ""}"></div>
      <div class="form-group"><label>技能标签（逗号分隔）</label><input id="f-tags" value="${(p.skill_tags || []).join(", ")}"></div>
      <div class="form-group"><label>来源渠道</label><input id="f-source" placeholder="如：Boss直聘、内推..."></div>
      <div class="form-group form-full"><label>关联岗位（可选）</label>
        <select id="f-job">
          <option value="">-- 暂不关联岗位 --</option>
          ${jobs.map(j => `<option value="${j.id}">${j.title}</option>`).join("")}
        </select>
      </div>
      <div class="form-group form-full"><label>备注</label><textarea id="f-notes"></textarea></div>
    </div>`;

  // 查重：更新已有档案
  body.querySelectorAll(".dup-update-btn").forEach(btn => {
    btn.onclick = async () => {
      const existingId = btn.dataset.id;
      const tags = document.getElementById("f-tags").value.split(",").map(t => t.trim()).filter(Boolean);
      const patch = {};
      const fields = { name: "f-name", phone: "f-phone", email: "f-email", city: "f-city",
        last_company: "f-last-company", last_title: "f-last-title", education: "f-education", school: "f-school" };
      for (const [key, elId] of Object.entries(fields)) {
        const val = document.getElementById(elId)?.value;
        if (val) patch[key] = val;
      }
      const age = parseInt(document.getElementById("f-age").value);
      if (age) patch.age = age;
      const yrs = parseInt(document.getElementById("f-years-exp").value);
      if (yrs) patch.years_exp = yrs;
      if (tags.length) patch.skill_tags = tags;
      const resumePath = document.getElementById("resume-path").value;
      if (resumePath) patch.resume_path = resumePath;
      await api.patch(`/api/candidates/${existingId}`, patch);
      overlay.classList.add("hidden");
      location.hash = `#/candidates/${existingId}`;
    };
  });

  // 查重：忽略，仍然新建
  const ignoreBtn = document.getElementById("dup-ignore-btn");
  if (ignoreBtn) {
    ignoreBtn.onclick = () => document.getElementById("dup-banner")?.remove();
  }

  document.getElementById("modal-cancel").onclick = () => overlay.classList.add("hidden");
  document.getElementById("modal-save").onclick = async () => {
    const name = document.getElementById("f-name").value.trim();
    if (!name) { alert("姓名不能为空"); return; }

    const tags = document.getElementById("f-tags").value.split(",").map(t => t.trim()).filter(Boolean);
    const candidate = await api.post("/api/candidates", {
      name,
      phone: document.getElementById("f-phone").value || null,
      email: document.getElementById("f-email").value || null,
      age: parseInt(document.getElementById("f-age").value) || null,
      education: document.getElementById("f-education").value || null,
      school: document.getElementById("f-school").value || null,
      city: document.getElementById("f-city").value || null,
      last_company: document.getElementById("f-last-company").value || null,
      last_title: document.getElementById("f-last-title").value || null,
      years_exp: parseInt(document.getElementById("f-years-exp").value) || null,
      skill_tags: tags,
      source: document.getElementById("f-source").value || null,
      notes: document.getElementById("f-notes").value || null,
      resume_path: document.getElementById("resume-path").value || null,
    });

    const jobId = document.getElementById("f-job").value;
    if (jobId) {
      await api.post("/api/pipeline/link", { candidate_id: candidate.id, job_id: parseInt(jobId) });
    }

    overlay.classList.add("hidden");
    location.hash = `#/candidates/${candidate.id}`;
  };
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
          <td>${c.created_at ? c.created_at.slice(0, 10) : "-"}</td>
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
async function renderCandidateProfile(el, id) {
  el.innerHTML = '<span class="spinner"></span>';
  const c = await api.get(`/api/candidates/${id}`);

  el.innerHTML = `
    <div class="page-header">
      <button class="btn btn-secondary btn-sm" onclick="history.back()">← 返回</button>
    </div>
    <div class="card">
      <div class="profile-header">
        <div class="profile-avatar">${c.name[0]}</div>
        <div class="profile-info">
          <h1>${c.name}</h1>
          <p>${[c.last_title, c.last_company].filter(Boolean).join(" @ ") || "暂无工作信息"}</p>
          <p style="margin-top:4px">${(c.skill_tags || []).map(t => `<span class="tag">${t}</span>`).join("")}</p>
        </div>
        <div style="margin-left:auto;display:flex;gap:8px;align-items:flex-start">
          ${c.resume_path ? `<a href="/resumes/${encodeURIComponent(c.resume_path.split('/').slice(-2).join('/'))}" target="_blank" class="btn btn-secondary btn-sm">查看简历</a>` : ""}
          <button class="btn btn-secondary btn-sm" id="edit-info-btn">编辑信息</button>
        </div>
      </div>
      <div class="form-grid">
        ${[
          ["手机", c.phone], ["邮箱", c.email], ["年龄", c.age],
          ["学历", [c.education, c.school].filter(Boolean).join(" · ")],
          ["城市", c.city], ["工作年限", c.years_exp ? c.years_exp + "年" : null],
          ["来源", c.source],
        ].map(([label, val]) => val ? `<div class="form-group"><label>${label}</label><div style="font-size:14px;padding:8px 0">${val}</div></div>` : "").join("")}
        <div class="form-group"><label>跟进状态</label>
          <select id="profile-followup" style="padding:6px 10px;border:1px solid #ddd;border-radius:8px;font-size:14px;background:#fff">
            <option value="" ${!c.followup_status ? "selected" : ""}>未设置</option>
            <option value="待跟进" ${c.followup_status === "待跟进" ? "selected" : ""}>待跟进</option>
            <option value="已联系" ${c.followup_status === "已联系" ? "selected" : ""}>已联系</option>
            <option value="暂不考虑" ${c.followup_status === "暂不考虑" ? "selected" : ""}>暂不考虑</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>备注</h2>
      <textarea id="notes-input" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;min-height:80px">${c.notes || ""}</textarea>
      <button class="btn btn-primary btn-sm" style="margin-top:10px" id="save-notes">保存备注</button>
    </div>

    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h2 style="margin:0">关联岗位</h2>
        <button class="btn btn-primary btn-sm" id="link-job-btn">+ 关联岗位</button>
      </div>
      <div id="job-links">
        ${c.job_links.length ? c.job_links.map(lnk => `
          <div class="job-health-row">
            <div>
              <a href="#/jobs/pipeline/${lnk.job_id}" style="font-weight:600">${lnk.job_title || "未知岗位"}</a>
              <span style="margin-left:8px;font-size:13px;color:#666">${lnk.stage || ""}</span>
              ${lnk.outcome ? `<span class="stale-badge" style="background:#fee2e2;color:#dc2626">${lnk.outcome === "rejected" ? "淘汰" : "退出"}</span>` : ""}
            </div>
            <span style="font-size:12px;color:#999">${lnk.created_at ? lnk.created_at.slice(0, 10) : ""}</span>
          </div>`).join("") : '<div class="empty-state" style="padding:16px">暂未关联任何岗位</div>'}
      </div>
    </div>

    <div class="card">
      <h2>历史记录</h2>
      ${c.history.length ? c.history.map(h => `
        <div class="history-item">
          <span class="history-time">${h.timestamp ? h.timestamp.slice(0, 16).replace("T", " ") : ""}</span>
          <span>${h.detail}</span>
        </div>`).join("") : '<div class="empty-state" style="padding:16px">暂无历史记录</div>'}
    </div>`;

  document.getElementById("save-notes").onclick = async () => {
    await api.patch(`/api/candidates/${id}`, { notes: document.getElementById("notes-input").value });
    alert("备注已保存");
  };

  document.getElementById("edit-info-btn").onclick = () => {
    const overlay = document.getElementById("modal-overlay");
    const body = document.getElementById("modal-body");
    document.querySelector("#modal-overlay h2").textContent = "编辑候选人信息";
    body.innerHTML = `
      <div class="form-grid">
        <div class="form-group"><label>姓名</label><input id="e-name" value="${c.name || ""}"></div>
        <div class="form-group"><label>手机</label><input id="e-phone" value="${c.phone || ""}"></div>
        <div class="form-group"><label>邮箱</label><input id="e-email" value="${c.email || ""}"></div>
        <div class="form-group"><label>年龄</label><input id="e-age" type="number" value="${c.age || ""}"></div>
        <div class="form-group"><label>学历</label><input id="e-education" value="${c.education || ""}"></div>
        <div class="form-group"><label>毕业院校</label><input id="e-school" value="${c.school || ""}"></div>
        <div class="form-group"><label>城市</label><input id="e-city" value="${c.city || ""}"></div>
        <div class="form-group"><label>上家公司</label><input id="e-last-company" value="${c.last_company || ""}"></div>
        <div class="form-group"><label>上家职位</label><input id="e-last-title" value="${c.last_title || ""}"></div>
        <div class="form-group"><label>工作年限</label><input id="e-years-exp" type="number" value="${c.years_exp || ""}"></div>
        <div class="form-group form-full"><label>技能标签（逗号分隔）</label><input id="e-tags" value="${(c.skill_tags || []).join(", ")}"></div>
        <div class="form-group"><label>来源渠道</label><input id="e-source" value="${c.source || ""}"></div>
      </div>`;
    overlay.classList.remove("hidden");

    document.getElementById("modal-cancel").onclick = () => {
      overlay.classList.add("hidden");
      document.querySelector("#modal-overlay h2").textContent = "确认候选人信息";
    };
    document.getElementById("modal-save").onclick = async () => {
      const tags = document.getElementById("e-tags").value.split(",").map(s => s.trim()).filter(Boolean);
      await api.patch(`/api/candidates/${id}`, {
        name: document.getElementById("e-name").value,
        phone: document.getElementById("e-phone").value || null,
        email: document.getElementById("e-email").value || null,
        age: parseInt(document.getElementById("e-age").value) || null,
        education: document.getElementById("e-education").value || null,
        school: document.getElementById("e-school").value || null,
        city: document.getElementById("e-city").value || null,
        last_company: document.getElementById("e-last-company").value || null,
        last_title: document.getElementById("e-last-title").value || null,
        years_exp: parseInt(document.getElementById("e-years-exp").value) || null,
        skill_tags: tags,
        source: document.getElementById("e-source").value || null,
      });
      overlay.classList.add("hidden");
      document.querySelector("#modal-overlay h2").textContent = "确认候选人信息";
      renderCandidateProfile(el, id);
    };
  };

  document.getElementById("link-job-btn").onclick = async () => {
    const jobs = await api.get("/api/jobs");
    const overlay = document.getElementById("link-job-overlay");
    const select = document.getElementById("link-job-select");
    select.innerHTML = jobs.map(j => `<option value="${j.id}">${j.title}</option>`).join("");
    overlay.classList.remove("hidden");

    document.getElementById("link-job-cancel").onclick = () => overlay.classList.add("hidden");
    document.getElementById("link-job-confirm").onclick = async () => {
      const jobId = parseInt(select.value);
      if (!jobId) return;
      overlay.classList.add("hidden");
      await api.post("/api/pipeline/link", { candidate_id: parseInt(id), job_id: jobId });
      renderCandidateProfile(el, id);
    };
  };

  document.getElementById("profile-followup").onchange = async (e) => {
    await api.patch(`/api/candidates/${id}`, { followup_status: e.target.value || null });
  };
}

// ── Pipeline Tracking ─────────────────────────────────────────────────────────
async function renderPipelineTracking(el) {
  el.innerHTML = `
    <div class="page-header"><h1>流程跟进</h1></div>
    <div class="filter-bar" style="margin-bottom:16px">
      <select id="pt-group" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;background:#fff">
        <option value="job">按岗位分组</option>
        <option value="stage">按阶段分组</option>
      </select>
      <select id="pt-job-filter" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;background:#fff">
        <option value="">全部岗位</option>
      </select>
    </div>
    <div id="pt-content"><span class="spinner" style="margin:24px"></span></div>`;

  const links = await api.get("/api/pipeline/active");
  const contentEl = document.getElementById("pt-content");
  if (!contentEl) return;

  // 填充岗位筛选
  const jobFilter = document.getElementById("pt-job-filter");
  const jobs = [...new Map(links.map(l => [l.job_id, l.job_title])).entries()];
  jobs.forEach(([id, title]) => {
    const opt = document.createElement("option");
    opt.value = id; opt.textContent = title;
    jobFilter.appendChild(opt);
  });

  const renderContent = () => {
    const groupBy = document.getElementById("pt-group")?.value || "job";
    const jobId = document.getElementById("pt-job-filter")?.value || "";
    let filtered = jobId ? links.filter(l => String(l.job_id) === jobId) : links;

    if (!filtered.length) {
      contentEl.innerHTML = '<div class="empty-state">暂无进行中的人选</div>';
      return;
    }

    const groups = {};
    filtered.forEach(l => {
      const key = groupBy === "job" ? `${l.job_title}||${l.job_id}` : (l.stage || "未知阶段");
      if (!groups[key]) groups[key] = [];
      groups[key].push(l);
    });

    contentEl.innerHTML = Object.entries(groups).map(([key, items]) => {
      const label = groupBy === "job" ? key.split("||")[0] : key;
      const jobId = groupBy === "job" ? key.split("||")[1] : null;
      const rows = items.map(l => {
        const days = l.days_since_update !== null ? (l.days_since_update === 0 ? "今天" : `${l.days_since_update}天前`) : "";
        const stageCell = groupBy === "job"
          ? `<span class="tag" style="font-size:11px">${l.stage || "-"}</span>`
          : `<a href="#/jobs/pipeline/${l.job_id}" style="font-size:12px;color:#555;text-decoration:none">${l.job_title}</a>`;
        return `<tr>
          <td><a href="#/candidates/${l.candidate_id}" style="font-weight:600;color:#1a1a2e;text-decoration:none">${l.candidate_name}</a></td>
          <td>${stageCell}</td>
          <td style="color:#888;font-size:13px">${days}</td>
        </tr>`;
      }).join("");

      const thead = groupBy === "job"
        ? `<thead><tr><th>姓名</th><th>阶段</th><th>最后更新</th></tr></thead>`
        : `<thead><tr><th>姓名</th><th>岗位</th><th>最后更新</th></tr></thead>`;

      const titleLink = groupBy === "job"
        ? `<a href="#/jobs/pipeline/${jobId}" style="color:#1a1a2e;text-decoration:none;font-weight:700">${label}</a>`
        : `<span style="font-weight:700">${label}</span>`;

      return `<div class="card" style="padding:0;overflow:hidden;margin-bottom:16px">
        <div style="padding:12px 16px;background:#f8f9fa;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center">
          ${titleLink}
          <span class="tag">${items.length} 人</span>
        </div>
        <table class="table" style="margin:0">
          ${thead}
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }).join("");
  };

  renderContent();
  document.getElementById("pt-group").onchange = renderContent;
  document.getElementById("pt-job-filter").onchange = renderContent;
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
        document.getElementById("link-job-confirm").onclick = async () => {
          overlay.classList.add("hidden");
          const jobId = parseInt(select.value);
          await api.post("/api/pipeline/link", { candidate_id: parseInt(btn.dataset.id), job_id: jobId });
          location.hash = `#/jobs/pipeline/${jobId}`;
        };
      };
    });
  };

  loadTalent();

  let timer;
  document.getElementById("tp-search").oninput = () => { clearTimeout(timer); timer = setTimeout(loadTalent, 300); };
  document.getElementById("tp-followup").onchange = loadTalent;
  document.getElementById("tp-source").onchange = loadTalent;
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
    // 勾选"显示已关闭"时不过滤 closed，否则后端默认排除
    if (includeClosed) params.set("include_closed", "true");
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
            <a href="#/jobs/pipeline/${j.id}" class="job-title-link">${j.title}</a>
            <div class="job-subtitle">#${num}</div>
          </td>
          <td style="color:#555;font-size:13px">${info || "-"}</td>
          <td>${priorityTag}</td>
          <td><span class="tag" style="${statusStyle}">${statusLabel}</span></td>
          <td class="job-progress">${progress}</td>
          <td>
            <div style="display:flex;gap:6px">
              <a href="#/jobs/edit/${j.id}" class="btn btn-secondary btn-sm">编辑</a>
              ${j.status !== "closed" ? `<button class="btn btn-danger btn-sm close-job-btn" data-job-id="${j.id}">关闭</button>` : ""}
            </div>
          </td>
        </tr>`;
      }).join("")}
      </tbody></table>`;

    tableEl.querySelectorAll(".close-job-btn").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("确认关闭该岗位？关闭后不再显示在招聘中列表。")) return;
        await api.patch(`/api/jobs/${btn.dataset.jobId}`, { status: "closed" });
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
      <a href="#/jobs/edit/${jobId}" class="btn btn-secondary btn-sm">编辑岗位</a>
    </div>
    <div class="kanban" id="kanban-board">
      ${pipeline.stages.map(stage => `
        <div class="kanban-col" data-stage="${stage}">
          <div class="kanban-col-header">
            <span>${stage}</span>
            <span class="kanban-count">${(pipeline.pipeline[stage] || []).length}</span>
          </div>
          <div class="kanban-cards">
            ${(pipeline.pipeline[stage] || []).map(lnk => renderCard(lnk, pipeline.stages)).join("")}
          </div>
        </div>`).join("")}
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
      document.getElementById("reject-confirm").onclick = async () => {
        if (!sel.value) { alert("请选择淘汰原因"); return; }
        overlay.classList.add("hidden");
        await api.patch(`/api/pipeline/link/${btn.dataset.linkId}/outcome`, { outcome: "rejected", rejection_reason: sel.value });
        renderPipeline(el, jobId);
      };
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
      document.getElementById("iv-confirm").onclick = async () => {
        const score = document.getElementById("iv-score").value;
        if (score && (score < 1 || score > 5)) { alert("评分须在 1-5 之间"); return; }
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
      };
    };
  });

  el.querySelectorAll(".note-btn").forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const overlay = document.getElementById("note-overlay");
      const input = document.getElementById("note-input");
      input.value = "";
      overlay.classList.remove("hidden");
      input.focus();

      document.getElementById("note-cancel").onclick = () => overlay.classList.add("hidden");
      document.getElementById("note-confirm").onclick = async () => {
        overlay.classList.add("hidden");
        await api.patch(`/api/pipeline/link/${btn.dataset.linkId}/notes`, { notes: input.value });
        renderPipeline(el, jobId);
      };
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
  const stageOptions = stages.map(s => `<option value="${s}" ${s === lnk.stage ? "selected" : ""}>${s}</option>`).join("");
  const lastUpdate = lnk.days_since_update !== null ? (lnk.days_since_update === 0 ? "今天" : `${lnk.days_since_update}天前`) : "";
  const rejectionTag = lnk.rejection_reason ? `<span class="tag" style="background:#fee2e2;color:#dc2626;font-size:11px">${lnk.rejection_reason}</span>` : "";
  return `
    <div class="kanban-card" draggable="true" data-link-id="${lnk.id}" data-stage="${lnk.stage}">
      <div class="card-name"><a href="#/candidates/${lnk.candidate_id}" style="color:inherit;text-decoration:none">${lnk.candidate_name}</a></div>
      <div class="card-meta">${lastUpdate ? `🕐 ${lastUpdate}` : ""}${lnk.notes ? ` 📝 ${lnk.notes}` : ""}${rejectionTag}</div>
      <div class="card-actions">
        <select class="move-stage-select" data-link-id="${lnk.id}" style="flex:1;font-size:12px;padding:3px 6px;border:1px solid #ddd;border-radius:6px;background:#f9f9f9">${stageOptions}</select>
      </div>
      <div class="card-actions" style="margin-top:4px">
        <button class="btn btn-secondary btn-sm note-btn" data-link-id="${lnk.id}">备注</button>
        <button class="btn btn-secondary btn-sm interview-toggle-btn" data-link-id="${lnk.id}">面试记录</button>
        <button class="btn btn-danger btn-sm reject-btn" data-link-id="${lnk.id}">淘汰</button>
      </div>
      <div class="interview-panel hidden" id="iv-panel-${lnk.id}">
        <div id="iv-list-${lnk.id}" style="margin-top:8px;font-size:13px;color:#555"></div>
        <button class="btn btn-secondary btn-sm add-interview-btn" data-link-id="${lnk.id}" style="margin-top:6px">+ 新增面试记录</button>
      </div>
    </div>`;
}
