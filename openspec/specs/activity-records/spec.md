## Purpose
定义活动记录的数据模型、API 接口和表单校验规范。

## Requirements

### Requirement: resume_review is a valid activity type
The system SHALL support `resume_review` as an activity type with pass/reject conclusion.

#### Scenario: Creating resume_review activity
- **WHEN** a CandidateJobLink is created
- **THEN** a resume_review activity is auto-created with status=`pending`

#### Scenario: Completing resume_review with pass
- **WHEN** user marks resume_review conclusion=`通过`
- **THEN** activity status is set to `completed` and stage is updated to `简历筛选`

#### Scenario: Completing resume_review with reject
- **WHEN** user marks resume_review conclusion=`淘汰`
- **THEN** activity status is set to `completed` and link outcome is set to `rejected`

### Requirement: Activity records support multiple types
The system SHALL store all candidate lifecycle events in a single `activity_records` table with a `type` field distinguishing: `resume_review`, `interview`, `note`, `offer`. The `stage_change` and `phone_screen` types are retired and SHALL NOT be created by new code. Historical `phone_screen` records are preserved and rendered with their original label "电话初筛".

#### Scenario: Creating a resume_review activity
- **WHEN** a new CandidateJobLink is created
- **THEN** an activity record is created with type=`resume_review`, status=`pending`, linked to the link_id

#### Scenario: Creating an interview activity
- **WHEN** user completes resume_review or a prior activity and selects "面试" as next step
- **THEN** an activity record is created with type=`interview`, linked to the current link_id

#### Scenario: Creating a note activity
- **WHEN** user saves a note at any point in the flow
- **THEN** an activity record is created with type=`note` with only comment field; chain state is unaffected

#### Scenario: Creating an offer activity
- **WHEN** user selects "Offer" as next step after completing a prior activity
- **THEN** an activity record is created with type=`offer` with salary and start_date fields

#### Scenario: phone_screen type is not created
- **WHEN** any new activity is created
- **THEN** the system SHALL NOT allow type=`phone_screen`; the backend returns HTTP 400 if attempted

#### Scenario: stage_change type is not created
- **WHEN** any activity is created or updated
- **THEN** no stage_change type activity is created by the system

#### Scenario: Historical phone_screen records display
- **WHEN** a link has existing phone_screen activity records
- **THEN** they are rendered in the timeline with label "电话初筛" and their original data intact

### Requirement: Activity records API
The system SHALL expose `/api/activities` endpoints. The `stage` field in POST body is now optional; the backend derives and updates `CandidateJobLink.stage` automatically after each activity create/update.

#### Scenario: List activities for a link
- **WHEN** GET `/api/activities?link_id={id}` is called
- **THEN** all activity records for that link are returned, ordered by created_at ascending, excluding stage_change type records from chain display

#### Scenario: Create activity
- **WHEN** POST `/api/activities` is called with valid type and link_id
- **THEN** chain tail validation runs; if passed, activity record is created, stage is auto-derived and updated on the link

#### Scenario: Update activity
- **WHEN** PATCH `/api/activities/{id}` is called
- **THEN** mutable fields are updated; stage is re-derived and updated on the link

### Requirement: Activity form conclusion validation
The system SHALL validate that conclusion is not empty before saving activity forms (offer, interview inline form). If conclusion is empty or an empty string, the system SHALL show an error toast and prevent the save.

#### Scenario: Saving offer form without conclusion
- **WHEN** user clicks save on an offer form without selecting a conclusion
- **THEN** system shows toast "请选择结论" and does not submit the API request

#### Scenario: Saving interview inline form without conclusion
- **WHEN** user clicks save on an interview inline form without selecting a conclusion
- **THEN** system shows toast "请选择结论" and does not submit the API request

#### Scenario: Saving form with valid conclusion
- **WHEN** user clicks save on any activity form with a valid conclusion selected
- **THEN** system submits the API request normally

### Requirement: Resume review requires actor on completion
The system SHALL require an `actor` (筛选人) field when completing a resume_review activity with conclusion 通过 or 淘汰. The frontend SHALL display an actor input field above the pass/reject buttons.

#### Scenario: Completing resume_review with actor
- **WHEN** user fills in actor="张三" and clicks 通过
- **THEN** the activity is saved with actor="张三" and conclusion="通过"

#### Scenario: Completing resume_review without actor
- **WHEN** user clicks 通过 or 淘汰 without filling in actor
- **THEN** system shows toast "请填写筛选人" and does not submit

### Requirement: update_activity 同步 payload
`PATCH /api/activities/{id}` SHALL 在更新稀疏列的同时，将被更新的字段同步写入 `payload` JSON 中对应的 key。若 payload 为 null，则不创建新 payload（仅更新稀疏列）。确保 `record_to_dict` 读取时 payload 优先的逻辑与实际数据保持一致。

#### Scenario: 更新面试活动的 conclusion 同步到 payload
- **WHEN** 客户端发送 `PATCH /api/activities/{id}`，body 包含 `{"conclusion": "通过", "score": 4}`，该记录 payload 中有 conclusion/score key
- **THEN** 稀疏列 conclusion/score 更新，payload 中对应 key 也更新为新值

#### Scenario: payload 为 null 时只更新稀疏列
- **WHEN** 客户端发送 `PATCH /api/activities/{id}`，该记录 payload 为 null
- **THEN** 只更新稀疏列，不创建 payload 对象

#### Scenario: 更新 status 为 completed 后读取正确
- **WHEN** 客户端更新面试活动 status='completed'，再次 GET /api/activities?link_id=x
- **THEN** 该记录返回的 status 为 'completed'，不被旧 payload 覆盖

### Requirement: Activity serialization via Pydantic schema
activity records 序列化 SHALL 通过 `ActivityOut` Pydantic schema 实现，不再使用手写 `record_to_dict()` 函数。payload 优先读逻辑 MUST 保留，行为与现有完全一致。

#### Scenario: GET /api/activities returns serialized records
- **WHEN** `GET /api/activities?link_id={id}` 被调用
- **THEN** response 为 activity 对象数组，每个对象包含 `id`、`type`、`stage`、`payload`、`conclusion`、`round`、`score` 等现有所有字段

#### Scenario: Payload-first read preserved
- **WHEN** ActivityRecord 的 payload 包含 `conclusion` 字段
- **THEN** `ActivityOut.conclusion` 读取 payload 中的值，忽略稀疏列 `r.conclusion`
`POST /api/activities` 中，`onboard` 类型 SHALL 跳过链尾约束检查（不要求上一条 chain 活动有 conclusion 或 status=completed）。onboard 是终态操作，可在任意阶段直接触发。

#### Scenario: offer conclusion 为 null 时可创建 onboard
- **WHEN** 当前链尾是 offer 活动，conclusion 为 null（谈判中），客户端发送 `POST /api/activities` type='onboard'
- **THEN** 系统成功创建 onboard 活动，不返回 400

#### Scenario: onboard 创建后自动标记 hired
- **WHEN** onboard 活动创建成功
- **THEN** 对应 CandidateJobLink 的 outcome='hired'，state='HIRED'


## REMOVED Requirements

### Requirement: Activity records lock stage at creation
**Reason**: Stage is now derived from the activity chain tail automatically. The `stage` field on ActivityRecord is still stored for historical reference but is auto-populated by the backend, not passed by the frontend.
**Migration**: `ActivityCreate.stage` is now Optional. Backend auto-fills it based on activity type.

### Requirement: Stage change is recorded
**Reason**: stage_change activity type is retired. Stage is now derived from the activity chain tail automatically; no explicit stage_change event is needed.
**Migration**: Existing stage_change records are preserved in the database but excluded from UI rendering and chain calculations.

### Requirement: Creating a phone screen activity
**Reason**: phone_screen is retired. It was functionally identical to interview. Historical records are preserved but no new phone_screen activities can be created.
**Migration**: Users use "面试" (interview) type for all screening and interview activities. Existing phone_screen records remain visible with their original label.

### Requirement: Saving phone_screen form without conclusion
**Reason**: phone_screen type is retired; its conclusion validation requirement is no longer applicable.
**Migration**: No action needed. Interview form validation covers the same scenario.
