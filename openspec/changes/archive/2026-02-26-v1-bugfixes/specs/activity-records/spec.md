## ADDED Requirements

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
