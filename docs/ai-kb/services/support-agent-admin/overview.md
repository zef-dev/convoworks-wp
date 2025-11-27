---
id: support-agent-admin-overview
type: service_overview
service_id: support-agent-admin
service_version: 40
name: Support Agent - Admin
tags:
  - service:support-agent-admin
  - package:convo-gpt
  - package:convo-core
  - package:convo-wp-core
  - package:convo-wp-hooks
  - package:convo-api-builder
  - package:convo-appointments
  - domain:customer-support
  - integration:fluent-support
  - integration:pinecone
  - platform:wordpress
updated_at: 2025-11-27
source:
  file: docs/example-services/support-agent-admin-v2.05.json
  fragment_ids: []
---

### What this service does

The **Support Agent - Admin** service orchestrates an AI-powered support workflow around the Fluent Support helpdesk on an astrology-focused WordPress site.  
It automatically generates ticket responses with GPT, schedules them as a custom post type for later sending, notifies administrators by email with approve/edit links, and finally posts approved replies back into Fluent Support when their scheduled time arrives.

In addition, it exposes an internal admin chat interface where developers can test the system, inspect scheduling/indexing behavior, call diagnostic tools, and manage background processes such as ticket indexing into Pinecone and scheduled-response processing.

### Key technical characteristics

- Uses `\\Convo\\Gpt\\Pckg\\ChatCompletionV2Element` as the main chat driver with simple history limiting via `\\Convo\\Gpt\\Pckg\\SimpleMessagesLimiterElement`.
- Persists conversation messages in `service.messages` (session scope) and drives a React/Convo Chat style frontend via `TextResponseElement`.
- Integrates with **Fluent Support** in two ways:
  - Direct model access (`fs_get_ticket`, `fs_get_customer`, `fs_add_response`) and Fluent Support APIs (`FluentSupportApi`) for loading tickets/customers and posting responses.
  - WordPress actions (`fluent_support/ticket_created`) to enqueue async ticket handling via Action Scheduler.
- Manages AI-generated responses as a dedicated CPT (`CPT_SCHEDULED_REPLY`) with meta fields like `schedule_status`, `ticket_id`, `time_scheduled`, and exposes:
  - Admin edit view URLs (`get_edit_response_url`, `get_view_response_url`).
  - Public approval URL (`get_approve_response_url`) implemented via the `convo-api-builder` API platform.
- Implements a RAG layer on top of **Pinecone**:
  - Embeds ticket content with `\\Convo\\Gpt\\Pckg\\EmbeddingsElement` and stores vectors under the `tickets` namespace.
  - Provides search (`search_indexed_tickets`) and batched indexing (`index_tickets`, `index_ticket`) functions with `_index_tickets_last_id` state persisted in a WP option.
- Uses Action Scheduler polyfills (`as_schedule_recurring_action`, `as_next_scheduled_action`, etc.) to manage:
  - `convo_index_new_tickets` – periodic indexing of newly closed tickets.
  - `convo_check_scheduled_responses` – periodic dispatch of approved, due responses.
- Provides guardrails and diagnostics:
  - `Inc_Check_API_Key` fragment to fail fast when `GPT_API_KEY` is empty.
  - Rich system prompts describing the site, environment, schedulers, and response model.
  - Test utilities like `perform_test`, `test_email`, and a general `call_user_func_array` tool for controlled introspection of the live WP/PHP environment.


