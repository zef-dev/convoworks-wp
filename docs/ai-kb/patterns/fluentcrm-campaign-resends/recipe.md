---
id: pattern-fluentcrm-campaign-resends
type: pattern
name: FluentCRM campaigns with resend chains and advanced filters
tags:
  - pattern:fluentcrm-campaign-resends
  - integration:fluentcrm
  - domain:marketing-automation
  - capability:campaign-create
  - capability:campaign-resend
related_services:
  - crm-manager
updated_at: 2025-11-27
source:
  files:
    - docs/example-services/crm-manager-v1.13.1.json
  fragment_ids:
    - Chat_Context_CRM_Automation
    - Functions_Fluent_CRM
---

### When to use

Use this pattern when you want a Convoworks+GPT agent to:

- Create FluentCRM campaigns from templates.
- Schedule them relative to a course or event date.
- Build **resend chains** that target only contacts who did not open the previous campaign, using Advanced Filters.

### High-level idea

- Each campaign is created from an email template and named according to a consistent pattern (including course short code and timing suffix).
- Recipient selection is controlled by `settings.sending_filter`:
  - `dynamic_segment` for registered or free users.
  - `advanced_filters` for paid users or resends.
  - `list_tag` for final reminders.
- For resends, Advanced Filters use a single `no_open` condition referencing the **previous campaign ID**, forming a chain.

### Key functions and components

- Chat tools:
  - `crm_create_campaign_from_template` – create a draft from a template and optional overrides.
  - `crm_update_campaign` – adjust an existing campaign’s fields and `settings`.
  - `crm_get_course_info` – load course plus its related CRM assets (lists, tags, templates, campaigns).
- Named functions (`Functions_Fluent_CRM`):
  - `crm_create_campaign(template_id, title)` – low-level creation from template.
  - `crm_update_campaign(campaign_id, data)` – merge overrides, recalc recipients, handle scheduling hooks.
  - `crm_get_campaign_subscribers(campaign_id, settings)` – compute `recipients_count` from filter settings.
  - `crm_find_segment_dump(id)` – human-readable dynamic segment info for prompts.
- System context:
  - `Chat_Context_CRM_Automation` – defines naming schemes, timing rules, and JSON examples for all three filter types.

### Core JSON structures

#### Dynamic segment filter (registered or free users)

```json
{
  "settings": {
    "sending_filter": "dynamic_segment",
    "dynamic_segment": {
      "id": "9",
      "slug": "custom_segment",
      "uid": "custom_segment_9"
    }
  }
}
```

#### Advanced filters (resends / paid campaigns)

```json
{
  "settings": {
    "sending_filter": "advanced_filters",
    "advanced_filters": [
      [
        {
          "source": ["segment", "tags"],
          "operator": "in",
          "value": ["65"]
        },
        {
          "source": ["segment", "tags"],
          "operator": "not_in",
          "value": ["28"]
        }
      ],
      [
        {
          "source": ["activities", "campaign_email_activity"],
          "operator": "no_open",
          "value": 321
        }
      ]
    ]
  }
}
```

#### List filter (final reminder)

```json
{
  "settings": {
    "sending_filter": "list_tag",
    "subscribers": [
      { "list": "2", "tag": "all" }
    ]
  }
}
```

### Typical flow in GPT

1. Use `crm_get_course_info(course_id)` to understand existing tags, lists, templates and campaigns for a course.
2. Propose a campaign plan (titles, send dates, target groups) and ask the user to confirm.
3. For each campaign:
   - Create it via `crm_create_campaign_from_template` with the chosen template and title.
   - For resends, set `settings.sending_filter = "advanced_filters"` with a **single `no_open` condition** pointing to the `id` of the previous campaign.
4. For scheduled sends:
   - Set `data.scheduled_at` to the local site time (`YYYY-MM-DD HH:MM:SS`) and `data.status = "pending-scheduled"`.
   - Let `crm_update_campaign` handle `sending_type = "schedule"` and hook calls.


