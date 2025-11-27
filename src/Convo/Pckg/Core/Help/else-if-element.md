### Else If element

A sub‑element of **IF element** used to test additional conditions and run its own **Then** flow when the condition is truthy.

### When to use

Use **Else If element** when your IF condition is more than a simple yes/no and you have **multiple, mutually exclusive cases**:

- Grading scores into ranges (A/B/C/…).
- Handling different error codes.
- Routing users based on several distinct states.

### Properties

#### Test

Expression for this specific case.

- Evaluated only if the parent IF’s **Test** is falsy and all previous Else If elements have failed.
- Truthy value → run this element’s **Then** flow.

#### Then (flow)

Flow of elements that will run if this element’s **Test** is truthy.

- Used exactly like the parent IF’s **Then** flow, but scoped to this case.

### How it fits into IF

- Place **Else If** elements in the **Else If** flow of an **IF element**.
- The system evaluates them in order; the **first** one whose **Test** is truthy wins.
- If none match, the IF’s **Else** flow (if defined) runs.

### Tips

- Order your Else If elements from most specific to most general.
- Avoid overlapping conditions; make each **Test** clearly distinct.
- If you find yourself adding many Else Ifs, consider extracting logic into separate blocks or fragments.


