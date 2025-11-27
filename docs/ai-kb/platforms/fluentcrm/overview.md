---
id: platform-fluentcrm-overview
type: platform
name: FluentCRM
tags:
  - platform:fluentcrm
  - integration:fluentcrm
  - domain:email-marketing
updated_at: 2025-11-27
source:
  file: docs/example-services/crm-manager-v1.13.1.json
  fragment_ids:
    - Chat_Context_Fluent_CRM_Docs
---

### What FluentCRM is in this context

FluentCRM is the primary **email marketing and CRM system** used by Convoworks services like CRM Manager.

The service interacts with FluentCRM in two ways:

- Via its public REST API (`/wp-json/fluent-crm/v2/...`) for templates, campaigns, lists, and tags.
- Via internal PHP models (e.g., `FluentCrm\\App\\Models\\Campaign`, `Meta`) for advanced operations and performance.

### Core concepts used by Convoworks services

- **Contacts** – subscribers stored in FluentCRM.
- **Tags & Lists** – segmentation primitives used for targeting campaigns.
- **Email Templates** – reusable layouts/content for campaigns and sequences.
- **Campaigns** – one‑off email sends with:
  - Content (subject, pre‑header, body, design template).
  - Recipient selection (lists, tags, dynamic segments, advanced filters).
  - Scheduling (`scheduled_at`, `status`).
- **Dynamic Segments** – saved segments used by `sending_filter = "dynamic_segment"`.
- **Advanced Filters** – powerful AND/OR conditions (tags, lists, WooCommerce, LearnDash, campaign activity) used by `sending_filter = "advanced_filters"`.

### Typical operations from Convoworks

- Search and inspect:
  - Tags and lists (by course code or prefix).
  - Email templates (by course code, usually with “Vendiendo” in the title).
  - Campaigns (by course code, including existing resends or reminders).
- Create or clone:
  - Email templates (via REST or WordPress post APIs).
  - Campaigns from templates, with precise recipient filters and schedules.
- Update:
  - Campaign settings, including advanced filters and `scheduled_at`.
  - Campaign meta (e.g., `_recipient_processed`, `_next_config_step`).

These interactions are encapsulated in the `Functions_Fluent_CRM` helpers and exposed to GPT via chat tools such as `crm_create_campaign_from_template` and `crm_update_campaign`.


