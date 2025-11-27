### Loop

Iterate over each item in a collection and execute one or more child elements for every item.

### When to use

Use **Loop** when you have a collection (array, iterator, or any traversable) and you want to repeat a sequence of elements for each item:

- Rendering a list of products, posts, or records.
- Processing items returned from `Http Client`, `Json Reader`, database queries, etc.
- Applying the same logic to each element of an array.

### Properties

#### Items (data_collection)

The collection to iterate over.

- Must evaluate to:
  - an **array**,
  - an **`Iterator`**, or
  - an **`IteratorAggregate`** (e.g. a collection type that exposes `getIterator()`).
- Example values:
  - `${players}`
  - `${response.items}`
- If the evaluated value is not iterable, the element will throw an error.

#### Data collection item name (item)

Name of the **status variable** that will hold the current item and loop metadata.

- This is **not** wrapped in expression syntax in the editor:
  - ✅ `player`
  - ❌ `${player}`
- On each iteration, the loop stores the following object into the **request scope** under this name:

  ```text
  ${player.value}    // current item
  ${player.index}    // 0-based index within the loop window
  ${player.natural}  // 1-based index (human-friendly)
  ${player.first}    // true only for the first item in range
  ${player.last}     // true only for the last item in range
  ```

#### Offset

Number of items to **skip from the beginning** of the collection.

- Evaluated as a number.
- If empty, the loop starts from the first item.
- If the value is outside the valid range, the loop logs a warning and starts from 0.

#### Limit

Maximum number of items to process.

- Evaluated as a number.
- If empty, the loop processes all items from `Offset` to the end.
- If set, the loop will process at most **Limit** items starting from `Offset`.

#### Loop until (loop_until)

Expression that, when it becomes truthy, **stops the loop early**.

- Evaluated on **every iteration**, after the status variable is set and before inner elements are executed for the next item.
- Typical uses:
  - Stop when a match is found.
  - Stop when a counter or condition is satisfied.

Example:

```text
${player.value.score >= 100}
```

### Status variable fields

The following fields are available on the status variable whose name you configure in **Data collection item name**:

| Field    | Description                                                     |
|----------|-----------------------------------------------------------------|
| `value`  | The current value of the collection being iterated over        |
| `index`  | Current programmatic index of the loop (starts at 0)           |
| `natural`| Human readable index (starts at 1)                              |
| `first`  | Boolean flag, whether the item is the first in the processed range |
| `last`   | Same as `first`, only checks if the item is the last in the processed range |

### Example

Suppose you have an array of players called `players`, and each player has a `score`. This example outputs each player’s score:

- **Items**: `${players}`
- **Data collection item name**: `player`  
  (note: **no** `${}` wrapper)
- Inside the **Loop**, add a `Text Response` element and set **Text** to:

  > Player `${player.natural}`'s score is `${player.value.score}`

### Tips

- You can place any number of elements inside **Loop**; they are executed for each item.
- Combine **Offset** and **Limit** to implement paging, e.g. show only 10 items per page.
- Use **Loop until** to break early as soon as you find what you’re looking for, instead of processing the entire collection.

