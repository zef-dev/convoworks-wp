# Convoworks WP – Agent Documentation

This document provides an overview of the Convoworks WP project and points to detailed documentation for different aspects of the codebase.

---

## Project Overview

**Convoworks WP** is a WordPress plugin that provides a no-code workflow automation solution. It allows users to build conversational interfaces, automate workflows, and integrate with various platforms (Alexa, Viber, Convo Chat, WordPress hooks, etc.) through a visual editor.

### Key Components

- **PHP Framework** (`src/`) – Core Convoworks workflow engine and WordPress integration
- **Admin GUI** (`app/`) – AngularJS-based visual editor for building services
- **Frontend Chatbox** (`chat/`) – React-based chat interface for end users
- **Build System** – Webpack for frontend assets, Composer + php-scoper for PHP dependencies

### Technology Stack

- **Backend**: PHP 7.2.5+, WordPress 5.3+
- **Frontend Admin**: AngularJS, ui-router, Webpack
- **Frontend Chat**: React, Webpack
- **Build Tools**: Composer, npm, php-scoper, Gulp

---

## Documentation

For detailed information on specific areas of the project, see:

### 📦 [Build Guide](AGENTS-PROJECT-BUILD.md)

Complete guide to building the plugin for:
- Local development
- Production releases (scoped packages)
- Frontend bundle compilation
- Troubleshooting build issues

### 🎨 [Admin GUI (AngularJS)](app/AGENTS_CONVOWORKS_ADMIN_JS.md)

Documentation for the admin interface:
- AngularJS app structure and routing
- Service editor components
- Workflow editor implementation
- How to make changes to the admin UI

### ⚙️ [PHP Framework](src/AGENTS_CONVOWORKS_FWRK.md)

Framework architecture and conventions:
- Core namespaces and responsibilities
- Service execution flow
- Where to implement new features
- PHP coding conventions

---

## Quick Start

1. **Local Development Setup**
   ```bash
   composer update
   npm install
   npm run build
   ```

2. **Making Changes**
   - Admin UI changes: Edit files in `app/`, then run `npm run build:admin`
   - PHP changes: Edit files in `src/`, no build step needed (unless using scoped build)
   - Chat UI changes: Edit files in `chat/`, then run `npm run build:chat`

3. **Release Build**
   ```bash
   npm run release        # Production release
   npm run release:rc     # Release candidate with source maps
   ```

For more details, refer to the documentation files linked above.

