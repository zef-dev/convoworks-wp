---
id: support-agent-admin-flows
type: service_flows
service_id: support-agent-admin
service_version: 40
tags:
  - service:support-agent-admin
  - flow:chat
  - flow:ticket-automation
  - flow:scheduled-responses
  - flow:rag
updated_at: 2025-11-27
source:
  file: docs/example-services/support-agent-admin-v2.05.json
  fragment_ids:
    - Chat_Completion
    - Inc_Check_API_Key
    - Inc_All_Functions
    - Chat_Context_Main_Prompt
    - Chat_Context_Website
    - Chat_Context_System_Information
    - Chat_Context_Scheduled_Processes
    - Chat_Context_Scheduled_Responses
    - Chat_Context_Functions
---

### Main entry flow – `Home` block

- **Block**: `\\Convo\\Pckg\\Core\\Elements\\ConversationBlock` with role `conversation_block`, name `Home`.
- **Infrastructure fragments**:
  - `Inc_All_Functions` – runs `RunOnceElement` to load all function fragments:
    - Indexing (`Inc_Functions`, `Inc_DB_Functions`, `Inc_Functions_State`).
    - Misc/core ticket handling and RAG (`Misc_Functions`).
    - Action Scheduler polyfills (`b24f3dc4-1f96-4a8e-b5d3-e8be9f612e51`).
    - Fluent Support helpers (`Inc_FS_Functions`).
    - Scheduled-response helpers (`Inc_Schedule_Response_Functions`).
    - URL helper functions (`Inc_Url_Functions`).
  - `Inc_Check_API_Key` – validates `GPT_API_KEY` and short-circuits with a clear admin message if missing.
- **Request pre-processing**:
  - Reads the current `HTTP_REFERER`, parses query params via `parse_url_params`, and infers `convo_mode` (e.g. `edit_response`) and `response_id`.
  - If `convo_mode === 'edit_response'` and the scheduled reply `schedule_status` is `NEW`:
    - Loads the scheduled response post and its `ticket_id`.
    - Prepares an assistant `message` containing the current response body and a short instruction for what to edit.
  - Otherwise:
    - Uses `ElementRandomizer` to pick a `WELCOME` message and sets it as the initial assistant `message`.
- **Session bootstrap & first reply**:
  - Stores `messages = [message]` in **session** `service` scope.
  - Responds with `TextResponseElement` echoing `messages[count(messages)-1]["content"]`.

### Chat turn flow – `Chat App` processor

- **Processor**: `\\Convo\\Pckg\\Core\\Processors\\SimpleProcessor` named `Chat App` inside `Home`.
- **Request filters**:
  - Single `NopRequestFilter` (`empty: match`) – effectively matches any incoming text request from the chat frontend.
- **OK flow**:
  - Re-includes `Inc_All_Functions` and `Inc_Check_API_Key` on every turn to guarantee helper functions and guardrails are available.
  - Builds `user_message` from `request.text` (trimmed), sets:
    - `user_message["role"] = "user"`.
    - `user_message["content"] = trimmed input`.
  - Appends `user_message` to `service.messages` in session scope via `array_merge(messages, [user_message])`.
  - Invokes the `Chat_Completion` fragment to perform the GPT call and handle results.

### GPT completion flow – `Chat_Completion` fragment

- **Core element**: `\\Convo\\Gpt\\Pckg\\ChatCompletionV2Element` named `Chat Completion`.
- **API configuration**:
  - `api_key`: `${GPT_API_KEY}`.
  - `apiOptions`: `{ model: DEFAULT_MODEL, temperature: DEFAULT_TEMPERATURE, max_tokens: DEFAULT_MAX_TOKENS }`.
- **System and context messages** (via `message_provider`):
  - `Chat_Context_Main_Prompt` – defines the assistant as an advanced WP/PHP-integrated AI with logging and function-execution guidelines.
  - `Chat_Context_Website` – describes the astrology site, overall automation goal, and high-level RAG approach.
  - `Chat_Context_System_Information` – injects current user info, current date/time, basic site info (`home_url`, `ABSPATH`, theme, DB tables).
  - `Chat_Context_Scheduled_Processes` – documents Action Scheduler-based background processes, their current enabled/disabled state, and exposes:
    - `set_indexing_scheduler_enabled(enabled: bool)`.
    - `set_responses_scheduler_enabled(enabled: bool)`.
  - `Chat_Context_Scheduled_Responses` – explains the scheduled-response CPT, status fields, and helper URLs, and exposes:
    - `update_scheduled_response(response_id, content)`.
    - `get_scheduled_response_id(ticket_id)`.
  - `Chat_Context_Functions` – exposes higher-level tools:
    - `perform_test` – multi-mode test harness for ticket handling, scheduling, and time formatting.
    - `generate_ticket_response`, `handle_ticket`, `generate_response` – orchestrate GPT-based ticket or free-form responses.
    - `search_indexed_tickets`, `index_tickets`, `index_ticket` – RAG/search/indexing against Pinecone.
    - `call_user_func_array` – generic, strongly-typed gateway into WP/PHP functions and methods.
- **History and token limiting**:
  - `SimpleMessagesLimiterElement` wraps `ConversationMessagesElement(messages)`:
    - Enforces `MAX_MESSAGES` and truncates to `TRUNCATE_TO`.
    - Writes the truncated collection back to `service.messages` via its `truncated_flow`.
- **Result handling (`new_message_flow`)**:
  - If `status.last_message.tool_calls` is present:
    - Optionally echoes any `content` as `TextResponseElement`.
    - Logs each tool call’s id, function name, and arguments for operators.
  - Else if `status.last_message.role === 'tool'`:
    - Logs tool-call id and content (no direct user response).
  - Else (normal assistant message):
    - Replies with `TextResponseElement` showing `status.last_message.content`.
  - In all cases:
    - Appends `status.last_message` into `service.messages[ count(messages) ]` in session scope for subsequent turns.

### Hook-driven flows – `hook_handler` block

- **Block**: `SpecialRoleProcessorBlock` with role `hook-handler`, block_id `hook_handler`.
- **Processors**:
  - `admin_notices`:
    - Logs that the `admin_notices` hook fired.
    - Shows a success or warning notice in the WP admin based on `$_GET['convo_mb_notice']` (`response_approved` or `invalid_status`).
  - `fluent_support/ticket_created`:
    - Includes the polyfill fragment.
    - Extracts the Fluent Support ticket object from `request.getArgument(0)` and converts it to array.
    - Enqueues async `convo_handle_new_ticket` via `as_enqueue_async_action(SCHEDULE_GROUP)`.
  - `convo_handle_new_ticket` (Action Scheduler worker):
    - Loads the ticket and customer via Fluent Support helper functions.
    - Calls the high-level `handle_ticket(ticket, customer)` function, which:
      - Builds GPT prompt content from the ticket and customer.
      - Generates a structured GPT response via `generate_response_struct`.
      - Schedules a CPT-based response (`schedule_response`) with a random future delay.
      - Composes an HTML email including ticket info, GPT answer or error, and admin `APPROVE`/`EDIT` links.
      - Sends notification via `send_email_notification`.
  - `convo_check_scheduled_responses`:
    - Reuses the shared fragment and calls `check_scheduled_responses()`:
      - Finds CPT responses with `schedule_status = APPROVED` and `time_scheduled < now`.
      - Marks them as `PROCESS`, posts replies into Fluent Support via `fs_add_response`, marks them `SENT`, and emails a confirmation summary per ticket.
  - `convo_index_new_tickets`:
    - Calls the indexing function:
      - Loads closed Fluent Support tickets with id > last indexed id.
      - Embeds and upserts each ticket into Pinecone, updating `_index_tickets_last_id` as it goes.

### Public API approval flow – `API` block (`api-handler` role)

- **Block**: `SpecialRoleProcessorBlock` with role `api-handler`, block_id `API`.
- **Processor**:
  - `SimpleProcessor` with an `ApiRouteFilter`:
    - Matches `GET /approve/{responseId}` under the `convo-api-builder` platform.
  - Flow:
    - Includes `Inc_All_Functions`.
    - Reads `responseId` from the route (`result.responseId`), loads its current `schedule_status`.
    - If no status:
      - Returns `404` JSON: `{"message": "Response not found"}`.
    - Else if status is not `NEW`:
      - Builds an admin edit URL with `convo_mb_notice=invalid_status` and returns `302` redirect.
    - Else (valid NEW response):
      - Builds admin view URL with `convo_mb_notice=response_approved`.
      - Calls `update_scheduled_response_status(response_id, 'APPROVED', 'Approved by email link')`.
      - Invokes `check_scheduled_responses()` immediately to send any due replies.
      - Returns `302` redirect to the admin view URL, which in turn shows a success notice via the admin hook flow.


