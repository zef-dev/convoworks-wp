### WP Post Context

Query posts from the `wp_posts` table and turn them into **catalog values** for use as entity value sources on supported platforms.

### When to use

Use **WP Post Context** when:

- You want to drive a catalog (e.g. Alexa slot values) from posts or custom post types in WordPress.
- You need the catalog to update automatically when posts change.
- You prefer to define the final catalog value via expressions (e.g. title, slug, custom meta).

### Properties

#### Entity name (`entity_name`)

Name of the entity whose values will be populated by this catalog.

- This usually corresponds to an entity you have defined in the **Entities** editor.
- The entity itself can be empty; its values will be supplied by this catalog.

Example:

- `products`
- `cities`

#### Version (`version`)

Version marker for the catalog.

- Any value or expression that you change when the underlying values should be republished.
- The catalog version is evaluated at runtime and used by platforms to detect updates.

Example:

- `1` (static)
- `${get_option('my_catalog_version')}`

#### Query parameters (`query_params`)

Key–value pairs that define arguments for `WP_Query`.

- Keys and values are evaluated as expressions.
- Supports “complex” keys (nested arrays) via `ArrayUtil`, so you can set deep structures if needed.

Example:

- `post_type` → `product`
- `post_status` → `publish`
- `posts_per_page` → `-1`

#### Final value (`final_value`)

Expression used to format each post into a **single string**, which becomes the catalog value.

If empty, the default is `get_the_title()` for each post.

Examples:

- `${get_the_title()}`
- `${get_post_meta(get_the_ID(), 'city_name', true)}`
- `${get_the_title() ~ ' by ' ~ get_the_author()}`

### Runtime behavior

At runtime the context:

1. Evaluates `query_params` into a `$query_args` array (keys and values are evaluated).
2. Builds or reuses a `WP_Query` with those arguments.
3. Iterates over all posts:
   - For each post:
     - Computes `final_value` via `evaluateString()` if provided, otherwise uses `get_the_title()`.
     - Ensures the resulting value is a **string**; otherwise it throws an exception.
   - Collects all final string values into an array.
4. Wraps that array into a `WpValuesCatalog` together with the evaluated `version`.
5. Exposes the catalog through the `ICatalogSource` interface for use by platforms.

### Example

Create a catalog of **city names** from a `city` custom post type:

- **Entity name**: `city`
- **Version**: `${'v1'}`
- **Query parameters**:
  - `post_type` → `city`
  - `post_status` → `publish`
  - `posts_per_page` → `-1`
- **Final value**:
  - `${get_the_title()}` (or a city_name meta if you prefer)

In your entity definition, create an entity named `city` and leave its values empty; this context will supply them.

### Tips

- Always ensure that **Final value** evaluates to a **single string** per post; arrays or objects will cause an exception.
- Use `Version` to force recrawls when you change how you compute values (e.g. from title to a meta field).
- Use `query_params` to narrow down posts by type, taxonomy, or meta so that your catalog remains small and focused.


