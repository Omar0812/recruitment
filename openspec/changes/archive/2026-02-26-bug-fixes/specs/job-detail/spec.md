## MODIFIED Requirements

### Requirement: Job detail pipeline tab is read-only
The recruitment progress tab on the job detail page SHALL display candidates by stage in a read-only format with no action buttons.

#### Scenario: Viewing pipeline tab
- **WHEN** user navigates to a job detail page and clicks the recruitment progress tab
- **THEN** candidates are listed by stage with no move/reject/interview action buttons

#### Scenario: No kanban route
- **WHEN** user navigates to `#/jobs/pipeline/{id}`
- **THEN** the page shows "页面不存在" (route no longer exists)

## REMOVED Requirements

### Requirement: Kanban board view
**Reason**: Replaced by the in-progress page (进行中) which covers all pipeline operations with a better interaction model.
**Migration**: Use `#/pipeline` for all pipeline operations. Job-scoped view available as read-only in job detail page recruitment progress tab.
