### Prompt Account Linking

Send a signal to the vendor platform to show the configured **account linking card**.

### When to use

Use **Prompt Account Linking** when:

- You need to link the user’s platform account with your backend or service account.
- Additional user information (profile, IDs, tokens) is required to proceed.

Typical scenarios:

- First‑time setup flows.
- Features that require authentication or access to user‑specific resources.

### Runtime behavior

- Triggers the platform’s account linking UI (card or screen), where supported.
- The user completes linking outside the normal conversation and then returns.

### Tips

- Clearly explain to the user **why** account linking is needed before triggering this element.
- Implement fallback handling for users who decline or fail to complete linking.


