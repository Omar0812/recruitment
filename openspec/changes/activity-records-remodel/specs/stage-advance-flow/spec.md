## ADDED Requirements

### Requirement: Stage advance triggers activity creation form
When user advances a candidate to a new stage, the system SHALL automatically suggest creating an activity record for that stage.

#### Scenario: Advancing to a stage containing "面试"
- **WHEN** user selects a stage containing "面试" in the stage dropdown
- **THEN** stage is updated AND an interview activity form is shown pre-filled with the next round name

#### Scenario: Advancing to a stage containing "电话" or "初筛"
- **WHEN** user selects a stage containing "电话" or "初筛"
- **THEN** stage is updated AND a phone_screen activity form is shown

#### Scenario: Advancing to a stage containing "Offer"
- **WHEN** user selects a stage containing "Offer"
- **THEN** stage is updated AND an offer activity form is shown

#### Scenario: Advancing to any other stage
- **WHEN** user selects any other stage
- **THEN** stage is updated AND a note form is shown (skippable)

#### Scenario: User skips activity creation
- **WHEN** user dismisses the activity form after stage advance
- **THEN** stage change is preserved, no activity record is created

### Requirement: Add activity button within current stage
The current stage group in the expanded row SHALL show a "+ 添加" button that opens an activity type selector.

#### Scenario: Selecting activity type
- **WHEN** user clicks "+ 添加" and selects a type
- **THEN** the corresponding form is shown inline

### Requirement: Interview time uses date + time slot selector
Interview scheduled time SHALL use a date picker combined with a time slot dropdown in 15-minute increments.

#### Scenario: Selecting interview time
- **WHEN** user schedules an interview
- **THEN** they see a date input and a time dropdown with options from 08:00 to 22:00 in 15-minute steps
