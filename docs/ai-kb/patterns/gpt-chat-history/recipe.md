---
id: pattern-gpt-chat-history
type: pattern
name: GPT chat with persistent history and token limits
tags:
  - pattern:gpt-chat-history
  - feature:conversation-history
  - feature:token-limits
  - package:convo-gpt
  - package:convo-core
  - platform:wordpress
related_services:
  - crm-manager
updated_at: 2025-11-27
source:
  files:
    - docs/example-services/crm-manager-v1.13.1.json
  fragment_ids:
    - Chat_Completion
    - Functions_Conversation
---

### When to use

Use this pattern when you want a GPT‑powered chat in Convoworks that:

- Remembers past messages across turns.
- Stores the conversation in WordPress (custom post type).
- Keeps the effective history under safe token limits by truncating older messages.

### Components used

- `\\Convo\\Gpt\\Pckg\\ChatCompletionV2Element` – calls the GPT model.
- `\\Convo\\Gpt\\Pckg\\ConversationMessagesElement` – reads the stored history.
- `\\Convo\\Gpt\\Pckg\\SimpleMessagesLimiterElement` – trims messages to configured token limits.
- Named functions from `Functions_Conversation`:
  - `get_current_convo(sessionId)` – loads the JSON conversation from the CPT.
  - `register_convo_message(message)` – appends and saves a message to the CPT.
  - `_get_convo_post(sessionId)` – creates or finds the underlying CPT post.

### Flow summary

1. On each request, `get_current_convo()`:
   - Locates or creates a conversation post (type from `CPT_CONVERSATIONS`, keyed by `session_id`).
   - Decodes its `post_content` JSON into `messages[]`.
2. `ConversationMessagesElement` passes `messages` to `SimpleMessagesLimiterElement`, which:
   - Computes token usage.
   - Truncates older messages when over `MAX_MESSAGES_TOKENS` or `TRUNCATE_TO_TOKENS`.
   - Optionally logs how many messages were removed and updates `service.messages`.
3. `ChatCompletionV2Element` sends system messages plus the limited history to the GPT model.
4. After the response:
   - The final message (`status.last_message`) is appended to `messages` via `register_convo_message()`.
   - `register_convo_message()` writes the new JSON back into the CPT, aborting the request cleanly if write fails.

### Minimal JSON sketch

Below is a simplified, self‑contained sketch of the core pattern (omit or expand fields as needed):

```json
{
  "fragments": [
    {
      "fragment_id": "Chat_Completion",
      "elements": [
        {
          "class": "\\Convo\\Gpt\\Pckg\\ChatCompletionV2Element",
          "properties": {
            "api_key": "${GPT_API_KEY}",
            "result_var": "status",
            "message_provider": [
              {
                "class": "\\Convo\\Gpt\\Pckg\\SimpleMessagesLimiterElement",
                "properties": {
                  "message_provider": [
                    {
                      "class": "\\Convo\\Gpt\\Pckg\\ConversationMessagesElement",
                      "properties": {
                        "messages": "${get_current_convo()}"
                      }
                    }
                  ],
                  "result_var": "status",
                  "max_tokens": "${MAX_MESSAGES_TOKENS}",
                  "truncate_to_tokens": "${TRUNCATE_TO_TOKENS}"
                }
              }
            ],
            "new_message_flow": [
              {
                "class": "\\Convo\\Pckg\\Core\\Elements\\SetParamElement",
                "properties": {
                  "scope_type": "request",
                  "parameters": "service",
                  "properties": {
                    "messages": "${register_convo_message(status.last_message)}"
                  }
                }
              },
              {
                "class": "\\Convo\\Pckg\\Core\\Elements\\TextResponseElement",
                "properties": {
                  "text": "${status.last_message.content}"
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```


