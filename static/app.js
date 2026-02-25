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
  if (hash === "#/candidates") return renderCandidateList(content);
  if (hash.startsWith("#/candidates/")) return renderCandidateProfile(content, hash.split("/")[2]);
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
  const jobs = await api.get("/api/jobs");

  body.innerHTML = `
    ${res.warning ? `<div class="warning-banner" style="margin-bottom:16px">${res.warning}</div>` : ""}
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
}

// ── Job List ──────────────────────────────────────────────────────────────────
async function renderJobList(el) {
  el.innerHTML = `
    <div class="page-header">
      <h1>岗位库</h1>
      <a href="#/jobs/new" class="btn btn-primary">+ 新建岗位</a>
    </div>
    <div class="filter-bar">
      <input id="job-search" type="text" placeholder="搜索职位名称、部门、HR..." style="flex:1;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;outline:none">
      <select id="job-status-filter" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;background:#fff">
        <option value="">全部状态</option>
        <option value="open" selected>招聘中</option>
        <option value="paused">暂停</option>
        <option value="closed">已关闭</option>
      </select>
      <select id="job-dept-filter" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;background:#fff">
        <option value="">全部部门</option>
      </select>
      <label style="font-size:14px;color:#666;cursor:pointer;white-space:nowrap">
        <input type="checkbox" id="show-closed" style="margin-right:4px">显示已关闭
      </label>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div id="job-table"><span class="spinner" style="margin:24px"></span></div>
    </div>`;

  const loadJobs = async () => {
    const q = document.getElementById("job-search")?.value || "";
    const status = document.getElementById("job-status-filter")?.value || "";
    const dept = document.getElementById("job-dept-filter")?.value || "";
    const includeClosed = document.getElementById("show-closed")?.checked || false;

    const params = new URLSearchParams();
    if (includeClosed) params.set("include_closed", "true");
    if (q) params.set("q", q);
    if (dept) params.set("department", dept);
    const url = `/api/jobs${params.toString() ? "?" + params.toString() : ""}`;

    let jobs = await api.get(url);

    // 状态筛选（前端过滤，因为 include_closed 已控制关闭岗位显示）
    if (status) jobs = jobs.filter(j => j.status === status);

    const tableEl = document.getElementById("job-table");
    if (!tableEl) return;

    // 动态填充部门下拉（仅首次或无选中时）
    const deptSelect = document.getElementById("job-dept-filter");
    if (deptSelect && deptSelect.options.length <= 1) {
      const depts = [...new Set(jobs.map(j => j.department).filter(Boolean))];
      depts.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d; opt.textContent = d;
        deptSelect.appendChild(opt);
      });
    }

    if (!jobs.length) {
      tableEl.innerHTML = '<div class="empty-state">暂无岗位</div>';
      return;
    }

    tableEl.innerHTML = `<table class="table">
      <thead><tr><th>#</th><th>职位名称</th><th>状态</th><th>候选人进展</th><th>最后活动</th><th>操作</th></tr></thead>
      <tbody>${jobs.map(j => {
        const num = String(j.id).padStart(3, "0");
        const subtitle = [j.department, j.city, j.created_at ? j.created_at.slice(0, 10) : null].filter(Boolean).join(" · ");
        const stageBadges = Object.entries(j.stage_counts || {})
          .filter(([, n]) => n > 0)
          .map(([s, n]) => `<span style="font-size:12px;color:#4f6ef7;margin-right:6px">● ${s}${n}</span>`)
          .join("");
        return `
        <tr>
          <td style="color:#999;font-size:13px">#${num}</td>
          <td>
            <a href="#/jobs/pipeline/${j.id}" style="font-weight:600">${j.title}</a>
            ${subtitle ? `<div style="font-size:12px;color:#999;margin-top:2px">${subtitle}</div>` : ""}
          </td>
          <td><span class="tag" style="${j.status === "open" ? "" : "background:#f0f0f0;color:#999"}">${j.status === "open" ? "招聘中" : j.status === "paused" ? "暂停" : "已关闭"}</span></td>
          <td>${stageBadges || "-"}</td>
          <td style="font-size:13px;color:#999">${j.last_activity ? j.last_activity.slice(0, 10) : "-"}</td>
          <td><a href="#/jobs/edit/${j.id}" class="btn btn-secondary btn-sm">编辑</a></td>
        </tr>`;
      }).join("")}
      </tbody></table>`;
  };

  loadJobs();

  let timer;
  document.getElementById("job-search").oninput = () => { clearTimeout(timer); timer = setTimeout(loadJobs, 300); };
  document.getElementById("job-status-filter").onchange = loadJobs;
  document.getElementById("job-dept-filter").onchange = loadJobs;
  document.getElementById("show-closed").onchange = loadJobs;
}

// ── Job Form ──────────────────────────────────────────────────────────────────
async function renderJobForm(el, id) {
  let job = { title: "", department: "", jd: "", persona: "", status: "open", hr_owner: "", stages: ["简历筛选", "电话初筛", "面试", "Offer", "已入职"] };
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
        <div class="form-group"><label>负责HR</label><input id="j-hr" value="${job.hr_owner || ""}"></div>
        <div class="form-group"><label>状态</label>
          <select id="j-status">
            <option value="open" ${job.status === "open" ? "selected" : ""}>招聘中</option>
            <option value="paused" ${job.status === "paused" ? "selected" : ""}>暂停</option>
            <option value="closed" ${job.status === "closed" ? "selected" : ""}>已关闭</option>
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
      hr_owner: document.getElementById("j-hr").value || null,
      status: document.getElementById("j-status").value,
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
      if (!confirm("确认淘汰该候选人？")) return;
      await api.patch(`/api/pipeline/link/${btn.dataset.linkId}/outcome`, { outcome: "rejected" });
      renderPipeline(el, jobId);
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
  return `
    <div class="kanban-card" draggable="true" data-link-id="${lnk.id}" data-stage="${lnk.stage}">
      <div class="card-name"><a href="#/candidates/${lnk.candidate_id}" style="color:inherit;text-decoration:none">${lnk.candidate_name}</a></div>
      <div class="card-meta">${lastUpdate ? `🕐 ${lastUpdate}` : ""}${lnk.notes ? ` 📝 ${lnk.notes}` : ""}</div>
      <div class="card-actions">
        <select class="move-stage-select" data-link-id="${lnk.id}" style="flex:1;font-size:12px;padding:3px 6px;border:1px solid #ddd;border-radius:6px;background:#f9f9f9">${stageOptions}</select>
      </div>
      <div class="card-actions" style="margin-top:4px">
        <button class="btn btn-secondary btn-sm note-btn" data-link-id="${lnk.id}">备注</button>
        <button class="btn btn-danger btn-sm reject-btn" data-link-id="${lnk.id}">淘汰</button>
      </div>
    </div>`;
}
