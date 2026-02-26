## ADDED Requirements

### Requirement: Activity chain is a single ordered sequence per link
Each CandidateJobLink SHALL have at most one active (incomplete) non-note activity at any time. Activities form a single-direction chain: a new chain node can only be added after the current tail node is completed.

#### Scenario: Adding activity when tail is incomplete
- **WHEN** POST `/api/activities` is called for a link whose last non-note activity has no conclusion and status is not completed/cancelled
- **THEN** the server returns HTTP 400 with detail "当前活动尚未完成，请先完成后再添加下一步"

#### Scenario: Adding activity when tail is complete
- **WHEN** POST `/api/activities` is called for a link whose last non-note activity has a conclusion or status=completed/cancelled
- **THEN** the activity is created successfully

#### Scenario: Adding note activity is always allowed
- **WHEN** POST `/api/activities` is called with type=`note` for any link regardless of chain state
- **THEN** the note activity is created successfully without chain validation

#### Scenario: Adding first activity after resume_review completes
- **WHEN** the resume_review activity has conclusion=`通过` and user adds a new activity
- **THEN** the new activity (phone_screen, interview, or offer) is created successfully

### Requirement: resume_review activity is auto-created on link creation
When a candidate is linked to a job (CandidateJobLink created), the system SHALL automatically create a `resume_review` activity with status=`pending` in the same transaction.

#### Scenario: Candidate enters a job
- **WHEN** POST `/api/pipeline/link` creates a new CandidateJobLink
- **THEN** a resume_review activity is atomically created with link_id, type=`resume_review`, status=`pending`, stage=`简历筛选`

#### Scenario: Link creation fails
- **WHEN** the CandidateJobLink creation fails for any reason
- **THEN** no resume_review activity is created (atomic rollback)

### Requirement: stage is derived from activity chain tail
The `stage` field on CandidateJobLink SHALL be automatically updated by the backend whenever an activity is created or updated. It is never written directly by the frontend.

#### Scenario: Stage derived from resume_review
- **WHEN** the last non-note activity is resume_review (pending or completed)
- **THEN** CandidateJobLink.stage is set to `简历筛选`

#### Scenario: Stage derived from phone_screen
- **WHEN** the last non-note activity is phone_screen
- **THEN** CandidateJobLink.stage is set to `电话初筛`

#### Scenario: Stage derived from interview
- **WHEN** the last non-note activity is interview with round=`一面`
- **THEN** CandidateJobLink.stage is set to `一面`

#### Scenario: Stage derived from offer
- **WHEN** the last non-note activity is offer
- **THEN** CandidateJobLink.stage is set to `Offer`

#### Scenario: No non-note activities
- **WHEN** a link has no non-note activities
- **THEN** CandidateJobLink.stage is set to `待处理`

### Requirement: stage_change activity type is retired
The system SHALL NOT create new `stage_change` type activities. Existing stage_change records in the database are preserved but not rendered in the UI.

#### Scenario: Existing stage_change records
- **WHEN** a link has historical stage_change activity records
- **THEN** they are excluded from the activity chain display and chain tail calculation

### Requirement: Data migration for existing links
All existing CandidateJobLinks without a resume_review activity SHALL have one created retroactively.

#### Scenario: Migration for active links
- **WHEN** migration runs on a link with outcome=NULL and no resume_review activity
- **THEN** a resume_review activity is created with status=`completed`, conclusion=`通过`, created_at=link.created_at

#### Scenario: Migration for concluded links
- **WHEN** migration runs on a link with outcome=`rejected` or `withdrawn` and no resume_review activity
- **THEN** a resume_review activity is created with status=`completed`, conclusion=`通过`, created_at=link.created_at
