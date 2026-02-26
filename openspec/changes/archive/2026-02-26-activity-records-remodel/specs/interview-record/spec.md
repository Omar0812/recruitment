## REMOVED Requirements

### Requirement: Interview records stored in interview_records table
**Reason**: Replaced by unified activity_records table which supports multiple activity types and stage-based grouping.
**Migration**: All existing interview_records data is migrated to activity_records with type='interview' at startup. The interview_records table is renamed to interview_records_bak and dropped after verification.

### Requirement: /api/interviews endpoints
**Reason**: Replaced by /api/activities endpoints.
**Migration**: Frontend updated to call /api/activities. No external consumers.
