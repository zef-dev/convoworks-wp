### Seek Audio Playback by Search

Start audio playback by **searching** the current playlist for a matching song.

### When to use

Use **Seek Audio Playback by Search** when:

- You want users to start playback by saying the name (or partial name) of a song.
- You already have a playlist loaded in the media context.

### Runtime behavior

- Initiates audio playback by searching within the **current playlist**.
- **Closes the current session**, as audio players operate outside standard service sessions.

### Properties

#### Search term

Term used to find the desired song.

- Typically comes from user input.
- Can be an expression, e.g. `${user_search}`.

### Fallback behavior

- If the search term has no matches in the playlist, the element executes its **fallback** flow.
- If you are unsure whether there are any songs to play, combine this with **Media info element** to distinguish between “no data” and “not found” cases.

### Tips

- Normalize or preprocess the search term (e.g. trimming, lowercasing) before passing it in.
- Provide clear feedback when no match is found (e.g. “I couldn’t find that song in your playlist.”).


