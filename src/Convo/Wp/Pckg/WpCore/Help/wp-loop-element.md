### WP Loop Element

Iterate over the current page of a `WP Query Context` and execute child elements for each post.

### When to use

Use **WP Loop Element** when:

- You already have a `WP Query Context` that defines the query and pagination.
- You want to process **only the posts on the current page** (no extra pagination logic).
- You need a simple “for each post” loop inside a flow (e.g. listing results or building choices).

If you need **full pagination and selection support**, use **WP Loop Page Block** / **WP Loop Post Block** instead.

### Properties

#### Source (`context_id`)

ID of the `WP Query Context` to read from.

- Must match the **Context ID** property on a `WP Query Context` component.
- Example: `search_posts`.

#### Post info var (`single_post_info_var`)

Name of the **request-scope** variable where loop information for the current post will be stored on each iteration.

- Default: `post_info`.
- The value is what `WP Query Context::getLoopPostInfo()` returns, for example:

```text
${post_info.post}        // current WP_Post
${post_info.post.ID}
${post_info.post.post_title}
${post_info.post_no}     // position on the current page (1-based)
${post_info.abs_post_no} // absolute position across all pages (1-based)
${post_info.first}       // true if first on page
${post_info.last}        // true if last on page
${post_info.meta}        // simplified post meta key => value
```

#### Each post (`each_post`)

Child components that will be executed **once per post** on the current page.

These components can use `${post_info}` (or your custom name) to read details of each post.

### Runtime behavior

At runtime the element:

1. Locates the `WP Query Context` by `context_id`.
2. Obtains the underlying `WP_Query` and checks `have_posts()`.
3. Iterates over the context (`foreach ($context as $index => $post)`), which advances the WordPress loop.
4. For each post:
   - Stores loop info in the request scope under `${single_post_info_var}` using `getLoopPostInfo()`.
   - Executes all **Each post** child elements.

No pagination changes are performed—this element only walks over the posts on the currently selected page.

### Example

Assume a `WP Query Context` with:

- **Context ID**: `search_posts`

Configure **WP Loop Element**:

- **Source**: `search_posts`
- **Post info var**: `post_info`
- **Each post**:
  - A `Text Response` element with text:
    - `Result ${post_info.post_no}: ${post_info.post.post_title}`

If the current page has 3 posts, the user will hear/see something like:

- `Result 1: First post title`
- `Result 2: Second post title`
- `Result 3: Third post title`

### Tips

- Use **WP Query Element** before **WP Loop Element** if you want to check whether there are results and branch on “no results”.
- When you need to navigate between pages and then loop, use **WP Loop Page Block** instead; it wraps paging and looping together.
- Avoid calling `the_post()` or manipulating the WordPress loop yourself inside `Each post`; rely on `${post_info.post}` instead.


