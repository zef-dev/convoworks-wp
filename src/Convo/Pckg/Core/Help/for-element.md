### For Loop

Repeat a sequence of elements a specific number of times.

### When to use

Use **For Loop** when you know in advance how many times an action should repeat:

- Simple counters (e.g. countdowns).
- Limited retries or attempts.
- Looping over a fixed number of steps.

### Properties

#### Count

Number of times to iterate the loop.

- Evaluated as a number.
- If `Count` is `5`, the loop will run up to 5 iterations (unless `Loop until` stops it earlier).

#### Status variable

Name under which loop status information is exposed.

- Example name: `status`
- Used without `${}` in the editor.

On each iteration, you can access:

- `${status.index}` – programmatic index (starts at 0).
- `${status.natural}` – human‑friendly index (starts at 1).
- `${status.first}` – `true` on the first iteration.
- `${status.last}` – `true` on the last iteration.

#### Loop Until

Expression that, when truthy, stops the loop **before** all iterations are complete.

Example:

> `${status.index >= 3}`

### Elements (flow)

Child elements executed on each loop iteration.

### Example

Countdown from 3 to 1:

- **Count**: `3`
- **Status variable**: `status`
- Inside **Elements**, add a Text Response with:

> `Countdown: ${4 - status.natural}`

### Tips

- Use `Loop Until` to break out early based on dynamic conditions.
- Keep heavy logic inside child elements and use the status variable only for control flow and display.


