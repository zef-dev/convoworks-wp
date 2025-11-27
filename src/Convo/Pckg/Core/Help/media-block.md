### Media Block

Handle media playback requests (sessionless audio playback) and related user controls.

### When to use

Use **Media Block** when:

- You initiate audio streaming on supported devices.
- You need to handle playback control actions (Next, Previous, loop, shuffle, etc.).

### Overview

On smart speaker devices, audio playback behaves differently from regular conversational flows:

- Once audio playback starts, the **audio player** takes control and the normal service session stops.
- While in media mode, users can:
  - Ask for **Next** or **Previous** track.
  - Toggle **loop** and **shuffle**.
- These commands are handled automatically by the **Media Block**.

While executing child flows (e.g. “next not available”), you have access to:

- `media_info` – information about the current playlist item and context.
- `last_media_info` – information accumulated since playback started.

### Last media info examples

Examples of how to use `${last_media_info}`:

- `${last_media_info.count}` – number of songs found since playback started.
- `${last_media_info.last}` – `true` if the current song is the last since playback started.
- `${last_media_info.first}` – `true` if the current song is the first.
- `${last_media_info.song_no}` – human‑friendly song number.
- `${last_media_info.song_no - 1}` – 0‑based index.
- `${last_media_info.loop_status}` – last known loop status.
- `${last_media_info.shuffle_status}` – last known shuffle status.
- `${last_media_info.playing}` – whether something was playing.
- `${last_media_info.current.artist}` – current song artist.
- `${last_media_info.current.songTitle}` – current song title.
- `${last_media_info.current.fileUrl}` – current file URL.
- `${last_media_info.current.songImageUrl}` – current song image URL.
- `${last_media_info.current.songBackgroundUrl}` – current background image URL.
- `${last_media_info.next.artist}` – next song artist.
- `${last_media_info.next.songTitle}` – next song title.
- `${last_media_info.next.fileUrl}` – next file URL.
- `${last_media_info.next.songImageUrl}` – next song image URL.
- `${last_media_info.next.songBackgroundUrl}` – next song background image URL.

### Tips

- Combine **Media Block** with **Media info element** to customize responses based on available media.
- Use `last_media_info` to build rich resume/continue experiences for users returning to playback.


