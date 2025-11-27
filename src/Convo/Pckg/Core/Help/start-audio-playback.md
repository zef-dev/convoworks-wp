### Start Audio Playback

Start audio playback in the connected media context.

### When to use

Use **Start Audio Playback** when you want to:

- Start playing a playlist or specific track.
- Resume playback from the last known position.

### Runtime behavior

- Starts audio playback via the configured media context.
- **Closes the current session** – audio players are a device feature and do not run within a normal conversation session.

### Properties

#### Index

Optional index of the selected song to play.

- If provided and valid, that song starts playing.
- If invalid, the element executes its **fallback** flow.
- If left empty, playback starts from the **last played song** (resume).

### Usage notes

- If you are not sure whether there will be any songs to play, combine this element with **Media info element**, which has separate flows for “has data” and “no data”.

### Tips

- Always handle the case where there is nothing to play (empty playlist).
- Use media metadata (`media_info` / `last_media_info`) to give the user meaningful feedback before or after starting playback.


