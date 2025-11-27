### IF element

Test an expression, and depending on whether it evaluates to a truthy or falsy value, execute the **Then**, **Else If**, or **Else** flows.

### When to use

Use **IF element** whenever you need to branch the conversation flow based on a condition:

- Checking if a user’s answer is correct.
- Splitting logic based on values in request/service parameters.
- Choosing between multiple mutually exclusive cases.

### Properties

#### Test

Expression that is evaluated to decide which branch to take.

- Evaluated using the Convoworks Expression Language.
- Any truthy value runs the **Then** flow.
- Falsy values skip **Then** and move on to **Else If** elements or **Else**.

Example:

> `${result.number == correctNumber}`

#### Then (flow)

Flow of elements to execute when **Test** is truthy.

- Executed once, in order, when the condition passes.

#### Else If (flow)

Flow that contains **Else If elements**, each with its own `Test` and `Then` flow.

- Used to check additional cases without nesting multiple IF elements.
- First matching **Else If** wins; its **Then** flow runs, others are skipped.

#### Else (flow)

Fallback flow that runs when:

- **Test** is falsy, and
- No **Else If** element matched.

### Example

Suppose you store the correct answer in `${correctNumber}` and the user’s input in `${result.number}`:

- **Test**: `${result.number == correctNumber}`
- **Then**: Text Response → “Correct!”
- **Else If** flow:
  - Else If #1, **Test**: `${result.number < correctNumber}` → Then: “Too low.”
  - Else If #2, **Test**: `${result.number > correctNumber}` → Then: “Too high.”
- **Else**: Text Response → “I didn’t understand your number.”

### Tips

- Keep expressions in **Test** concise; move complex logic into parameters and reference them.
- Prefer **Else If** elements over deeply nested IF elements for readability.
- Use the **Else** flow as a safe fallback when nothing else matches.


