### WP Album Media Context

Performs a `WP_Query` and exposes the result as a media source for Convoworks audio player components.

Use it to build playlists from custom post types (albums) whose posts or post meta store audio files.

### When to use

Use **WP Album Media Context** when:

- You have a custom post type (for example, `album`) that represents a playlist.
- Audio file URLs and related metadata are stored in posts or in post meta.
- You want to expose albums as playable playlists to Convoworks media components.

### Properties

#### Context ID (`id`)

Unique ID by which this context is referenced, e.g.:

- `search_media`
- `${ALBUM_CONTEXT_ID}`

Used in expressions like:

```text
${contexts['search_media']}
```

#### WP_Query args (`args`)

Arguments passed directly to the underlying `WP_Query`.

- Default:

  ```text
  {
    post_type:   "album",
    post_status: "publish",
    orderby:     "title",
    order:       "ASC"
  }
  ```

- All arguments are passed to the real `WP_Query` class except:
  - `offset` is assumed to be `0`.
  - `paged` is always set so there is **no pagination** inside this context.
- Use `posts_per_page` to control the maximum number of posts in a playlist (20 by default).

You can use expressions in argument values, evaluated in the **service scope** (not inside per-item loop variables).

#### Songs of Album (`songs_of_album`)

Expression that resolves to an **array of songs** for the current album post (e.g. from post meta).

Example:

```text
${get_post_meta(post.ID, "album", true)}
```

This should produce an array containing song-related data for the album.

#### Song of Album (`song_of_album`)

Name for a **single song** from the `Songs of Album` collection.

- This is the identifier used when referring to individual songs in song-related expressions.

Example:

- `song`

#### Song URL (`song_url`)

Expression that evaluates to the URL of the song audio file.

Examples:

- `${song.file_url}`
- `${get_post_meta(post.ID, "audio_url", true)}`

#### Song Title (`song_title`)

Expression that evaluates to the song title.

Examples:

- `${song.title}`
- `${post.post_title}`

#### Artist (`artist`)

Expression that evaluates to the artist name.

Examples:

- `${song.artist}`
- `${get_post_meta(post.ID, "artist", true)}`

#### Song image (`artwork_url`)

Expression for the song image URL.

- If empty, the context will:
  - Try to use the post thumbnail.
  - Fallback to **Default song image** if both are missing.

Examples:

- `${song.cover_url}`
- `${get_the_post_thumbnail_url(post.ID, "large")}`

#### Background image (`background_url`)

Expression for the background image URL (e.g. used in player UI).

Examples:

- `${get_post_meta(post.ID, "background", true)}`
- `${artwork_url}` (reuse song artwork)

#### Default song image (`default_song_image_url`)

Expression that resolves to a default image URL if no song/post thumbnail image is available.

Examples:

- `"https://example.com/default-song.jpg"`
- `${assets.default_song_image}`

#### Default loop status (`default_loop`)

Initial loop mode for the player.

- Empty → treated as `false`.
- Otherwise, must evaluate to a boolean.

Examples:

- `${true}`
- `${session.user_prefers_loop}`

#### Default shuffle status (`default_shuffle`)

Initial shuffle mode for the player.

- Empty → treated as `false`.
- Otherwise, must evaluate to a boolean.

Examples:

- `${false}`
- `${params.initial_shuffle}`

### Runtime behavior

This context:

- Runs `WP_Query` with the configured **args**.
- Builds a playlist (array of `IAudioFile` instances) based on the configured song expressions.
- Stores media information that can be consumed by connected media components (e.g. Media Info element, Media Block).

The media info structure contains, among others:

- `current` – current `IAudioFile`.
- `next` – next `IAudioFile`, if any.
- `count` – total number of songs in the playlist.
- `last` – boolean, whether the current song is the last.
- `first` – boolean, whether the current song is the first.
- `song_no` – current song number (starting from 1).
- `loop_status` – boolean, whether loop mode is enabled.
- `shuffle_status` – boolean, whether shuffle is enabled.
- `playing` – boolean, whether the player is currently playing.

### Example

1. Add **WP Album Media Context** with:

   - **Context ID**: `search_media`
   - **WP_Query args**:

     ```text
     {
       post_type:   "album",
       post_status: "publish",
       posts_per_page: 20
     }
     ```

   - **Songs of Album**: `${get_post_meta(post.ID, "album", true)}`
   - **Song of Album**: `song`
   - **Song URL**: `${song.url}`
   - **Song Title**: `${song.title}`
   - **Artist**: `${song.artist}`

2. Connect a media player component to this context ID so it plays the generated playlist.

### Tips

- Test your `WP_Query` configuration in WordPress first to be sure it returns the albums you expect.
- Keep expressions for song data simple and well-structured; push complex logic into post meta or helper functions.
- Use **Default loop status** and **Default shuffle status** to match the UX you want users to see when they start the player.


