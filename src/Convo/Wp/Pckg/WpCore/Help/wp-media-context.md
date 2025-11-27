### WP Media Context

Define a `WP_Query` that returns audio attachments and expose them as a **media playlist source** for Convoworks audio player components.

### When to use

Use **WP Media Context** when:

- You want to build a **playlist** from WordPress media library items (e.g. podcasts, music, lessons).
- You need to use audio player components (media blocks, media info, etc.) that consume an `AbstractMediaSourceContext`.
- You want to control song URL, title, artist, and artwork using expressions.

### Properties

#### Context ID (`id`)

Unique ID that identifies this media context in the service.

- Example: `search_media`.
- Other components (e.g. media blocks) will reference it by this ID.

#### WP_Query args (`args`)

Arguments passed to the underlying `WP_Query` to select audio attachments.

Default:

- `post_type`: `attachment`
- `post_mime_type`: `audio/mpeg`
- `post_status`: `all`
- `orderby`: `title`
- `order`: `ASC`

You can use expressions in argument values (evaluated in the service context).  
Note that:

- `offset` is forced to `0`.
- `paged` is forced to `true`.
- If `posts_per_page` is not set or not numeric, it will default to `100` (see `DEFAULT_MAX_RESULTS`).

#### Song URL (`song_url`)

Expression used to compute the URL of each song.

- If empty, `wp_get_attachment_url($post->ID)` is used.
- You can reference the current attachment as `post` in the expression:
  - Example: `${get_post_meta(post.ID, 'audio_url', true)}`.

#### Song Title (`song_title`)

Expression used to compute the song title.

Fallback chain:

1. Evaluated `song_title` expression (if non-empty).
2. Attachment metadata title (`$meta['title']`).
3. Post title (`$post->post_title`).

The current post is available as `post` in the expression.

#### Artist (`artist`)

Expression used to compute the song artist.

Fallback chain:

1. Evaluated `artist` expression (if non-empty).
2. Attachment metadata `artist`.
3. If numeric or empty, falls back to metadata `album`.

The current post is available as `post` in the expression.

#### Song image (`artwork_url`)

Expression used to compute artwork image URL.

Fallback chain:

1. Evaluated `artwork_url` expression (if non-empty).
2. `get_the_post_thumbnail_url()` for the attachment.
3. Evaluated `default_song_image_url` expression.

#### Background image (`background_url`)

Expression used to compute the background image URL for the current track.

The current post is available as `post`.

#### Default song image (`default_song_image_url`)

Default artwork URL used if no thumbnail or explicit artwork is available.

Expression evaluated in the service context, often also using `post`.

#### Default loop status (`default_loop`)

Initial **loop mode** for the player.

- Empty string → `false` (loop off).
- Any expression evaluating to a boolean will be used as the initial state.

#### Default shuffle status (`default_shuffle`)

Initial **shuffle mode** for the player.

- Empty string → `false` (shuffle off).
- Any expression evaluating to a boolean will be used as the initial state.

### Runtime behavior

At runtime:

1. The context evaluates `args` using the service, forcing:
   - `offset = 0`
   - `paged = true`
   - A valid `posts_per_page` (defaults to 100 if missing).
2. Creates or reuses a `WP_Query` with those arguments.
3. Builds (or reuses) a **playlist model** in its internal state:
   - Maintains a list of post indexes.
   - Applies shuffle if `shuffle_status` is set.
4. When `getSongs()` is called:
   - Rewinds the `WP_Query` and iterates over attachments.
   - For each post, computes:
     - URL
     - title
     - artist
     - artwork
     - background
   - Yields an `Mp3File` for each result.

The media player components use this context to provide:

- Current track
- Next track
- Playlist count and position
- Loop and shuffle status

### Example

Playlist of all podcast episodes:

- **Context ID**: `podcast_playlist`
- **WP_Query args**:
  - `post_type` → `attachment`
  - `post_mime_type` → `audio/mpeg`
  - `post_status` → `inherit`
  - `orderby` → `date`
  - `order` → `DESC`
- **Song Title**:
  - `${get_post_meta(post.ID, 'episode_title', true) ?: post.post_title}`
- **Artist**:
  - `${get_post_meta(post.ID, 'podcast_author', true)}`
- **Song image**:
  - `${get_the_post_thumbnail_url(post.ID) ?: default_cover_url}`
- **Default shuffle status**:
  - `${true}`

Then attach a media player block to `podcast_playlist` to allow users to play, pause, skip, loop, and shuffle.

### Tips

- Keep your `posts_per_page` high enough to cover your intended playlist but not so high that queries become slow.
- Always sanity‑check your expressions for URLs and titles, and provide reasonable fallbacks via metadata and post titles.
- Use `default_loop` and `default_shuffle` to align the initial player behavior with your UX (e.g. podcasts usually do not loop; music playlists often start with shuffle off).


