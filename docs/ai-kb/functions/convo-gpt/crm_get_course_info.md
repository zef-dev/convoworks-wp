---
id: func-crm_get_course_info
type: function
name: crm_get_course_info
package: convo-gpt
function_kind: ChatFunctionElement
tags:
  - function:crm_get_course_info
  - integration:fluentcrm
  - integration:learndash
  - domain:marketing-automation
  - capability:course-briefing
related_services:
  - crm-manager
updated_at: 2025-11-27
source:
  file: docs/example-services/crm-manager-v1.13.1.json
  fragment_ids:
    - Chat_Context_CRM_Automation
---

### Purpose

Loads a **comprehensive snapshot** of a LearnDash course and all CRM assets related to it:

- Course basics (title, schedule, short code / tag extracted from title).
- Matching FluentCRM **tags**, **lists**, **email templates**, **campaigns**, and **smart links**.
- Matching **TablePress** table, if any.

It is the main building block behind the “Initial Briefing” described in the marketing‑automation context.

### Parameters

- `course_id` (`number`, required)  
  The LearnDash course ID to inspect.

### Return value

Returns a structured object, built by the underlying NamedFunction implementation, roughly of the form:

```json
{
  "course_tag": "AD0104",
  "tag_prefix": "AD",
  "course": { "...": "..." },
  "tags": [ { "...": "..." } ],
  "lists": [ { "...": "..." } ],
  "templates": [ { "...": "trimmed HTML content..." } ],
  "campaigns": [ { "...": "trimmed email_body..." } ],
  "smart_links": { "...": "..." },
  "tablepress": { "...": "..." }
}
```

> Templates and campaigns have their long HTML bodies trimmed using the `trim_templates` / `trim_template_content` helpers so the object stays token‑friendly.

### Internal behavior (summary)

The ChatFunction delegates to the NamedFunction `crm_get_course_info(course_id)` in `Functions_Common`, which:

1. Loads the course via `ld_get_course_by_id(course_id)`.
2. Extracts the short code from the course title (`extract_tag_from_title()`), and a tag prefix for families.
3. Finds:
   - Matching tags (`crm_find_tags(prefix)`).
   - Matching lists (`crm_find_lists(course_tag)`).
   - Email templates (`crm_find_email_templates(course_tag)`).
   - Campaigns (`crm_find_campaigns(course_tag)`).
   - Smart link (`crm_find_smartlink(course_tag)`).
   - TablePress table (`crm_find_table(course_tag)`).
4. Trims long HTML content on templates and campaigns.
5. Returns the aggregated object as `function_result`.

### Typical usage in GPT

- After the user selects or mentions a course (by name or short code), call:

```json
{
  "course_id": 1234
}
```

- Then:
  - Present a human‑readable briefing (course details + assets found/missing).
  - Warn about duplicates or missing CRM pieces before proposing new campaigns.


