---
id: func-crm_create_campaign_from_template
type: function
name: crm_create_campaign_from_template
package: convo-gpt
function_kind: ChatFunctionElement
tags:
  - function:crm_create_campaign_from_template
  - integration:fluentcrm
  - domain:marketing-automation
  - capability:campaign-create
related_services:
  - crm-manager
updated_at: 2025-11-27
source:
  file: docs/example-services/crm-manager-v1.13.1.json
  fragment_ids:
    - Chat_Context_CRM_Automation
---

### Purpose

Creates a new **FluentCRM campaign** from an existing email template and optionally applies overrides to the newly created campaign.

Internally, it:

- Fetches the template via `/fluent-crm/v2/templates/{id}`.
- Builds a default settings object (based on `DEFAULT_SETTINGS` in `Functions_Fluent_CRM` plus the template layout).
- Creates a FluentCRM `Campaign` model with that content.
- Optionally calls `crm_update_campaign()` with extra `data` to adjust title, subject, settings, filters, etc.

### Parameters

- `template_id` (`integer`, required)  
  ID of the FluentCRM email template post to base the campaign on.

- `new_title` (`string`, required)  
  Title of the new campaign (e.g., `Curso Astrología Dracónica – AD0104 – Sel_15d – Registered`).

- `data` (`object`, optional)  
  Fields to override after campaign creation, for example:
  - `title`
  - `email_subject`
  - `status`
  - `email_pre_header`
  - `email_body`
  - `design_template`
  - `settings` (including `sending_filter`, `advanced_filters`, `dynamic_segment`, `subscribers`, `scheduled_at`, etc.).

### Return value

Returns the **final campaign object** after overrides, suitable for logging or further inspection in GPT.

### Typical usage in GPT

- When user confirms a campaign plan for a LearnDash course:
  1. Pick the base template by tag/course code.
  2. Call `crm_create_campaign_from_template` with:
     - `template_id` – template ID.
     - `new_title` – final campaign title.
     - `data.settings` – recipient filter (`dynamic_segment`, `advanced_filters`, or `list_tag`) and scheduling (`scheduled_at`, `status`).
  3. Show the created campaign’s `id`, `title`, `scheduled_at`, `settings.sending_filter`, and `recipients_count`.


