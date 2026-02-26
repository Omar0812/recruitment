## Purpose
定义岗位详情页的展示规范，包括基本信息 tab 和招聘进展 tab。

## Requirements

### Requirement: Job detail pipeline tab is read-only
The recruitment progress tab on the job detail page SHALL display candidates by stage in a read-only format with no action buttons.

#### Scenario: Viewing pipeline tab
- **WHEN** user navigates to a job detail page and clicks the recruitment progress tab
- **THEN** candidates are listed by stage with no move/reject/interview action buttons

#### Scenario: Navigate to in-progress page
- **WHEN** user views a candidate in the pipeline tab
- **THEN** a "→ 进行中" link is shown next to each candidate name, linking to `#/pipeline`

#### Scenario: No kanban route
- **WHEN** user navigates to `#/jobs/pipeline/{id}`
- **THEN** the page shows "页面不存在" (route no longer exists)
