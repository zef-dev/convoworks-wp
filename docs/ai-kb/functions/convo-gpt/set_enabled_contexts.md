---
id: func-set_enabled_contexts
type: function
name: set_enabled_contexts
package: convo-gpt
function_kind: ChatFunctionElement
tags:
  - function:set_enabled_contexts
  - feature:dynamic-contexts
  - capability:prompt-routing
related_services:
  - crm-manager
updated_at: 2025-11-27
source:
  file: docs/example-services/crm-manager-v1.13.1.json
  fragment_ids:
    - Chat_Context_Dynamic_Contexts
---

### Purpose

Controls which **dynamic contexts** are currently active for the session (e.g., `marketing-automation`, `admin-functions`, `fluent-crm-docs`, `tablepress-docs`).

The GPT model calls this tool to enable or reset contexts before answering domain‑specific questions.

### Parameters

- `contexts` (`array<string>`, optional)  
  List of context identifiers to enable. Empty array means “no extra contexts”.

- `reset` (`boolean`, optional, default `false`)  
  - `true` – overwrite previously enabled contexts.
  - `false` – append to existing ones.

### Behavior

- Logs which contexts are being selected and whether `reset` is used.
- Updates `service.enabled_contexts` (session scope) to either:
  - `data.contexts` (if `reset` is `true`), or
  - `array_unique(array_merge(existing, data.contexts))` (if `reset` is `false`).
- Returns a function result object:

```json
{
  "success": true,
  "enabled_contexts": ["marketing-automation", "admin-functions"]
}
```

### Usage guidelines for GPT

- Always consider calling this tool **before** answering questions that:
  - Involve CRM internals (FluentCRM → enable `fluent-crm-docs` and usually `admin-functions`).
  - Touch TablePress, CPT UI, or low‑level WordPress/PHP functions.
- Keep `marketing-automation` enabled by default for CRM Manager, unless the user explicitly leaves that domain.


