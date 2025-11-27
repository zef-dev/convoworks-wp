### Element Generator

Generate a series of elements from a collection, such as an array, and feed them into containers like **Element Queue** or **Element Randomizer**.

### When to use

Use **Element Generator** when:

- You have a collection of items (e.g. greetings) and want to create elements for each item without manually defining each one.
- You want to populate **Element Queue** or **Element Randomizer** from data instead of static configuration.

### Properties

#### Items

Collection to iterate over.

- Expression that evaluates to an array or iterable.
- Example: `${GREETINGS}` or `${["Hello", "Hi", "Howdy"]}`.

#### Data collection item name

Name of the status variable representing the current item.

- Example: `greeting` → accessible as `${greeting.value}`, `${greeting.index}`, etc.

Status fields:

- `${greeting.value}` – value of the current element.
- `${greeting.index}` – 0‑based index.
- `${greeting.natural}` – 1‑based index.
- `${greeting.first}` – `true` for the first element.

#### Element (flow)

Child element to execute for each item in the collection.

### Example

Create dynamic greetings in an **Element Queue**:

1. Define a collection of greetings as a service variable or via **Set Param**:  
   `${["Hello", "Hi", "Howdy"]}`
2. Place an **Element Queue**.
3. Inside its main flow, place an **Element Generator**:
   - **Items**: `${GREETINGS}`
   - **Data collection item name**: `greeting`
4. In the **Element** flow, add a Text Response:
   > `${greeting.natural}: ${greeting.value}!`

Running the service will generate responses for each greeting without manually defining each entry.

### Tips

- Use Element Generator to keep queues and randomizers data‑driven and easier to maintain.
- Keep the child element simple and focused on using the status variable for output.


