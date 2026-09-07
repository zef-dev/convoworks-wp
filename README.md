# Convoworks WP

WordPress plugin for the Convoworks visual workflow engine: drag-and-drop services, WordPress hooks, a REST/API builder, and a web chat. The framework, WP integration, AngularJS admin, and chat frontend all live in this tree.

**This repository is archived and unmaintained.** Last development version: **0.24.01**.

## Status

- The [WordPress.org listing](https://wordpress.org/plugins/convoworks-wp/) was closed on 8 April 2025. Last directory release was 0.22.44.
- Versions 0.23–0.24 were distributed from a private update channel on [convoworks.com](https://convoworks.com). The plugin header still carries that `Update URI`; treat it as historical, not a supported feed.
- Related public repositories:
  - [convoworks-core](https://github.com/zef-dev/convoworks-core) — PHP framework (this plugin inlines a later copy under `src/Convo`)
  - [convoworks-gpt](https://github.com/zef-dev/convoworks-gpt) — GPT package as a separate plugin
  - [convoworks-editor](https://github.com/zef-dev/convoworks-editor) — standalone service editor
  - [zef-expression-language](https://github.com/zef-dev/zef-expression-language)

`readme.txt` is the WordPress.org listing copy (changelog, screenshots). This file is the GitHub landing page.

## Requirements

- PHP 7.4+
- WordPress 5.0+
- Composer and Node.js/npm to build from source

## Local development

Check this repo out under `wp-content/plugins/convoworks-wp` (or symlink it there).

```bash
composer install
npm install
npm run build
```

For a local install that uses Composer’s `vendor/autoload.php` instead of the php-scoper autoload, define in `wp-config.php` **before** the plugin loads:

```php
define('CONVOWP_LOCAL', true);
```

Optional, but you should set your own encryption key for the secret store (API keys and similar, kept in WP options):

```php
define('CONVOWORKS_SECRET_KEY', 'a long random string of your own');
```

If you leave it unset, the plugin falls back to a built-in default. Override it on any real site.

Admin UI changes live in `app/` (`npm run build:admin`). Chat UI in `chat/` (`npm run build:chat`). PHP under `src/` needs no frontend build unless you are making a scoped release.

`composer-dev.json` is a local-dev Composer file with path repositories to sibling packages. Production/release always uses `composer.json`.

## Release build

```bash
npm run release        # production zip
npm run release:rc     # release candidate with source maps
```

That pipeline builds the JS bundles, runs php-scoper on PHP dependencies, and writes a zip under `dist/`. Full notes: [AGENTS-PROJECT-BUILD.md](AGENTS-PROJECT-BUILD.md).

## Layout

| Path | What |
| --- | --- |
| `convo-plugin.php` | Plugin bootstrap |
| `src/Convo` | Framework + packages (inlined) |
| `src/Convo/Wp` | WordPress integration, admin REST, data layer |
| `app/` | AngularJS admin (visual editor) |
| `chat/` | Frontend chatbox |
| `views/` | PHP admin screens |
| `public/assets/` | Built / vendored frontend assets committed for runtime |
| `docs/` | Component-help conventions, AI KB patterns, unfinished debugger plan |

Agent-oriented maps of the codebase: [AGENTS.md](AGENTS.md), [app/AGENTS_CONVOWORKS_ADMIN_JS.md](app/AGENTS_CONVOWORKS_ADMIN_JS.md), [src/AGENTS_CONVOWORKS_FWRK.md](src/AGENTS_CONVOWORKS_FWRK.md).

## License

[GNU General Public License v3.0 or later](LICENSE).
