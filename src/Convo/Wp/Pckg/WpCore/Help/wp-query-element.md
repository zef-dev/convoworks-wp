### WP Query Element

Read high‑level information from a `WP Query Context` and branch the conversation based on whether there are any results.

### When to use

Use **WP Query Element** when:

- You have a `WP Query Context` and want to quickly check if it has results.
- You need to put different flows behind “has results” vs. “no results”.
- You want to expose page info (and underlying `WP_Query`) to the rest of the service without doing a loop yourself.

### Properties

#### Source (`context_id`)

ID of the `WP Query Context` instance to inspect.

Must match the **Context ID** of a `WP Query Context` component.

#### Page info var (`page_info_var`)

Name of the **request-scope** variable where the page info will be stored.

It contains what `WP Query Context::getLoopPageInfo()` returns, for example:

```text
${page_info.last}      // true if current page is last
${page_info.first}     // true if current page is first
${page_info.page_no}   // 1-based page number
${page_info.query}     // WP_Query object
```

#### Has results (`has_results`)

Child components executed when the query has at least one post (`have_posts()` is true).

Use this to build a result flow, e.g.:

- Announce count and page.
- Start a loop (using `WP Loop Element` or `WP Loop Page Block`).

#### No results (`no_results`)

Child components executed when the query has **no posts**.

Use this to handle “no matches” gracefully and offer alternatives.

### Runtime behavior

At runtime:

1. The element locates the `WP Query Context` by `context_id`.
2. Retrieves the underlying `WP_Query` and the loop page info.
3. Stores the page info into the request scope under `${page_info_var}`.
4. If `have_posts()` is **true**:
   - Logs and executes all **Has results** child elements.
5. If `have_posts()` is **false**:
   - Logs and executes all **No results** child elements.

When you directly inspect `${page_info.query}`, remember that you are **not** automatically in the WordPress loop; if you want a proper loop, prefer `WP Loop Element` or `WP Loop Page Block`.

### Example

Assume a `WP Query Context`:

- **Context ID**: `search_posts`

Configure **WP Query Element**:

- **Source**: `search_posts`
- **Page info var**: `page_info`
- **Has results**:
  - A `Text Response`:
    - `I found ${page_info.query.found_posts} posts.`
  - A `WP Loop Element` to iterate over the current page.
- **No results**:
  - `I couldn't find any posts matching your request. Please try a different keyword.`

### Tips

- Store page info under a consistent name (e.g. `page_info`) so multiple steps can reuse it.
- Inside **Has results**, prefer using `WP Loop Element` or `WP Loop Page Block` instead of manually iterating `page_info.query.posts`.
- If you do loop over `page_info.query.posts` manually, remember you’re outside the standard WordPress loop and some template functions without arguments may not work as expected.


