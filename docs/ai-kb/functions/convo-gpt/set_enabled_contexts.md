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
updated_at: 2025-11-27
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

- Always consider calling this tool **before** answering questions that need a domain-specific prompt (plugin docs, admin internals, a particular automation context).
- Prefer `reset: true` when switching domains so leftover contexts do not keep injecting unrelated instructions.


