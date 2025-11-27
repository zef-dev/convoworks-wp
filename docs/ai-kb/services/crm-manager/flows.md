---
id: crm-manager-flows
type: service_flows
service_id: crm-manager
service_version: 40
tags:
  - service:crm-manager
  - flow:chat
  - flow:crm-automation
updated_at: 2025-11-27
source:
  file: docs/example-services/crm-manager-v1.13.1.json
  fragment_ids:
    - Chat_Completion
    - Inc_Check_API_Key
    - Inc_All_Functions
    - Inc_Timezone
---

### Main entry flow – `Home` block

- **Block**: `ConversationBlock` with role `conversation_block`, name `Home`.
- **Includes**:
  - `Inc_Check_API_Key` – verifies that `GPT_API_KEY` is set; otherwise responds with a clear instruction and ends the request.
  - `Inc_All_Functions` – loads all shared function fragments (CRM, LearnDash, utilities, polyfills, conversation helpers).
  - `Inc_Timezone` – reads the WordPress timezone and calls `date_default_timezone_set()` so PHP date math matches the site.
- **Initial state setup**:
  - Resets `service.TOKEN_USAGE` in **session** scope.
  - Sets `service.enabled_contexts` to `["marketing-automation"]` in **session** scope.
  - Picks a random `WELCOME` message using `ElementRandomizer` and stores it as a `service` request param.
  - Wraps `WELCOME` into a structured `message` (`role: assistant`, `content: WELCOME`) and registers it into `messages` via `register_convo_message(message)`.
- **Response**:
  - Returns a `TextResponseElement` that speaks the current `message["content"]` value to the user.

### Chat turn flow – `Chat App` processor

- **Processor**: `SimpleProcessor` named `Chat App` inside the `Home` block.
- **Request filters**: `NopRequestFilter` – matches any text request.
- **OK flow**:
  - Re‑includes the same three infra fragments: `Inc_Check_API_Key`, `Inc_All_Functions`, `Inc_Timezone`.
  - Builds `user_message` from `request.text` (`role: user`, `content: trimmed text`) and appends it to `messages` via `register_convo_message(user_message)`.
  - Loads the current WordPress user into `service.user` and calls `set_time_limit(MAX_EXECUTION_TIME)`.
  - Invokes the `Chat_Completion` fragment to perform the GPT call and handle its result.

### GPT completion flow – `Chat_Completion` fragment

- **Core element**: `\\Convo\\Gpt\\Pckg\\ChatCompletionV2Element`.
- **Configuration**:
  - `api_key`: `${GPT_API_KEY}`.
  - `apiOptions`: `${DEFAULT_AGENT_SETTINGS}` (model, temperature, max tokens).
  - `max_func_result_tokens`: `${MAX_FUNCTION_RESULT_SIZE}`.
- **Message pipeline**:
  - **System messages**:
    - `Chat_Context_Main_Prompt` – defines the assistant’s role and communication rules.
    - Conditional admin context fragments for administrators (system info, dynamic contexts, FluentCRM/TablePress docs, marketing automation rules, admin functions).
  - **History messages**:
    - `SimpleMessagesLimiterElement` reads `get_current_convo()` via `ConversationMessagesElement`, trims to token limits, and writes the truncated collection back to `service.messages` when needed.
- **Post‑completion (`new_message_flow`)**:
  - If the last message is from the assistant:
    - Increments `TOKEN_USAGE["total"]` by `status.response.usage.total_tokens`.
    - Logs current usage.
  - If the last message contains `tool_calls`:
    - Logs each tool call (id, function name, arguments).
  - If the last message is from a `tool`:
    - Logs tool call id and content.
  - Otherwise:
    - Outputs the assistant message content via `TextResponseElement`.
  - In all cases:
    - Registers `status.last_message` into `service.messages` with `register_convo_message(status.last_message)`, persisting it into the conversation CPT.


