### WP Loop Post Block

Navigate between individual posts inside a `WP Query Context`, typically after a user has already selected one result.

### When to use

Use **WP Loop Post Block** when:

- You already have a **selected post** from a `WP Loop Page Block` or other logic.
- You want to let the user move to the **next** or **previous** post while staying in a “details” view.
- You need to keep page and post info in sync with the `WP Query Context`.

### Properties

#### Block ID (`block_id`)

Unique identifier for this block within the service.

#### Block name (`name`)

Human‑readable name shown in the editor (“New block” by default).

#### Source (`context_id`)

ID of the `WP Query Context` used as the data source.

Must match the **Context ID** of the `WP Query Context` used by your paging logic.

#### Page info var (`page_info_var`)

Name of the **request-scope** variable holding page info from `WP Query Context::getLoopPageInfo()`.

It is set every time the block runs.

#### Post info var (`single_post_info_var`)

Name of the **request-scope** variable holding info about the **currently selected post**, from `getLoopPostInfo()`.

You can access:

```text
${post_info.post}         // current WP_Post
${post_info.post.ID}
${post_info.post.post_title}
${post_info.post_no}      // index on the page (1-based)
${post_info.abs_post_no}  // absolute index across all pages
${post_info.meta}         // simplified post meta
```

#### Next not available (`no_next`)

Elements executed when the user asks for the **next post** but there is no next post.

- If empty, the block falls back to its generic `Fallback` processors.

#### Previous not available (`no_previous`)

Elements executed when the user asks for the **previous post** but there is no previous post.

- If empty, the block falls back to its generic `Fallback` processors.

### Built‑in intents and actions

The block registers internal filters that map:

- `convo-core.NextIntent` → `next` (select next post)
- `convo-core.PreviousIntent` → `previous` (select previous post)

You only have to define what happens in your content when a new post becomes selected.

### Runtime behavior

At runtime:

1. **Read phase**:
   - Calls `_injectCurrentPostInfo()`:
     - Ensures the selected post is restored via `restoreSelectedPost()`.
     - Sets `${single_post_info_var}` and `${page_info_var}` to the current loop post and page info.
   - Runs the block’s normal `read()` flow (e.g. “details” prompts).
2. **Run phase**:
   - Evaluates the internal filters to see if a **next** or **previous** action is requested.
   - If no match is found, falls back to the base `ConversationBlock::run()` (processors, fallback, etc.).
   - If an action is found:
     - For `next`:
       - Calls `selectNextPost()` on the `WP Query Context`.
       - On success: calls `read()` again, which re‑injects the updated post and page info and replays the block content.
       - On **NavigateOutOfRangeException**: executes **Next not available** (or fallback if empty).
     - For `previous`:
       - Calls `selectPreviousPost()` similarly.
       - On **NavigateOutOfRangeException**: executes **Previous not available** (or fallback if empty).

### Example

Assume the user previously selected a product using **WP Loop Page Block**, and you then transition into a **WP Loop Post Block**:

- `WP Loop Post Block`:
  - **Context ID**: `search_products`
  - **Page info var**: `page_info`
  - **Post info var**: `post_info`
  - **Read phase**:
    - `You're now viewing product ${post_info.abs_post_no}: ${post_info.post.post_title}.`
    - `Say next or previous to move between products.`
  - **Next not available**:
    - `You are already at the last product in the list.`
  - **Previous not available**:
    - `You are already at the first product.`

When the user says “next”, the block:

1. Calls `selectNextPost()` on the `WP Query Context`.
2. Updates `${post_info}`.
3. Reruns the **Read** content so the user hears the new product’s details.

### Tips

- Use **WP Loop Page Block** for the initial result list and selection; use **WP Loop Post Block** for the “detail view” navigation.
- Keep your **Read** content in this block focused on the **currently selected post** (details, options, actions).
- Always provide clear messages for “end of list” situations via **no_next** and **no_previous** to avoid dead ends.


