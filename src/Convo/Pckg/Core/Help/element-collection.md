### Element collection

A container that holds and executes a group of child elements as a single unit.

### When to use

Use **Element collection** when you want to:

- Group multiple elements that conceptually belong together.
- Reuse the same sequence of elements from several places (via fragments or higher‑level components).
- Keep large blocks more organized by encapsulating a sub‑flow.

### Properties

#### Elements (flow)

Child elements to execute.

- Executed in order, as if they were inlined at this point.
- You can place any read‑phase elements here.

### Example

Create an **Element collection** that:

- Asks for confirmation.
- Explains next steps.

Then, include that collection (or a fragment built from it) from multiple blocks instead of duplicating the same elements.

### Tips

- Use meaningful names for collections to describe their purpose (e.g. `order_summary_intro`).
- Combine with fragments (`ElementsFragment`, `Read elements fragment`) to make collections reusable.


