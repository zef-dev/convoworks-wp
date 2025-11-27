### Loop Block

Iterate over a collection of items inside a **conversation block** and handle user interaction for each item.

### When to use

Use **Loop Block** when:

- You have a collection (array) of items the user should respond to one by one.
- You want to advance through items based on user replies.

### Properties

#### Block name

Name of the block, shown in the editor and used for navigation.

#### Items

Collection to iterate over.

- Expression that evaluates to an array or iterable.
- Example: `${array_name}`

#### Data collection item name

Name under which you can access each individual item.

- Example: `item` (used as `${item.value}`, `${item.index}`, etc.)

On each iteration you can use:

- `${item.value}` – current item value.
- `${item.index}` – 0‑based index.
- `${item.natural}` – 1‑based index.
- `${item.first}` – `true` for the first item.
- `${item.last}` – `true` for the last item.

#### Offset

Number of items to skip at the beginning of the collection.

#### Limit

Maximum number of items to iterate through.

#### Skip reset

Expression; if truthy, prevents resetting status variables after the loop is interrupted.

#### Main processors

Processors that **advance the iteration** based on user replies.

#### Other processors

Processors that do **not** advance the iteration.

### Example

You have an array of quiz questions `${questions}`:

- **Items**: `${questions}`
- **Data collection item name**: `question`
- In **Main processors**, handle the user’s answer and move to the next question.

### Tips

- Use **Offset** and **Limit** to implement paging over large collections.
- Keep logic that changes the current item in **Main processors** and use **Other processors** for global commands (help, repeat, etc.).


