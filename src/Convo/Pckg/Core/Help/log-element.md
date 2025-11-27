### Editor Log

A simple element used for logging messages in the editor. It does **not** affect the service’s runtime behavior.

### When to use

Use **Editor Log** when you want to:

- Log values or messages while designing and testing a service.
- Inspect parameters and expressions during execution.
- Leave a trace of what should happen at a certain point in the flow.

### Properties

#### Log message

Text or expression to log.

- Can contain expressions such as `${some_param}`.
- Visible in the editor logs / debug output, not to end users.

Example:

> `User id is ${user.id}, current step is ${step}`.

### Tips

- Use logs while developing or troubleshooting; remove or simplify them once the flow is stable.
- Avoid logging sensitive information (passwords, tokens, etc.).


