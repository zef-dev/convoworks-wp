---
id: ai-kb-service-analysis-prompt
type: meta
tags:
  - ai-kb
  - prompts
updated_at: 2025-11-27
---

### Convoworks AI KB – Service Analysis Prompt

Use this prompt to generate a **service analysis folder** (overview / flows / contexts) for any Convoworks service JSON, compatible with the `docs/ai-kb/services/` structure.

You’ll typically only replace the placeholders (`{{...}}`).

```text
You are helping me document a Convoworks WP service so it can be indexed in a vector database and used by an AI assistant.

I will give you:
- The **raw Convoworks service JSON**.
- The **service_id** and **convo_service_version**.
- The **relative path** where I want the docs created, inside `docs/ai-kb/services/`.

Your task is to:
1. Understand the service structure and main purpose.
2. Generate a small folder of **Markdown documents** for this service with YAML frontmatter, following a fixed layout.

---

## Inputs

- service_id: `{{service_id}}`
- convo_service_version: `{{convo_service_version}}`
- docs_root: `docs/ai-kb/services/{{service_id}}/`
- source_json_path: `{{relative_path_to_service_json}}`

- Service JSON:
{{service_json}}

---

## Output requirements

Generate the **content** for the following Markdown files (no code execution, just file contents):

1. `{{docs_root}}/overview.md`
2. `{{docs_root}}/flows.md`
3. `{{docs_root}}/contexts.md` (only if the service uses any “context” or system‑prompt fragments; otherwise, omit this file from the output)

For each file:

### 1) `overview.md`

YAML frontmatter (adapt as needed, but keep these keys):

```yaml
---
id: {{service_id}}-overview
type: service_overview
service_id: {{service_id}}
service_version: {{convo_service_version}}
name: {{human_readable_service_name}}
tags:
  - service:{{service_id}}
  # add 3–7 tags like package:..., domain:..., integration:..., platform:...
updated_at: {{today_yyyy_mm_dd}}
source:
  file: {{source_json_path}}
  fragment_ids: []
---
```

Body (short, high signal, no fluff):

- **What this service does**: 1–3 short paragraphs for a human.
- **Key technical characteristics**: bullet list, focusing on:
  - main blocks, platforms, packages (`convo-core`, `convo-gpt`, etc.)
  - important integrations (FluentCRM, LearnDash, WP hooks, etc.)
  - any notable infra/guardrails (API key checks, token limits, persistence).

### 2) `flows.md`

YAML frontmatter:

```yaml
---
id: {{service_id}}-flows
type: service_flows
service_id: {{service_id}}
service_version: {{convo_service_version}}
tags:
  - service:{{service_id}}
  - flow:chat
  # add more flow:* tags as relevant
updated_at: {{today_yyyy_mm_dd}}
source:
  file: {{source_json_path}}
  fragment_ids:
    # list important fragment_ids you describe here, e.g.:
    # - Chat_Completion
    # - Inc_Check_API_Key
---
```

Body:

- **Main entry flow** – describe the primary `ConversationBlock`:
  - role, name
  - which fragments it includes (e.g. API key check, function loaders, timezone)
  - what parameters it initializes
  - what the first response looks like.

- **Turn processing / processors** – for each main `Processor`:
  - which requests it matches (`request_filters`)
  - step‑by‑step: how it transforms `request.text` into params, calls fragments, and produces responses.

- **GPT / core engine fragment(s)** (e.g. `Chat_Completion`):
  - how system + history messages are built
  - how token limiting / truncation works (if present)
  - what happens with the result (tool calls, responses, state updates).

Keep each section short: headings + bullet lists + a few short paragraphs.

### 3) `contexts.md` (only if applicable)

Create this file only if the service uses any system‑level “context” fragments (e.g. dynamic contexts, platform docs, specialized prompts).

YAML frontmatter:

```yaml
---
id: {{service_id}}-contexts
type: service_contexts
service_id: {{service_id}}
service_version: {{convo_service_version}}
tags:
  - service:{{service_id}}
  - context:dynamic
  # add context:* tags as needed
updated_at: {{today_yyyy_mm_dd}}
source:
  file: {{source_json_path}}
  fragment_ids:
    # list context-related fragment_ids, e.g.:
    # - Chat_Context_Main_Prompt
    # - Chat_Context_Dynamic_Contexts
---
```

Body:

- **Dynamic context model**:
  - where active contexts are stored (e.g. `service.enabled_contexts`)
  - any defaults set on startup
  - how/when contexts are changed during a session.

- **Per‑context summaries**:
  - for each logical context (e.g. `marketing-automation`, `admin-functions`, `fluent-crm-docs`):
    - 2–5 lines: what it adds, when it should be enabled.

- **Control tools**:
  - briefly document any ChatFunctionElements used to manage contexts (e.g. `set_enabled_contexts`):
    - parameters, behavior, typical usage.

---

## Formatting rules

- Use **markdown** with `###` headings; no `#` headings.
- All code-like names (files, fragments, functions, classes) in backticks: e.g. `Chat_Completion`, `\\Convo\\Gpt\\Pckg\\ChatCompletionV2Element`.
- Frontmatter must be valid YAML and the first thing in the file.
- Be concise; avoid long prose or repeating the raw JSON.

---

## Final answer format

Return a single markdown answer that contains, in order:

1. The complete content of `overview.md`.
2. A separator line `---`.
3. The complete content of `flows.md`.
4. If generated: another separator line `---`.
5. The complete content of `contexts.md` (if applicable).

Do not include any other commentary or explanations outside of the file contents.
```


