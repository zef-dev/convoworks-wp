---
id: func-register_convo_message
type: function
name: register_convo_message
package: convo-core
function_kind: NamedFunctionElement
tags:
  - function:register_convo_message
  - feature:conversation-history
  - capability:storage
  - platform:wordpress
related_services:
  - crm-manager
updated_at: 2025-11-27
source:
  file: docs/example-services/crm-manager-v1.13.1.json
  fragment_ids:
    - Functions_Conversation
---

### Purpose

Appends a single structured chat message to the current conversation history and persists it into a WordPress custom post associated with the session.

Used by CRM Manager to store both user and assistant messages in the `CPT_CONVERSATIONS` post type.

### Parameters

- `message` (`array` / object)  
  A single OpenAI‑style message object, for example:
  - `{"role": "user", "content": "Hi, I want to work with course AD0104"}`  
  - `{"role": "assistant", "content": "Here is your briefing..."}`  
  - Tool or system messages can be stored as well, as long as they are serializable.

### Behavior

1. Loads or creates the backing conversation post using `_get_convo_post(request.sessionId)`.
2. Decodes `post.post_content` into `messages[]`.
3. Validates that `messages` is an array; if decoding fails, logs an error and ends the request.
4. Appends `message` to `messages` (`array_merge(messages, [message])`).
5. Calls `WpInsertPostElement` to update the existing post with the new JSON (pretty‑printed, via `wp_slash(json_encode(...))`).
6. On write failure:
   - Logs an error and ends the request.
7. Returns the updated `messages` array as `function_result`.

### Usage notes

- Designed to be called from:
  - The entry block when sending the initial welcome assistant message.
  - Each chat turn, for both user input and the final assistant/tool message.
- Together with `get_current_convo()`, this function enables persistent, multi‑turn GPT conversations that survive across requests.


