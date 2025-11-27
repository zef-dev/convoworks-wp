### WP Loop Page Block

Paginate through `WP Query Context` results and handle **page navigation** and **post selection** in a single conversation block.

### When to use

Use **WP Loop Page Block** when:

- You want a **page-by-page** experience over `WP_Query` results (e.g. “Next page”, “Previous page”, “Start over”).
- Users should be able to **select a result** by number (“select the third one”, tap an item, etc.).
- You want built‑in intents and filters to manage paging and selection without writing your own intent filters.

Combine it with **WP Loop Post Block** if you want a separate block for navigating between posts after selection.

### Properties

#### Block ID (`block_id`)

Unique identifier for the block within the service.

Used for wiring and diagnostics; must be unique among blocks.

#### Block name (`name`)

Human‑readable name shown in the editor (“Loop page block” by default).

#### Source (`context_id`)

ID of the `WP Query Context` used as the data source.

Must match the **Context ID** of a `WP Query Context` component.

#### Page info var (`page_info_var`)

Name of the **request-scope** variable where page info will be stored.

It contains `WP Query Context::getLoopPageInfo()` output, for example:

```text
${page_info.last}      // true if current page is last
${page_info.first}     // true if current page is first
${page_info.page_no}   // 1-based page number
${page_info.query}     // underlying WP_Query
```

#### Post info var (`single_post_info_var`)

Name of the **request-scope** variable where info about the current post in the loop is stored, as in `WP Loop Element`.

Used inside **Each post** and selection flows.

#### Page info phase (`elements`)

Elements executed when the user lands on the block or when the page changes.

Use this phase to:

- Announce total number of results or current page.
- Explain navigation options.

#### Each post (`each_post`)

Elements executed for **each post on the current page**.

Typical usage is to render or speak out a numbered list of results.

#### After loop (`after_loop`)

Elements executed **after** all posts on the page have been processed.

Use this to ask the user what to do next (“Say next, previous, or select a result by number.”).

#### Post selected flow (`post_selected`)

Elements executed when the user **selects a post** (by voice or UI).

- The selected post info is stored under `${single_post_info_var}`.
- Use this to show details, open a `WP Loop Post Block`, or transition to another part of the flow.

#### Process phase (`processors`)

Additional processors (e.g. help, repeat) that run in the **process** phase but do **not** trigger looping.

They allow you to plug in general handlers (help, fallback, etc.) without affecting paging behavior.

#### Selected not available (`no_selected`)

Elements executed when the user selects a post **outside the available range** (e.g. “select fifth” but there are only 3 posts).

Use this to correct the user and re‑prompt.

#### Next not available (`no_next`)

Elements executed when the user asks for the **next page** but there is no next page.

If empty, the block falls back to its regular `Fallback` processors.

#### Previous not available (`no_previous`)

Elements executed when the user asks for the **previous page** but there is no previous page.

If empty, the block falls back to its regular `Fallback` processors.

#### Fallback (`fallback`)

Fallback elements executed when:

- A navigation action is not possible, and
- The more specific `no_*` handlers are not defined.

### Built‑in intents and actions

The block wires several internal filters and intents to actions:

- `convo-wp-core.SelectPostIntent`  
  → `select` (select numbered result)
- `convo-wp-core.SelectLastIntent`  
  → `select_last` (select last result on the current page)
- `convo-core.NextIntent`  
  → `next` (go to next page)
- `convo-core.PreviousIntent`  
  → `previous` (go to previous page)
- `convo-core.StartOverIntent`  
  → `start_over` (return to first page)
- Platform-specific events for UI selections (Alexa APL, Actions on Google `actions.intent.OPTION`) are also mapped to `select`.

These are handled for you; you just define the conversational content in the phases described above.

### Runtime behavior

At runtime:

1. The block injects page info into `${page_info_var}` using `getLoopPageInfo()`.
2. In the **read** phase:
   - Executes the base `ConversationBlock` read (including **Page info phase**, **Each post**, and **After loop**).
   - Loops over all posts on the current page, storing `${single_post_info_var}` on each iteration.
3. In the **run** phase:
   - Evaluates the built‑in request filters.
   - If a matching action is found, it:
     - Navigates pages (`moveNextPage()`, `movePreviousPage()`), or
     - Selects a post (`selectPagePost()`, `selectLastPagePost()`), and
     - Executes the corresponding flows (`post_selected`, `no_*`, or `fallback`).
   - If no action matches, it falls back to the normal `ConversationBlock::run()` behavior.

### Example

List products with paging and selection:

- `WP Query Context`:
  - **Context ID**: `search_products`
- `WP Loop Page Block`:
  - **Context ID**: `search_products`
  - **Page info var**: `page_info`
  - **Post info var**: `post_info`
  - **Page info phase**:
    - `We found ${page_info.query.found_posts} products. Here are the items on page ${page_info.page_no}.`
  - **Each post**:
    - `Product ${post_info.post_no}: ${post_info.post.post_title}.`
  - **After loop**:
    - `Say next, previous, start over, or select a product by number.`
  - **Post selected flow**:
    - Go to a “Product details” block, passing `${post_info.post}`.

### Tips

- Keep your **page size** (`posts_per_page` on `WP Query Context`) to a reasonable number so that listings remain short and clear.
- Always provide clear **After loop** prompts explaining how to navigate or select.
- Use **no_next** / **no_previous** handlers to provide helpful messages at the boundaries instead of silently doing nothing.
- When you need “zoomed‑in” navigation for a single selected post, transition from **Post selected flow** into a **WP Loop Post Block**.


