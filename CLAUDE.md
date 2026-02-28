# 招聘管理工具 — Project Memory

## Stack

- **Backend**: FastAPI + SQLite (`data/recruitment.db`), entry point `main.py` (uvicorn port 8000)
- **Frontend**: Vue 3 + Element Plus + Vite, in `frontend/`; API via `frontend/src/api/base.js` (axios wrapper, `api.get/post/patch/delete`)
- **Routes**: `app/routes/` — activities, analytics, candidates, pipeline, jobs, suppliers, dashboard, settings, email, dedup, resume
- **Services**: `app/services/` — activities (CHAIN_TYPES, build_payload, sync_stage), pipeline, candidates
- **Components**: `frontend/src/components/` — ActivityForm, ActivityCard, CreateCandidateDialog, TailNode, CandidateDetail
- **Pages**: `frontend/src/pages/` — Pipeline, Today, Talent, Jobs, Analytics, Hired, Settings, Suppliers

## Key Architecture Notes

- **Activity payload pattern**: ActivityRecord has both sparse columns AND a JSON `payload` column. `build_payload()` sets the payload on create; `ActivityOut` schema reads payload-first via `normalize_payload_priority`. Always use `exclude_unset=True` (not `exclude_none`) when updating records.
- **Pipeline state machine**: CandidateJobLink has `state` (IN_PROGRESS/HIRED/REJECTED/WITHDRAWN) and `outcome` (null/hired/rejected/withdrawn). Stage is auto-derived from activity chain via `sync_stage()`.
- **fee_rate**: Stored as string like `"15"` meaning 15%. Always divide by 100 when computing fees: `monthly_salary * 12 * fee_rate / 100`.

## Bug Fix Batch — 2026-02-28

Commit: `fix: 修復 14 處 bug（P0 直接報錯 / P1 數據丟失 / P2 響應式）`

1. **`api/pipeline.js`** — withdraw/reject/hire/transfer: POST→PATCH; reject URL `/reject`→`/outcome`; reject payload `{reason}`→`{outcome:'rejected', rejection_reason}`
2. **`ActivityForm.vue`** — 背調結論 `"有疑點"`→`"有瑕疵"`; offer fields `bonus_months`→`salary_months`, `equity`→`other_cash`; removed `score===0` from empty-field filter
3. **`CreateCandidateDialog.vue`** — Resume parse now reads `work_experience[0].title/company` and `education_list[0].degree` (AI returns arrays, not flat fields); `handleSubmit` now passes full parsed data (`education_list`, `work_experience`, `skill_tags`, `age`, `city`, `years_exp`, `name_en`) to backend
4. **`TailNode.vue`** — `saveOnboard`: `monthly_salary` passed as top-level field (not inside a `payload` object the backend ignores); `NaN` guard on `Number(prefill)`
5. **`activities.py`** — `ActivityUpdate` schema adds `monthly_salary/salary_months/other_cash`; `build_payload` now has an `onboard` branch that includes `start_date` and `monthly_salary`
6. **`candidates.py`** — `update_candidate` uses `exclude_unset=True` (was `exclude_none`, which silently overwrote nullable fields)
7. **`analytics.py`** — Channel ROI fee calculation was dividing by 100 twice; fixed to divide once
8. **`pipeline.py`** — `outcome == None` corrected to SQLAlchemy `.is_(None)`
9. **`ActivityCard.vue`** — `const a = props.activity` (non-reactive) replaced with `computed(() => props.activity)`; all downstream computeds updated to use `a.value.xxx`
10. **`Pipeline.vue`** — Removed dead `debounce(() => {}, 250)` (was a stale closure doing nothing; search is driven by computed)
