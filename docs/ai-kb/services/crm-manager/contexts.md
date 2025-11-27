---
id: crm-manager-contexts
type: service_contexts
service_id: crm-manager
service_version: 40
tags:
  - service:crm-manager
  - context:dynamic
  - context:marketing-automation
  - context:admin-functions
  - context:fluentcrm-docs
  - context:tablepress-docs
updated_at: 2025-11-27
source:
  file: docs/example-services/crm-manager-v1.13.1.json
  fragment_ids:
    - Chat_Context_Main_Prompt
    - Chat_Context_System_Information
    - Chat_Context_Dynamic_Contexts
    - Chat_Context_CRM_Automation
    - Chat_Context_Fluent_CRM_Docs
    - Chat_Context_TablePress_Docs
    - Chat_Context_Functions
---

### Dynamic context model

The CRM Manager service uses a **dynamic context** mechanism to inject additional system‑level instructions and tools depending on what the user is doing.

- Active contexts are stored in `service.enabled_contexts` (session scope).
- The default context is `marketing-automation`, set in the `Home` block.
- The GPT model can enable or reset contexts at runtime via the `set_enabled_contexts` tool.
- At completion time, conditional `IfElement`s include extra fragments based on `enabled_contexts`, enriching the system prompt.

### Core contexts

- **`marketing-automation`**
  - Default and most important context.
  - Describes how marketing automation is implemented for the academy:
    - LearnDash course short codes (e.g., `AD0104`) used across tags, lists, campaigns and templates.
    - FluentCRM campaign naming and scheduling rules, including resend chains and Advanced Filters.
    - Expectations for “initial briefing” (what to check and report when a course is selected).
  - Should generally stay enabled for the whole session.

- **`admin-functions`**
  - Provides low‑level access to WordPress/PHP/REST via tools like:
    - `rest_do_request`
    - `wp_remote_request`
    - `call_user_func_array`
  - Intended for advanced diagnostics or system‑level operations when no higher‑level tool exists.

- **`fluent-crm-docs`**
  - Injects long‑form FluentCRM REST documentation (contacts, lists, tags, templates, campaigns).
  - Helps the model reason about available endpoints and fields when building or debugging campaign logic.

- **`tablepress-docs`**
  - Explains how TablePress table IDs relate to WordPress posts and how to resolve them.
  - Important for scenarios where email templates embed TablePress tables.

### Context control tool – `set_enabled_contexts`

- Implemented as a `ChatFunctionElement` in `Chat_Context_Dynamic_Contexts`.
- Parameters:
  - `contexts` (array of strings) – contexts to enable.
  - `reset` (boolean, default `false`) – whether to replace or append contexts.
- Behavior:
  - Logs selected contexts and the `reset` flag.
  - Updates `service.enabled_contexts`:
    - If `reset` is `true` → `enabled_contexts = contexts`.
    - Otherwise → `enabled_contexts = array_unique(enabled_contexts ∪ contexts)`.
  - Returns a function result of the form: `{ "success": true, "enabled_contexts": [...] }`.


