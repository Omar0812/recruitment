## MODIFIED Requirements

### Requirement: Next step selection replaces stage dropdown
After completing the current activity node with conclusion=通过, the system SHALL present a "选择下一步" inline prompt instead of a stage dropdown. Additionally, when an offer activity has conclusion=接受 but the link outcome is still null, the system SHALL display a "确认入职" button to allow the user to complete the hire flow.

#### Scenario: Completing phone_screen with pass
- **WHEN** user marks phone_screen conclusion=通过
- **THEN** activity is saved and UI immediately shows "选择下一步: [面试] [直接Offer]"

#### Scenario: Completing interview with pass
- **WHEN** user marks interview conclusion=通过
- **THEN** activity is saved and UI immediately shows "选择下一步: [下一轮面试] [Offer]"

#### Scenario: Completing any activity with rejection
- **WHEN** user marks any activity conclusion=淘汰
- **THEN** link outcome is set to rejected and candidate is removed from in-progress list

#### Scenario: Skipping a step
- **WHEN** user selects [面试] directly after resume_review without phone_screen
- **THEN** an interview activity is created; phone_screen is simply skipped with no record

#### Scenario: Offer accepted but hire not confirmed
- **WHEN** user expands a candidate row whose tail activity is offer with conclusion=接受 and link outcome is still null
- **THEN** the UI SHALL display a "确认入职" button that triggers the hire confirmation overlay

#### Scenario: Offer accepted and hire overlay cancelled then re-expanded
- **WHEN** user previously accepted an offer, cancelled the hire overlay, and re-expands the candidate row
- **THEN** the "确认入职" button is still visible and functional, allowing the user to complete the hire flow
