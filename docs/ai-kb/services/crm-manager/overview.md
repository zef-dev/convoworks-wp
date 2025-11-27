---
id: crm-manager-overview
type: service_overview
service_id: crm-manager
service_version: 40
name: CRM Manager
tags:
  - service:crm-manager
  - package:convo-gpt
  - package:convo-core
  - package:convo-wp-core
  - domain:marketing-automation
  - integration:fluentcrm
  - integration:learndash
  - platform:wordpress
updated_at: 2025-11-27
source:
  file: docs/example-services/crm-manager-v1.13.1.json
  fragment_ids: []
---

### What this service does

The **CRM Manager** service is a GPT‑powered assistant for a WordPress site running LearnDash and FluentCRM (plus related plugins such as TablePress and CPT UI).  
It helps users:

- Inspect and manage marketing campaigns around LearnDash courses (especially FluentCRM campaigns and resends).
- Check whether all required CRM assets exist for a course (lists, tags, email templates, smart links, TablePress tables).
- Design, confirm and then create or update FluentCRM campaigns according to predefined timing and naming rules.

It runs as a chat‑style service, primarily via the Convo Chat frontend, but reuses generic Convoworks building blocks.

### Key technical characteristics

- Uses `\\Convo\\Gpt\\Pckg\\ChatCompletionV2Element` as the main GPT driver.
- Persists full conversation history into a custom post type (`CPT_CONVERSATIONS`) and reloads it on each turn.
- Implements dynamic “contexts” (e.g., `marketing-automation`, `admin-functions`, `fluent-crm-docs`) that GPT can enable via tools and that inject extra system prompts.
- Integrates deeply with **FluentCRM** via both REST (`/fluent-crm/v2/...`) and its internal Eloquent models.
- Integrates with **LearnDash** via its REST API to locate courses and load their details.
- Uses several guardrails: API‑key check, PHP timezone alignment with the WordPress site, token‑usage tracking, and a global error handler.


