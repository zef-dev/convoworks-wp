### WP Query Context

Wrap a `WP_Query` as a service context, maintain **pagination state** across the session, and expose page/post info to other WP components.

### When to use

Use **WP Query Context** when:

- You want to define a reusable query (e.g. search results) that other components (loop, blocks, etc.) can consume.
- You need **persistent pagination** across multiple requests (next/previous page, selected post).
- You want to share page and post metadata (position, total pages, simplified meta) with your flows.

### Properties

#### Context ID (`id`)

Unique ID by which this context is referenced by other components.

Examples:

- `search_posts`
- `blog_archive`

#### WP_Query args (`args`)

Key–value pairs that are evaluated into a `WP_Query` argument array.

- Supports expressions for both keys and values (evaluated in the service context).
- The context may override or add certain keys to maintain pagination.

Common examples:

- `post_type` → `post`
- `post_status` → `publish`
- `posts_per_page` → `3`

#### Rewind pagination (`resetNaviVar`)

Expression that, when evaluated to **true**, resets the internal pagination model to the first page.

Examples:

- `${sort_changed}` – reset when a sort mode flag changes.
- `${request.reset == 'yes'}` – reset when user explicitly requests it.

### Runtime behavior

At runtime the context:

1. Evaluates `args` into an `$args` array:
   - Uses `evaluateArgs()` in the service context.
2. Calculates **offset** based on the persistent navigation model when `offset` is not explicitly set:
   - `offset = page_index * posts_per_page`.
   - Forces `paged = true`.
3. Creates (`WP_Query`) or reuses it when arguments have not changed.
4. Stores pagination state (`page_index`, `post_index`) in the **session** scope under the `query_model` key.
5. Provides:
   - An `Iterator` over results (via `WpLoopIterator`).
   - Methods to move pages and posts (`moveNextPage()`, `movePreviousPage()`, `selectNextPost()`, `selectPreviousPost()`, `selectPagePost()`, `restoreSelectedPost()`, `resetNavi()`).
   - Info helpers: `getLoopPageInfo()` and `getLoopPostInfo()`.

### Page info (`getLoopPageInfo`)

The **page info** structure typically looks like:

```text
{
  last:  bool,       // true if current page is last
  first: bool,       // true if current page is first
  page_no: number,   // page number, 1-based
  query: WP_Query    // underlying WP_Query object
}
```

Other components (e.g. WP Query Element, WP Loop Page Block) store this in a variable such as `${page_info}`.

### Post info (`getLoopPostInfo`)

The **post info** structure is computed from the current WordPress loop state and the navigation model:

```text
{
  abs_last:   bool,       // true if this is the last post in all results
  abs_first:  bool,       // true if this is the first post in all results
  abs_post_no: number,    // absolute index across all pages (1-based)
  last:       bool,       // true if last post on current page
  first:      bool,       // true if first post on current page
  post_no:    number,     // index on current page (1-based)
  post:       WP_Post,    // current post
  meta:       object      // simplified post meta key => value (system keys skipped)
}
```

This is what `WP Loop Element`, `WP Loop Page Block`, and `WP Loop Post Block` store under their configured **Post info var**.

### Pagination actions

`WP Query Context` provides several high-level actions that other components call:

- **Page movement**
  - `moveNextPage()` – go to the next page or throw `NavigateOutOfRangeException` if already at the last page.
  - `movePreviousPage()` – go to the previous page or throw when at the first one.
- **Post selection**
  - `selectPagePost($index)` – select a post by index on the current page or throw if out of range.
  - `selectLastPagePost()` – helper that selects the last post of the current page.
  - `selectNextPost()` / `selectPreviousPost()` – navigate between posts, potentially across pages.
  - `restoreSelectedPost()` – reapply the stored `post_index` to the WP loop.
- **Reset**
  - `resetNavi()` – reset pagination to the first page and first post.

These methods are used internally by the loop and block components; you rarely call them directly.

### Example

Configure a paginated blog search:

- **Context ID**: `search_posts`
- **WP_Query args**:
  - `post_type` → `post`
  - `post_status` → `publish`
  - `posts_per_page` → `3`
  - `orderby` → `date`
  - `order` → `DESC`
- **Rewind pagination**:
  - `${sort_changed}` (boolean flag stored elsewhere)

Then:

- Use **WP Query Element** to check whether there are results and store page info.
- Use **WP Loop Page Block** to list posts page by page and handle navigation.

### Tips

- Keep `posts_per_page` at a manageable size for voice or chat (e.g. 3–5 items per page).
- Use `resetNaviVar` whenever the underlying **filtering or sorting criteria** change, so users see the new results from the first page.
- When using custom `offset` manually in `args`, be aware that it overrides the internal pagination model.


