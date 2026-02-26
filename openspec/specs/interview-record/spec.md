## Purpose
面试记录已迁移至统一的 activity_records 表，本 spec 记录迁移说明。

## REMOVED Requirements

### Requirement: Interview records stored in interview_records table
**Reason**: Replaced by unified activity_records table which supports multiple activity types and stage-based grouping.
**Migration**: All existing interview_records data is migrated to activity_records with type='interview' at startup. The interview_records table is renamed to interview_records_bak.

### Requirement: /api/interviews endpoints
**Reason**: Replaced by /api/activities endpoints.
**Migration**: Frontend updated to call /api/activities. No external consumers.

## See Also
- `activity-records/spec.md` — unified activity records spec
- `activity-timeline/spec.md` — timeline rendering spec
