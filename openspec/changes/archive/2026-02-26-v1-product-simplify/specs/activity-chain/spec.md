## MODIFIED Requirements

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
- **THEN** the new activity (interview or offer) is created successfully

### Requirement: stage is derived from activity chain tail
The `stage` field on CandidateJobLink SHALL be automatically updated by the backend whenever an activity is created or updated. It is never written directly by the frontend.

#### Scenario: Stage derived from resume_review
- **WHEN** the last non-note activity is resume_review (pending or completed)
- **THEN** CandidateJobLink.stage is set to `简历筛选`

#### Scenario: Stage derived from phone_screen (historical)
- **WHEN** the last non-note activity is a historical phone_screen record
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

## REMOVED Requirements

### Requirement: phone_screen as valid chain activity type
**Reason**: phone_screen is retired. Only resume_review, interview, offer, and note are valid chain types for new activities.
**Migration**: Historical phone_screen records remain in the chain and are rendered correctly. STAGE_LABEL retains the phone_screen→"电话初筛" mapping for display purposes only.
