### Fast Forward / Rewind Audio Playback

Fast‑forward or rewind the current audio playback in the connected media context.

### When to use

Use **Fast Forward / Rewind Audio Playback** when:

- You want to let users skip forward or back within the currently playing track.
- You have an active media context and playback running.

### Runtime behavior

- Adjusts the playback position by a configured number of seconds.
- **Closes the current session**, since audio playback is handled by the device’s audio player.

### Properties

#### Mode

Direction of the seek:

- **Forward** – jump forward by the specified offset.
- **Rewind** – jump backward by the specified offset.

#### Offset (seconds)

Amount of time to fast‑forward or rewind.

### Tips

- Combine with clear spoken feedback (e.g. “Skipping ahead 30 seconds.”).
- Make sure the offset is reasonable for the type of content (e.g. shorter for songs, longer for podcasts).


