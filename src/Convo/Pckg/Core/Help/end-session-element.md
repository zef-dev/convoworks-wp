### End Session

Send an **end session** signal to the device, closing the current conversation session.

### When to use

Use **End Session** when:

- The conversation is finished (e.g. user said “goodbye”).
- You want to explicitly end the session after a final response.

### Runtime behavior

Once this element is executed:

- The current session is marked as ended.
- No further components are executed after this element.

### Example

At the end of a goodbye flow:

- Text Response: “Thanks for using this skill. Goodbye!”
- End Session.

### Tips

- Always pair **End Session** with a user‑facing message so users are not left with silence.
- Avoid placing elements after **End Session** in the same flow; they will not run.


