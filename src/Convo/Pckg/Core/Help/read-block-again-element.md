### Read block again

Restart the **read phase** of the block where this element is placed.

### When to use

Use **Read block again** when:

- You want to repeat the content of a block (e.g. repeat help instructions).
- You need to re‑run the block’s read logic after some condition or user action.

### Runtime behavior

- When executed, the current block’s read phase is restarted.
- The block’s elements are read again from the beginning.

### Example

Inside a help block:

- Ask: “Would you like me to repeat the help?”
- If the user says yes, use **Read block again** to replay the help content.

### Tips

- Avoid creating endless loops; ensure there is a path that eventually exits the block.
- Combine with processors and conditions to decide when repeating is appropriate.


