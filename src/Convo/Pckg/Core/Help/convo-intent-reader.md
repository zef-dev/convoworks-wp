### Convo Intent

Match incoming requests against **Convo intent definitions** configured in the editor.

### When to use

Use **Convo Intent** when you want to:

- React to intents defined in your Convoworks service.
- Use slots/entities defined in those intents.

### Properties

#### Intent

Intent to match.

- Chosen from a drop‑down populated automatically with:
  - Intents defined in your service.
  - System intents defined in installed packages.

Below the selector, you can see slot names and example values used in utterances, which indicates what data you can expect.

#### Required slots

Comma‑separated list of slot names that **must** be present.

- If any listed slot is missing or empty in the incoming request, the filter is rejected, even if the intent name matches.

#### Predefined values

Static name–value pairs added to the `result` object.

- **Not** slots; they do not affect matching.
- Useful for attaching constant metadata.

#### Rename values

Rename incoming slot values on the `result` object.

- Helpful when you want internal variable names to differ from platform slot names.

### Result variables

Once matched, slot values are available on `result`:

- `${result.city}` – value of the `city` slot.
- `${result._city}` – full platform slot structure for `city`.

### Tips

- Use **Required slots** to enforce that critical pieces of information are present.
- Remember that **Predefined values** and **Rename values** do not by themselves cause the intent to match.


