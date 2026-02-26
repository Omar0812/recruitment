## ADDED Requirements

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
The system SHALL store all candidate lifecycle events in a single `activity_records` table with a `type` field distinguishing: `resume_review`, `interview`, `phone_screen`, `note`, `offer`. The `stage_change` type is retired and SHALL NOT be created by new code.

#### Scenario: Creating a resume_review activity
- **WHEN** a new CandidateJobLink is created
- **THEN** an activity record is created with type=`resume_review`, status=`pending`, linked to the link_id

#### Scenario: Creating an interview activity
- **WHEN** user completes resume_review or a prior activity and selects "面试" as next step
- **THEN** an activity record is created with type=`interview`, linked to the current link_id

#### Scenario: Creating a phone screen activity
- **WHEN** user completes resume_review or a prior activity and selects "电话初筛" as next step
- **THEN** an activity record is created with type=`phone_screen` with actor, conclusion, comment fields

#### Scenario: Creating a note activity
- **WHEN** user saves a note at any point in the flow
- **THEN** an activity record is created with type=`note` with only comment field; chain state is unaffected

#### Scenario: Creating an offer activity
- **WHEN** user selects "Offer" as next step after completing a prior activity
- **THEN** an activity record is created with type=`offer` with salary and start_date fields

#### Scenario: stage_change type is not created
- **WHEN** any activity is created or updated
- **THEN** no stage_change type activity is created by the system

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
The system SHALL validate that conclusion is not empty before saving activity forms (phone_screen, offer, interview inline form). If conclusion is empty or an empty string, the system SHALL show an error toast and prevent the save.

#### Scenario: Saving phone_screen form without conclusion
- **WHEN** user clicks save on a phone_screen form without selecting a conclusion
- **THEN** system shows toast "请选择结论" and does not submit the API request

#### Scenario: Saving offer form without conclusion
- **WHEN** user clicks save on an offer form without selecting a conclusion
- **THEN** system shows toast "请选择结论" and does not submit the API request

#### Scenario: Saving interview inline form without conclusion
- **WHEN** user clicks save on an interview inline form without selecting a conclusion
- **THEN** system shows toast "请选择结论" and does not submit the API request

#### Scenario: Saving form with valid conclusion
- **WHEN** user clicks save on any activity form with a valid conclusion selected
- **THEN** system submits the API request normally

## REMOVED Requirements

### Requirement: Activity records lock stage at creation
**Reason**: Stage is now derived from the activity chain tail automatically. The `stage` field on ActivityRecord is still stored for historical reference but is auto-populated by the backend, not passed by the frontend.
**Migration**: `ActivityCreate.stage` is now Optional. Backend auto-fills it based on activity type.

### Requirement: Stage change is recorded
**Reason**: stage_change activity type is retired. Stage is now derived from the activity chain tail automatically; no explicit stage_change event is needed.
**Migration**: Existing stage_change records are preserved in the database but excluded from UI rendering and chain calculations.
