### Conversation block

The foundational building block of any conversation service. Each block is a contextual unit you can think of as a **topic** of conversation or, if you come from web development, a **page** in your sitemap.

### When to use

Use **Conversation block** for almost all user flows:

- Represent topics like “Main menu”, “Help”, “Order details”.
- Group elements (responses) and processors (request handlers) that belong to the same context.

### Properties

#### Elements

Child elements that define what the block says or does during the **read** phase.

#### Processors

Child processors that handle user input during the **process** phase.

### Special role conversation blocks

Some blocks have special roles that change when they are executed:

- **Session started** – runs automatically when a new session starts (if present).
- **Session ended** – runs just before a session ends (if present).
- **Service processors** – block that only has a processors slot which is active throughout the entire service (e.g. global help).
- **Media block** – handles media (audio) requests like starting playback, shuffling, rewinding. See **Media block** help for details.
- **Loop block** – runs once for each item in a collection. See **Loop block** help for details.

### Example

Create a `main_menu` Conversation block:

- In **Elements**, add a Text Response: “Welcome! You can ask about your orders or account.”
- In **Processors**, add Simple Processors that react to “orders”, “account”, or “help”.

### Tips

- Use descriptive block names that reflect user intent (e.g. `help`, `order_status`, `goodbye`).
- Keep each block focused on a single topic to make services easier to navigate and maintain.


