### Include read fragment

Run the **Read elements fragment** with the given fragment ID, so you can reuse a group of elements from multiple places in your service.

### When to use

Use **Include read fragment** when you want to:

- Reuse the same group of elements (a **read fragment**) in multiple blocks or branches.
- Keep your main workflow simpler by extracting complex sequences into named fragments.
- Avoid copy–pasting the same elements into many places.

Typical examples:

- A shared greeting / introduction used in several conversation blocks.
- A reusable error-handling or confirmation sequence.

### Related components

- **Read elements fragment (this element)** – *executes* a fragment during the read phase.
- **Elements fragment** – defines a reusable group of elements identified by a `fragment_id`.

### Properties

#### Fragment (fragment_id)

ID of the **Elements fragment** you want to run.

- In the editor, this is configured via the **Read Fragment Name** dropdown.
- Under the hood, it corresponds to the `fragment_id` of an `ElementsFragment`.
- The value is evaluated as an expression, so you can use:
  - a **literal ID**, e.g. `shared_greeting`
  - an **expression**, e.g. `${fragment_to_run}`

At runtime, the element:

1. Evaluates `fragment_id` using `evaluateString()`.
2. Uses `getService()->findFragment(<evaluated id>)` to locate the fragment.
3. Verifies that the found fragment is a `IConversationElement`.

If the fragment cannot be found, or is not an element, a `ComponentNotFoundException` is thrown.

### Runtime behavior

When the conversation reaches this element’s **read** phase:

1. The element searches for the fragment by the configured **Fragment (fragment_id)**.
2. It checks the parent chain to detect **self-inclusion**:
   - If the fragment is already in the parent chain, it logs a warning and **does not** reattach it, to avoid infinite recursion.
3. It sets this element as the fragment’s parent (when safe).
4. It calls the fragment’s `read()` method, passing the current request and response.

Effectively, this behaves as **“jump into the fragment and run its elements here”**, then return to the original flow.

### Example

Suppose you have defined an **Elements fragment** with ID `shared_greeting` that:

- Welcomes the user.
- Asks a common follow-up question.

You can reuse it in multiple blocks:

- **Fragment (Read Fragment Name)**: pick `shared_greeting` from the dropdown.

Now, wherever you place **Include read fragment**, the `shared_greeting` fragment will run as if its elements were inlined at that point.

### Tips

- Use clear, stable **fragment IDs** (e.g. `order_summary_intro`, `shared_greeting`) so they are easy to pick from the dropdown.
- Keep fragments **small and focused**, so they are easier to reuse and test.
- Avoid recursive inclusion (fragment A including fragment B that includes A again); the implementation logs a warning when it detects including itself through the parent chain.


