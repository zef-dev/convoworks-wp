### Media info element

Provide information about current songs in the connected **Media Context** component.

### When to use

Use **Media info element** when you want to:

- Check whether there are any results in the current playlist.
- Adjust your workflow based on media metadata (count, current/next track, etc.).

### Flows

The element has two flows:

- **Has results** – executed when there are songs in the current media context.
- **No results** – executed when there are no songs to play.

Inside these flows, you can use the injected `media_info` variable to tailor responses.

### Properties

#### Source

The media source context component to read from.

- See the help file of the selected media source context to understand which fields are available on `media_info`.

### Tips

- Use `media_info` to create informative prompts like:  
  > “There are ${media_info.count} songs and you are on the last one.”
- Pair **Media info element** with playback actions (start, seek, fast‑forward/rewind) to guard against empty playlists.


