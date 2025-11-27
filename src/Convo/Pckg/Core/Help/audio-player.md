### Audio Player (deprecated)

> **Deprecated:** This element is kept for backwards compatibility. Prefer using the newer media components (Media Block, Start Audio Playback, etc.) for new designs.

Start or control audio playback using a URL and a playback **mode**, primarily for Alexa.

### When to use

Use **Audio Player** only in legacy services that already rely on it. For new services, use **Media Block** and related media elements instead.

### Properties

#### URL

Expression that evaluates to the audio file URL.

Example:

- `${audio_url}`

#### Mode

Playback mode (e.g. `enqueue` vs other modes, depending on platform support).

### Runtime behavior (legacy)

- Evaluates **URL** and **Mode**.
- Stores playback data in installation scope parameters:
  - `current_url`
  - `current_song_token`
  - `last_song_token`
  - `offset_milliseconds` (for resume)
- For Alexa (`AmazonCommandResponse`):
  - Sets url and mode on the response.
  - Manages song tokens for enqueueing.
  - Uses `offset_milliseconds` to resume where the user left off.
  - Prepares a `MEDIA_RESPONSE`.

### Tips

- Do not use this element in new workflows; migrate to **Media Block** and modern media elements when possible.


