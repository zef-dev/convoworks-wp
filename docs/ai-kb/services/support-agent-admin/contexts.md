---
id: support-agent-admin-contexts
type: service_contexts
service_id: support-agent-admin
service_version: 40
tags:
  - service:support-agent-admin
  - context:static
  - context:system-info
  - context:scheduled-processes
  - context:scheduled-responses
  - context:functions
updated_at: 2025-11-27
source:
  file: docs/example-services/support-agent-admin-v2.05.json
  fragment_ids:
    - Chat_Context_Main_Prompt
    - Chat_Context_Website
    - Chat_Context_System_Information
    - Chat_Context_Scheduled_Processes
    - Chat_Context_Scheduled_Responses
    - Chat_Context_Functions
---

### Context model

The Support Agent - Admin service uses a **fixed set of context fragments** to inject rich, system-level information and capabilities into every GPT call.  
Unlike fully dynamic context systems, this service does not toggle contexts on and off per session; instead, it always includes the same context fragments in a specific order, but some of them compute values dynamically at request time (user info, dates, scheduler status).

Together these contexts explain the environment (site purpose, WordPress system info, current user and time), describe the automated support pipeline (scheduled processes and responses), and publish a toolbox of higher-level ChatFunctionElements that the model can safely call.

### `Chat_Context_Main_Prompt`

- Establishes the assistant as an advanced AI tightly integrated with the WordPress and PHP ecosystem.
- Emphasizes:
  - Efficient use of contextual information and history.
  - Concise but complete communication, with awareness of token limits.
  - Logging of important IDs, URLs, and paths in responses.
  - Safe, deliberate use of PHP/WordPress functions with explicit error handling.
  - Special note about JSON handling (avoid unnecessary `json_decode()`/array slicing of JSON responses).
- Sets the tone and operating rules for all subsequent interactions.

### `Chat_Context_Website`

- Describes the website as an astrology-focused academy where the goal is to build an automated AI support system that resolves ~80% of tickets.
- Explains that support automation is implemented through scheduled processes and WordPress hooks.
- Clarifies that the system uses a RAG approach:
  - Previously answered tickets with `status = closed` are indexed in Pinecone.
  - The function `index_tickets` maintains `_index_tickets_last_id` in a WordPress option, so indexing can resume incrementally.
- Instructs the model that its role is to **assist developers in testing** the system, not to act as a public-facing end-user support agent.

### `Chat_Context_System_Information`

- Dynamically enriches the prompt with runtime information:
  - Current logged-in WordPress user (id, name, email).
  - Human-readable current date and tomorrow’s date.
  - Current time on the server.
- Adds WordPress system details:
  - `home_url`, `ABSPATH`, site name via `wp_call_user_func`.
  - PHP version and `$wpdb` prefix.
  - Active theme slug.
  - Lists key Fluent Support DB tables (without prefix), twice for emphasis.
- This context ensures GPT has enough situational awareness to reason about environment-specific issues and reference correct table names or URLs when needed.

### `Chat_Context_Scheduled_Processes`

- Documents the two critical background processes that must run for correct behavior:
  - `convo_check_scheduled_responses` – sends approved, due scheduled responses and is marked as enabled/disabled via `as_next_scheduled_action`.
  - `convo_index_new_tickets` – indexes newly closed tickets into Pinecone.
- At runtime it computes:
  - `responses_scheduler` = next scheduled timestamp for `convo_check_scheduled_responses`.
  - `indexing_scheduler` = next scheduled timestamp for `convo_index_new_tickets`.
- Exposes two management tools as `ChatFunctionElement`s:
  - `set_indexing_scheduler_enabled(enabled: bool)`:
    - Reads current scheduled state with `as_next_scheduled_action('convo_index_new_tickets')`.
    - When enabling and no job exists, schedules a recurring 7-day action via `as_schedule_recurring_action`.
    - When disabling and a job exists, unschedules all via `as_unschedule_all_actions`.
  - `set_responses_scheduler_enabled(enabled: bool)`:
    - Same pattern but for `convo_check_scheduled_responses` with a 5-minute recurrence.
- The context text explicitly reports whether each scheduler is currently enabled or disabled so GPT can decide when to call these tools.

### `Chat_Context_Scheduled_Responses`

- Explains how AI-generated replies are stored and managed:
  - CPT slug: `${CPT_SCHEDULED_REPLY}` (e.g., `mb_scheduled_reply`), status `private`.
  - Response HTML is stored in `post_content`.
  - Meta fields:
    - `schedule_status` – `NEW`, `APPROVED`, or `SENT`.
    - `schedule_status_message` – optional note.
    - `ticket_id` – Fluent Support ticket id.
    - `time_scheduled` – UNIX timestamp.
- Provides helper URLs:
  - `get_view_response_url(response_id)` – admin edit link with optional notice flag.
  - `get_ticket_url(ticket_id)` – Fluent Support ticket admin view.
- Exposes:
  - `update_scheduled_response(response_id, content)`:
    - Updates `post_content` and sets `schedule_status = APPROVED` with a fixed status message.
    - Returns `true`/`false` based on `WpInsertPostElement` success.
  - `get_scheduled_response_id(ticket_id)`:
    - Looks up the scheduled response CPT for a ticket (any `private/publish` status) and returns its ID or `null`.
- This context gives GPT a clear mental model of how approval and editing flows work and which IDs/URLs to log.

### `Chat_Context_Functions`

- Declares a toolbox of higher-level functions that operate on tickets, RAG, and infrastructure rather than raw PHP:
  - `perform_test` – runs pre-wired scenarios (`handle_ticket`, `schedule_response`, `time_format`) using hard-coded ticket/customer ids for smoke testing.
  - `generate_ticket_response(ticket_id, test_mode)` – retrieves ticket & customer, composes a compact `gpt_content`, calls `generate_response_struct`, and returns the structured result.
  - `handle_ticket(ticket_id)` – wrapper that:
    - Loads Fluent Support ticket/customer via `FluentSupportApi`.
    - Delegates to the lower-level `handle_ticket(ticket, customer)` function in `Misc_Functions`.
  - `generate_response(query, test_mode)` – free-form question responder using the same RAG + structured answer approach.
  - `search_indexed_tickets(query, limit)` – searches Pinecone and returns a normalized list of matching tickets with ids, titles, content, score, and timestamps.
  - `index_tickets(limit)` / `index_ticket(ticket_id)` – batch or single-ticket indexing, including metadata and last-indexed-id tracking.
  - `call_user_func_array(callback, args)` – carefully-wrapped gateway into PHP/WordPress and even object methods (including `$wpdb`), always returning a JSON object with `function_result` (and `error` on exceptions).
- By centralizing these tools in a dedicated context fragment, GPT can plan higher-level operations (e.g., “index 5 more tickets, then search”, “test handle_ticket flow”) without manipulating low-level DB queries directly.

### Practical notes – `SetParamElement` and `call_user_func_array`

- **Working with arrays in `SetParamElement`**:
  - When building arrays, you usually **reassign the whole array**, e.g.:
    - `properties: { "messages": "${array_merge(messages, [user_message])}" }` (creates a **new** array with the appended item).
  - To build arrays incrementally with numeric keys, use `count()` as an index:
    - `properties: { "formatted[${count(formatted)}]": "${{ \"ticket_id\": ticket.id, \"title\": ticket.title }}" }`.
  - Be careful not to mix direct array literals and incremental writes on the same param in the same scope, otherwise later writes can silently overwrite previous values.

- **Using class/object callbacks with `call_user_func_array`**:
  - For **global functions**, pass a simple string:
    - `callback: "get_option", args: ["_index_tickets_last_id", DEFAULT_LAST_INDEXED_TICKET]`.
  - For **object or static methods**, pass a two-element array:
    - Example: calling `$wpdb->get_blog_prefix()`:
      - `callback: ["$wpdb", "get_blog_prefix"], args: []`.
    - Example: calling a Fluent Support API method:
      - First get the API object: `tickets_api = wp_call_user_func_array("FluentSupportApi", ["tickets"])`.
      - Then call a method: `callback: [tickets_api, "getTicket"], args: [ticket_id]`.
  - Always remember that the `call_user_func_array` ChatFunctionElement wraps the result into an object like `{ "function_result": ... }`, so downstream `SetParamElement` expressions must access `function_result` instead of assuming a raw scalar or array.


