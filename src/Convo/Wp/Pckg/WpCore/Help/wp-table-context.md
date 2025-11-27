### WP Custom Table Catalog (WP Table Context)

Run a custom SQL `SELECT` query on the WordPress database and turn each row into a **catalog value**.

### When to use

Use **WP Custom Table Catalog** when:

- The values you need live in a **custom table** or a non‑standard structure.
- `WP_Query` is not suitable or convenient for obtaining those values.
- You want to drive a catalog (e.g. entities) directly from arbitrary SQL results.

### Properties

#### Entity name (`entity_name`)

Name of the entity whose values will be populated by this catalog.

Example:

- `quiz_name`
- `product_sku`

Create a corresponding entity with the same name in the Entities editor; its values will be replaced by this catalog.

#### Version (`version`)

Version marker for the catalog.

- Any value or expression that you change when the underlying values change.
- Evaluated at runtime to a string.

Example:

- `1`
- `${get_option('quiz_catalog_version')}`

#### Query (`query`)

SQL `SELECT` query to run on the database.

- Evaluated as a string in the service context.
- You can use `wpdb` in expressions to access the global `$wpdb` object.

Examples:

- `` SELECT name FROM `${wpdb.prefix}quizzes` ``
- `` SELECT ID, name FROM `${wpdb.prefix}stores` WHERE active = 1 ``

#### Final value (`final_value`)

Expression that turns each result row into a **single string**—the actual catalog value.

- Every row is available as `row` in the expression (an object with properties corresponding to columns).
- The expression is evaluated once per row.

Examples:

- `${row.name}`
- `${row.city ~ ' ' ~ row.country}`
- `${row.ID ~ '-' ~ row.code}`

The result **must** be a string; otherwise an exception is thrown.

### Runtime behavior

At runtime:

1. The context evaluates `query` with `wpdb` in the evaluation context.
2. Executes the query using `$wpdb->query($query)` and reads `$wpdb->last_result`.
3. For each row in `last_result`:
   - Evaluates `final_value` with `row` in the context.
   - Validates that the result is a string.
4. Collects the string results into an array.
5. Wraps them in a `WpValuesCatalog` together with the evaluated `version`.
6. Exposes this catalog as an `ICatalogSource` for platforms.

### Example

Build a catalog of **quiz names** from a custom `quizzes` table:

- **Entity name**: `quiz_name`
- **Version**: `${'v1'}`
- **Query**:
  - `` SELECT name FROM `${wpdb.prefix}quizzes` WHERE published = 1 ``
- **Final value**:
  - `${row.name}`

In the Entities editor define an entity `quiz_name` with no values; this context will supply them.

### Tips

- Always limit your query to only the columns you need; this keeps memory usage and catalog size under control.
- Avoid returning complex types from **Final value**; always ensure the expression yields a single string.
- Use the global `wpdb` prefix (`${wpdb.prefix}`) to make your queries robust across different WordPress installations.


