### Yes No processor

A predefined processor that handles simple **yes/no** style answers.

### When to use

Use **Yes No processor** when you ask the user a yes/no question and want:

- To avoid manually wiring intents and sample utterances for all common yes/no variations.
- A quick way to branch the flow into **Yes** and **No** paths.

The processor matches phrases like “yes”, “sure”, “cool”, “no”, “nope”, “nah”, etc.

### Properties

#### Yes (flow)

Elements to execute if the user gives an affirmative response.

#### No (flow)

Elements to execute if the user gives a negative response.

### Example

Ask the user for confirmation:

1. Ask: “Do you want to continue?”
2. Add **Yes No processor**:
   - In **Yes** flow: continue with the main flow.
   - In **No** flow: say goodbye or offer alternatives.

### Tips

- Use this processor as a shortcut instead of manually creating yes/no intents and mapping them to a Simple processor.
- Keep the Yes/No flows simple and focused on what should happen next.


