## ADDED Requirements

### Requirement: Timeline groups activities by stage
The in-progress page expanded row and candidate profile pipeline tab SHALL render activities grouped by stage in chronological order.

#### Scenario: Multiple stages with activities
- **WHEN** a candidate has activities across multiple stages
- **THEN** activities are displayed in stage groups, each group labeled with the stage name, in the order stages were entered

#### Scenario: Stage with no activities
- **WHEN** a candidate is in a stage with no activity records yet
- **THEN** the current stage group is shown with an empty state and an "add activity" prompt

#### Scenario: Stage change activity in timeline
- **WHEN** a stage_change activity exists
- **THEN** it is rendered as a transition marker between stage groups (e.g., "→ 推进到 面试")

### Requirement: Timeline is read-only in candidate profile pipeline tab
The candidate profile pipeline tab SHALL show the activity timeline in read-only mode with no action buttons.

#### Scenario: Viewing pipeline tab
- **WHEN** user views the pipeline tab on a candidate profile
- **THEN** all activities are shown read-only with a "→ 前往进行中页操作" link

### Requirement: Timeline shows add button only for current stage
The in-progress page expanded row SHALL only show an "add activity" button for the candidate's current stage group.

#### Scenario: Adding activity to current stage
- **WHEN** user clicks "+ 添加" in the current stage group
- **THEN** an activity type selector appears with options: 面试、电话初筛、备注、Offer

#### Scenario: Past stage has no add button
- **WHEN** user views a past stage group
- **THEN** no add button is shown (read-only)
