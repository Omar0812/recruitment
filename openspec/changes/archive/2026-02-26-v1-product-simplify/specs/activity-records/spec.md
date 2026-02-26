## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Resume review requires actor on completion
The system SHALL require an `actor` (筛选人) field when completing a resume_review activity with conclusion 通过 or 淘汰. The frontend SHALL display an actor input field above the pass/reject buttons.

#### Scenario: Completing resume_review with actor
- **WHEN** user fills in actor="张三" and clicks 通过
- **THEN** the activity is saved with actor="张三" and conclusion="通过"

#### Scenario: Completing resume_review without actor
- **WHEN** user clicks 通过 or 淘汰 without filling in actor
- **THEN** system shows toast "请填写筛选人" and does not submit

## REMOVED Requirements

### Requirement: Creating a phone screen activity
**Reason**: phone_screen is retired. It was functionally identical to interview. Historical records are preserved but no new phone_screen activities can be created.
**Migration**: Users use "面试" (interview) type for all screening and interview activities. Existing phone_screen records remain visible with their original label.

### Requirement: Saving phone_screen form without conclusion
**Reason**: phone_screen type is retired; its conclusion validation requirement is no longer applicable.
**Migration**: No action needed. Interview form validation covers the same scenario.
