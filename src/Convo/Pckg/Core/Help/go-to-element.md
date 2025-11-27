### GOTO element

Stops the current block execution and continues with the **read flow of another block**.

### When to use

Use **GOTO element** when you want to:

- Exit the current block and continue the conversation in a different block.
- Implement “jump to section” style navigation between topics.
- Centralize shared logic in a specific block and route users there.

### Properties

#### Block

Target block to jump to.

- Selected from the drop‑down list of available blocks.
- At runtime, the current block’s read phase is stopped and the target block is entered.

#### Wait for next

Controls when the target block will start processing:

- **Checked (true)** – finish executing the current flow, then change state.  
  On the next request, the **read** phase of the new state is skipped and processing starts immediately.
- **Unchecked (false)** – the state changes **immediately** and the target block starts handling the current request.

### Example

- You have a `help` block that explains how to use the skill.
- From another block, place **GOTO element**:
  - **Block**: `help`
  - **Wait for next**: `false` (jump to help right away)

### Tips

- Use **GOTO** sparingly; overusing jumps can make the conversation hard to follow.
- Prefer named blocks with clear roles (e.g. `main_menu`, `help`, `goodbye`) and use GOTO to transition between them.


