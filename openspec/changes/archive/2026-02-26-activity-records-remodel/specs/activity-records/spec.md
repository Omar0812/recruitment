## ADDED Requirements

### Requirement: Activity records support multiple types
The system SHALL store all candidate lifecycle events in a single `activity_records` table with a `type` field distinguishing: `interview`, `phone_screen`, `note`, `offer`, `stage_change`.

#### Scenario: Creating an interview activity
- **WHEN** user saves a face evaluation form
- **THEN** an activity record is created with type=`interview`, linked to the current link_id and current stage

#### Scenario: Creating a phone screen activity
- **WHEN** user saves a phone screen form
- **THEN** an activity record is created with type=`phone_screen` with actor, conclusion, comment fields

#### Scenario: Creating a note activity
- **WHEN** user saves a note
- **THEN** an activity record is created with type=`note` with only comment field required

#### Scenario: Creating an offer activity
- **WHEN** user saves an offer record
- **THEN** an activity record is created with type=`offer` with salary and start_date fields

#### Scenario: Stage change is recorded
- **WHEN** user changes the stage via the stage dropdown
- **THEN** an activity record is created with type=`stage_change`, from_stage and to_stage fields populated, atomically in the same transaction as the stage update

### Requirement: Activity records lock stage at creation
Each activity record SHALL store the `stage` value at the time of creation. This value is immutable after creation.

#### Scenario: Stage locked on creation
- **WHEN** an activity record is created while candidate is in stage "面试"
- **THEN** the record's stage field is set to "面试" and cannot be changed

### Requirement: Activity records API
The system SHALL expose `/api/activities` endpoints replacing `/api/interviews`.

#### Scenario: List activities for a link
- **WHEN** GET `/api/activities?link_id={id}` is called
- **THEN** all activity records for that link are returned, ordered by created_at ascending

#### Scenario: Create activity
- **WHEN** POST `/api/activities` is called with valid type and link_id
- **THEN** activity record is created and returned

#### Scenario: Update activity
- **WHEN** PATCH `/api/activities/{id}` is called
- **THEN** mutable fields are updated (stage and type are immutable)
