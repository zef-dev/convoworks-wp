### WP DB Element

Execute low-level queries against the WordPress database using the global `wpdb` object and optionally branch the flow based on success or failure.

### When to use

Use **WP DB Element** when:

- You need to run SQL queries that are not practical to express via `WP_Query` or higher-level APIs.
- You are working with **custom tables** or advanced `INSERT` / `UPDATE` / `DELETE` logic.
- You want to capture the **raw query result**, **insert ID**, or error and continue the conversation accordingly.

Avoid using it for cases where `WP_Query` or other high-level functions already cover your needs; those are usually easier to maintain.

### Properties

#### Action (`action`)

What kind of database operation to perform:

- `select` – Run a `SELECT` query using `$wpdb->get_results()`.
- `query` – Run a generic query using `$wpdb->query()`.
- `insert` – Insert a row into a table using `$wpdb->insert()`.
- `update` – Update rows using `$wpdb->update()`.
- `delete` – Delete rows using `$wpdb->delete()`.
- `replace` – Replace rows using `$wpdb->replace()`.

This value is evaluated as an expression, so you can use something like `${db_action}`.

#### Table name (`table_name`)

Name of the table to operate on (for `insert`, `update`, `delete`, `replace`).

- Example: `` `${wpdb.prefix}my_custom_table` ``.
- Only visible when `Action` is not `select` and not `query`.

#### Query (`query`)

SQL query to execute when using `Action = select` or `Action = query`.

- For `select` the query is executed with `$wpdb->get_results($query, ARRAY_A)`.
- For `query` the query is executed with `$wpdb->query($query)` (returns affected row count or `false`).

You can use `${...}` expressions inside the query string.

#### Last Result Name (`last_result_name`)

Name of the **request-scope** variable where the last query result will be stored.

- Default: `last_result`.
- For `select` this will be an **array of associative arrays** (result rows).
- For `query` this will be the **integer result or boolean** returned by `$wpdb->query()`.

#### Insert ID Name (`insert_id_name`)

Name of the **request-scope** variable where the last **auto-increment ID** from `insert` / `replace` will be stored.

- Default: `insert_id`.
- Only used for `insert` and `replace`.

#### Data (`data`)

Key–value pairs used as data for `insert`, `update`, or `replace`.

- Keys are column names.
- Values are expressions that will be evaluated before executing the query.

Example:

- `user_id` → `${user.ID}`
- `score` → `${current_score}`

#### Formatting options (`format`)

Format string(s) for the **data** values.

- Use `%s` (string), `%d` (integer), `%f` (float).
- Provide them as a semicolon-separated string, e.g. `%d;%s;%f`.
- They will be split into an array internally.

#### Where (`where`)

Key–value pairs used as `WHERE` conditions for `update`, `delete`, and `replace`.

- Keys are column names.
- Values are expressions that will be evaluated before executing the query.

#### Where formatting options (`where_format`)

Format string(s) for the **where** values.

- Same rules as for `format`: you can provide `%s;%d;...` and it will be split into an array.

#### OK (`ok`)

Child components to execute if:

- The query executes **without errors**, and
- `$wpdb->last_error` is empty.

Use this flow to work with the data stored in `${last_result_name}` or `${insert_id_name}`.

#### NOK (`nok`)

Child components to execute if:

- An exception is thrown, or
- `$wpdb->last_error` is **not empty** after the operation.

Use this to handle database errors gracefully (logging, user notification, etc.).

### Runtime behavior

At runtime the element:

1. Evaluates `action`, `table_name`, `last_result_name`, `insert_id_name`, and the configured data/where parameters.
2. Executes the selected database operation using the global `$wpdb`.
3. Stores:
   - The last result under `${last_result_name}` (request scope) for `select` and `query`.
   - The auto-increment ID under `${insert_id_name}` (request scope) for `insert` and `replace`.
4. If there is any exception or `$wpdb->last_error` is not empty, the **NOK** flow is executed; otherwise the **OK** flow runs.

The global `wpdb` object is also available in expression evaluation as `wpdb`, so you can reference properties like `${wpdb.prefix}`.

### Example

#### Select records into `players`

Configure:

- **Action**: `select`
- **Query**:
  - `` SELECT * FROM `${wpdb.prefix}players` WHERE `score` > ${min_score} ``
- **Last Result Name**: `players`

In the **OK** flow, you can loop over the results with a regular `Loop` element:

- **Items**: `${players}`
- **Data collection item name**: `row`
- Inside the loop, access:
  - `${row.value.id}`
  - `${row.value.name}`
  - `${row.value.score}`

#### Insert a new row

Configure:

- **Action**: `insert`
- **Table name**: `` `${wpdb.prefix}players` ``
- **Data**:
  - `user_id` → `${user.ID}`
  - `score` → `${current_score}`
- **Formatting options**: `%d;%d`
- **Insert ID Name**: `insert_id`

In the **OK** flow:

- Use `${insert_id}` to get the ID of the inserted row.

### Tips

- Always **validate and escape your inputs**; this element allows raw SQL, so you are responsible for security.
- Prefer named variables like `last_result` / `insert_id` and immediately copy important values into more descriptive names using `Set Parameter` if they will be reused.
- Be careful with `delete`, `update`, and `replace`—configure the `where` conditions precisely to avoid unintended changes.
- For simple post queries, prefer `WP Query Context` and related components; they are safer and easier to maintain.


