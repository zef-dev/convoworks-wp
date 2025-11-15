# Convoworks WP – Build Guide

This document describes how to build the Convoworks WordPress plugin for:

- **Local development** – plugin folder mounted directly into a local WordPress install.
- **Full, WordPress.org‑ready packages** – with scoped PHP dependencies and cleaned, distributable zips.

It also explains how the **frontend bundles** (admin GUI and chatbox) are produced.

---
## 1. Prerequisites

- **PHP**: 7.2.5+
- **Composer**: latest stable
- **Node.js & npm**
- **WordPress**: 5.3+ for runtime
- **php‑scoper** (required for full/scoped builds)
  - Either global:
    ```bash
    composer global require humbug/php-scoper
    ```
  - Or installed in `vendor/bin` within this project.

Optional but recommended:

- Git (for version control)
- A local WordPress installation where this repository is checked out under `wp-content/plugins/convoworks-wp`.

---
## 2. Frontend builds

The plugin has two main JS bundles:

1. **Admin GUI (backend editor)**
   - Webpack config: `webpack.config.wp.js`
   - Entry: `app/app.js`
   - Output: `public/assets/js/main.js` (plus `vendor.js` and other chunks).

2. **Frontend chatbox**
   - Webpack config: `webpack.config.chat.js`
   - Entry: `chat/index.js`
   - Output: `public/assets/chat/js/main.js` (plus `vendor.js` and other chunks).

### 2.1. Frontend build commands

From the project root:

```bash
# Install JS dependencies
npm install

# Build admin GUI bundle
npm run build:admin

# Build frontend chatbox bundle
npm run build:chat

# Build both (and clean first)
npm run build
```

`package.json` scripts:

- `clean` → `gulp clean`
- `build:admin` → `webpack --env ENV=prod --config webpack.config.wp.js`
- `build:chat`  → `webpack --env ENV=prod --config webpack.config.chat.js`
- `build`       → `npm-run-all clean build:admin build:chat`

#### Bundle analysis

To inspect bundle contents and sizes:

```bash
# Admin bundle analysis
npm run analyze:admin
npm run analyze:admin:vendor
npm run analyze:admin:main

# Chat bundle analysis
npm run analyze:chat
npm run analyze:chat:vendor
npm run analyze:chat:main
```

These use `webpack-bundle-analyzer` and `source-map-explorer` with the generated source maps.

### 2.2. Prebuilt admin/dashboard assets and legacy pipeline

In addition to the Webpack bundles described in **2.1**, the admin/dashboard UI relies on several prebuilt assets that are committed to the repository and treated as static artifacts:

- `public/assets/legacy/js/app.js`
- `public/assets/legacy/css/framework.css`
- `public/assets/legacy/css/app.css`
- `public/assets/legacy/css/wp.css`

These files are **not** rebuilt by the regular frontend commands (`npm run build`, `npm run build:admin`, `npm run build:chat`). They are already present in `public/assets/` and are loaded by the WordPress plugin at runtime as-is.

Historically, some of these assets were produced by an older SCSS/JS pipeline (Laravel Mix, Bower, etc.), but that pipeline is no longer part of the supported build workflow and its details are intentionally omitted here.

Gulp is still used in the **release pipeline**, but only for packaging purposes:

- Cleaning `dist/`
- Copying the built plugin files into `dist/convoworks-wp`
- Fixing line endings where needed
- Creating the distributable zip (`dist/convoworks-wp-vX.Y.Z.zip`)

Developers do **not** need to run any Gulp tasks for SCSS or JS bundling. For frontend development, only the Webpack-based commands from **2.1** are relevant.

---
## 3. Backend builds

There are two main backend build modes:

1. **Local development build** – no scoping, plugin lives directly under `wp-content/plugins/convoworks-wp`.
2. **Full scoped build** – PHP dependencies are prefixed and stripped down for a distributable zip suitable for WordPress.org.

### 3.1. Local development build (unscoped)

Use this when you’re actively developing in a local WordPress install.

1. Clone the repository into your WordPress plugins directory:
   ```bash
   cd /path/to/wordpress/wp-content/plugins
   git clone https://github.com/zef-dev/convoworks-wp.git convoworks-wp
   cd convoworks-wp
   ```

2. Install PHP dependencies. By default:
   ```bash
   composer update
   ```

   If you want to pull some Convoworks packages from local paths (monorepo/dev setup), use `composer-dev.json` as the Composer file, e.g. on PowerShell:

   ```powershell
   $env:COMPOSER = "composer-dev.json"
   composer update
   ```

3. Install JS dependencies and build assets:
   ```bash
   npm install
   npm run build           # builds admin + chat bundles
   # Optionally: npm run build:admin / npm run build:chat
   ```

4. Activate **Convoworks WP** in the WordPress admin plugins screen.

In this mode, php‑scoper is **not** used. All vendor code is present and unprefixed, which is fine for a dedicated local site.

### 3.2. Full scoped build – RC vs final (WP.org‑ready packages)

Use this when you want a **clean, distributable plugin zip** with PHP dependencies scoped to avoid conflicts with other plugins.

There are two main entrypoints:

```bash
# Final / production release (no source maps in JS bundles)
npm run release

# RC (release candidate) build – same PHP pipeline, JS bundles with source maps
npm run release:rc
```

`release:rc` will:

1. Bump the `-RC` suffix in `package.json` (e.g. `0.24.00-RC23` → `0.24.00-RC24`).
2. Propagate the new version into `convo-plugin.php`.
3. Run the same full release pipeline as `npm run release`, but using the **RC frontend build** (`npm run build:rc`).

In both cases, the script runs the following steps:

1. **Frontend build**
   - For **final** releases:
     - `npm run build` → builds admin (`public/assets/js/main.js`) and chat (`public/assets/chat/js/main.js`) bundles **without source maps**.
   - For **RC** releases:
     - `npm run build:rc` → builds the same admin and chat bundles, but with **source maps enabled** to aid debugging and bundle analysis.

> **Important:** The PHP side (Composer + php‑scoper) is identical for `release` and `release:rc`. Both use `composer.json` and the same scoping rules; the only difference is how JS assets are built and the `-RC` version suffix.

In both cases, after the frontend build the script runs the following steps:

2. **Prepare workspace**
   - `node scripts/prepare-workspace.js`
   - Creates `.workspace/convoworks-wp`.
   - Copies only the required files from the repo into that directory, mirroring the rules in `gulpfile.js`’s `copy` task:
     - Excludes dev artifacts like `.git`, `node_modules`, Webpack configs, `dist`, `env`, `app`, etc.
   - Ensures `vendor/zef-dev/*` sources are copied into the workspace in a controlled way (just `src` + some metadata), so path‑based packages work in the scoped build.

3. **Scope PHP dependencies**
   - `node scripts/php-scoper.js`
   - Inside `.workspace/convoworks-wp` it:
     1. Runs `composer update --no-dev` using `composer.json` to materialize vendor.
     2. Runs **php‑scoper** with `scoper.inc.php`:
        - Prefixes vendor and src with the `Convoworks` namespace.
        - Applies patchers to keep WordPress globals/classes (`WP_*`, `wp_*`, `get_*`, `set_*`, `esc_attr`) unscoped where needed.
        - Applies project‑specific fixes for Simply Schedule Appointments, Formidable, RTB, Guzzle, etc.
     3. In `.workspace/build`:
        - Runs `composer dump-autoload` based on `composer.json` / `composer.lock`.
        - Removes `composer.json` and `composer.lock` from the build.
     4. Runs `fix-autoloader.php` to adjust Composer autoload arrays, prefixing keys with `Convoworks…`.
     5. Updates `convo-plugin.php` to load `vendor/scoper-autoload.php` instead of `vendor/autoload.php`.
     6. Copies the **scoped build** into `dist/convoworks-wp`, overlaying it on top of non-PHP assets (assets, public, readme files, etc.).
     7. Cleans the `.workspace` directory.

4. **Zip distributable**
   - `npm run zip` → runs `gulp zip` in the project root.
   - Gulp:
     - Uses the version from `package.json`.
     - Zips `dist/convoworks-wp` into `dist/convoworks-wp-v<version>.zip`.

The resulting **WordPress.org‑ready package** lives in:

```text
dist/
  convoworks-wp/          # unzipped scoped plugin
  convoworks-wp-vX.Y.Z.zip
```

You can upload that zip to WordPress or use it for distribution.

---
## 4. Composer variants

There are multiple Composer files you may use depending on context:

- `composer.json`
  - Default production dependencies for the plugin.
- `composer-dev.json`
  - Same requirements, but adds a `path` repository (e.g. `../../*`) so Convoworks packages can be resolved from local filesystem paths.
  - Intended for local development scenarios where you explicitly set `COMPOSER=composer-dev.json`. The php-scoper release workflow always uses `composer.json`.

When running builds that rely on a specific Composer file, make sure the correct file exists and that `php-scoper` can see it from inside `.workspace/convoworks-wp`.

---
## 5. Troubleshooting

### 5.1. `node-sass` / `node-gyp` / Python on Windows

If frontend builds fail on Windows with `python not found` or `node-gyp` errors, see the “node-sass fails with an error `python not found`” section in the main `README.md`. In short:

- Install `windows-build-tools` globally:
  ```powershell
  npm install --global windows-build-tools
  ```
- Ensure the installed Python path is added to your user `PATH`.
- Disable Microsoft Store `python.exe` app execution aliases if they interfere.

### 5.2. php‑scoper not found

If `npm run release` or `scripts/php-scoper.js` fail with `php-scoper: command not found`:

- Install php‑scoper globally:
  ```bash
  composer global require humbug/php-scoper
  ```
- Or install it into this project and ensure `vendor/bin` is on the PATH.
