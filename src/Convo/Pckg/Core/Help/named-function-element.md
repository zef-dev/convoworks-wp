### Function Element

Define a reusable workflow as a **function** that can be invoked from expressions.

### When to use

Use **Function Element** when you want to:

- Encapsulate frequently used logic into a callable function.
- Execute a sequence of steps and return a result that can be used in expressions.

Typical examples:

- Complex calculations.
- Shared formatting or transformation logic.

### Properties

#### Function name

Name used to invoke the function in expressions.

- Must be a valid identifier.
- Example: `myFunction`

Invocation example:

> `${myFunction(arg1, arg2)}`

#### Function arguments

List of arguments the function accepts.

Each argument can have:

- **Name** – argument name.
- **Default value** – used when no value is passed for that argument.

#### Result variable name

Name of the variable where the function’s result will be stored.

- Inside the function body, you use **Set Parameter** to assign the result to this variable.
- The function returns the value stored under this name.

#### OK flow

Body of the function – steps executed when the function is called.

- Can contain any conversation elements or logic.
- Must set the result variable using **Set Parameter** before finishing.

### How to use in expressions

1. Place and configure **Function Element** in your workflow.
2. Later, call it from expressions using its function name:

> `${myFunction("value1", "value2")}`

The provided arguments map to the configured function arguments. The function runs its **OK flow**, sets the result variable, and returns that value to the caller.

### Tips

- Keep function bodies focused on a single responsibility.
- Use descriptive function names and argument names to make expressions self‑explanatory.


