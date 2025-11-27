### End Request

Stop the current service execution **for this request**.

### When to use

Use **End Request** when:

- Your response is fully prepared.
- No further components should be executed for the current request.

Typical cases:

- Early exit from a complex flow once you have an answer.
- Hard‑stopping execution after handling an error or special condition.

### Runtime behavior

Once this element is executed:

- No further elements or processors are run for the current request.
- The current response is returned to the platform.

### Tips

- Place **End Request** near the end of a branch where you know nothing else should run.
- Avoid combining it with elements that rely on further processing after it in the same request.


