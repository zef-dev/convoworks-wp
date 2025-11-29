# Convoworks Admin (AngularJS) – Agent Notes

These notes are meant as a **starting point for coding tasks** in the Convoworks admin GUI inside the `convoworks-wp` WordPress plugin.

The goal is to quickly answer: _“Where do I look in the AngularJS app when I need to change X in the admin?”_

---

## Top‑level structure

All admin AngularJS code lives under `./app/convoworks`.

- `./convoworks/index.js` – entry point for the admin AngularJS bundle
- `./convoworks/app.module.js` – Angular module definition
- `./convoworks/app.ui-route.js` – ui‑router states for the Convoworks admin

The main Convoworks GUI is defined in `./convoworks`.

- The **services list / landing view** is registered as state `convoworks-editor` in `app.ui-route.js` and uses:
  - template: `./convoworks/services/convoworks-menu.tmpl.html`
  - controller: `ConvoworksMainController` (`./convoworks/services/convoworks-main.controller.js`)
- When you **select a service**, ui‑router switches to the abstract state `convoworks-editor-service`:
  - url: `/convoworks-editor/:service_id`
  - template: `./convoworks/service/service-editor.tmpl.html`
  - controller: `ServiceEditorController`
  - this view hosts all editor tabs under the `serviceTabView` named view.

## Chatbox and common components

- `./convoworks/service/test/chatbox` – chatbox component used in the **Test** view
  - `chatbox.directive.js`
  - `chatbox.tmpl.html`
  - `convo-chat.scss`
- `./convoworks/common` – smaller reusable building blocks:
  - `alert-indicator.directive.js` / `.tmpl.html`
  - `alert-service.js`
  - `convoworks-api.js` – Angular service used to talk to the backend
  - `user-preferences.service.js`, `platform-status.service.js`, etc.

These are shared by multiple views (editor, test, external test, etc.).

---

## Building the admin bundle

Whenever you change the AngularJS admin code (anything under `./app/convoworks`), rebuild the admin assets from the plugin root:

```bash
npm install        # first time only, or when dependencies change
npm run build:admin
```

This updates the compiled JS/CSS served in the WordPress admin.

---

## Service editor – overview

Everything related to editing a single service is organized under `./convoworks/service/`.

Key files:

- `./convoworks/service/index.js` – service module
- `./convoworks/service/service-editor.controller.js` – top‑level controller for the service editor shell
- `./convoworks/service/service-editor.tmpl.html` – shell layout with the main toolbar and tabbed content area
- `./convoworks/service/service-context.directive.js` – **central service context** (explained below)

The **workflow editor** (main drag-and-drop editor) is under `./convoworks/service/editor/`:
- `./convoworks/service/editor/index.js` – editor module
- `./convoworks/service/editor/workflow/` – workflow editor components
- `./convoworks/service/editor/props/` – property editors and templates for individual components
- `./convoworks/service/editor/toolbox/` – toolbox UI with components used in the workflow editor
- `./convoworks/service/editor/notifications/` – notification component & helpers
- `./convoworks/service/editor/propagation/` – progress / status of propagation of changes to connected platforms

Routing for editor tabs is defined in `./convoworks/app.ui-route.js` under the `convoworks-editor-service.*` states.

### Service-related views

All paths below are under `./convoworks/service/` and correspond directly to ui‑router states in `app.ui-route.js`:

- `service/variables/` – **Service‑level variables editor**  
  State: `convoworks-editor-service.variables` (`/convoworks-editor/:service_id/variables`)
- `service/releases/` – **Manage service versions and frozen releases**  
  State: `convoworks-editor-service.releases`
- `service/config/` – **Core platforms configuration and enabling**  
  State: `convoworks-editor-service.configuration`  
  Additional, platform‑specific config states:
  - `configuration-amazon` – `<config-amazon-editor>`
  - `configuration-viber` – `<config-viber-editor>`
  - `configuration-convo-chat` – `<config-convo-chat-editor>`
- `service/intents/` and `service/entities/` – **Intent and entity definition for the legacy NLP (Amazon Alexa)**  
  States grouped under `convoworks-editor-service.intents-entities` + `intent-*` and `entity-*` states
- `service/import-export/` – **Import/export service definition as JSON**  
  State: `convoworks-editor-service.import-export`
- `service/test/` – **Test view (test chat)**  
  State: `convoworks-editor-service.test`  
  Uses the chatbox from `./convoworks/service/test/chatbox`.
- `service/editor/workflow/` – **Main and most complex section**  
  State: `convoworks-editor-service.editor`  
  Displays the service workflow as a drag‑and‑drop editor of blocks / subroutines.

---

## service-context.directive.js – "service context"

File: `./convoworks/service/service-context.directive.js`

This is one of the most important and complex pieces of the admin GUI. Conceptually it’s a **service context**:

- implemented as an **attribute directive** (`service-context`)
- provides a **controller API** that other directives/views can require
- designed so that, in theory, there could be **multiple independent contexts on the same page** (each bound to different `serviceId`), although in practice usually one is used.

### What it does

At a high level, `service-context` is responsible for:

- **Loading core data for the selected service**
  - component definitions and available packages (`ConvoworksApi.getComponentDefinitions`, `getAvailablePackages`)
  - service definition by id (`ConvoworksApi.getServiceById`)
  - service meta (`ConvoworksApi.getServiceMeta`)
- **Maintaining the current selection** inside the editor:
  - selected service, block, fragment, component definition, meta
  - container controller used for operations like delete / move
- **Managing edits and persistence**:
  - detects if the service has changed (`isServiceChanged`)
  - reverting changes (`revertChanges`)
  - saving changes (`saveChanges` → `ConvoworksApi.updateService`), emitting `ServiceWorkflowUpdated`
- **Managing blocks & subroutines** on the service:
  - `addBlock`, `removeBlock`, `findBlock`
  - `addReadSubroutine`, `addProcessSubroutine`, `removeSubroutine`, `findSubroutine`
  - `addNewComponent`, `moveComponent`, `removeComponent`
- **Intents & entities** helper API:
  - `getConvoIntents`, `addConvoIntent`, `updateConvoIntent`, `removeConvoIntent`
  - `addConvoEntity`, `updateConvoEntity`, `removeConvoEntity`, `getSystemEntities`
- **Clipboard / paste support**:
  - `paste(containerController, index)` uses `ConvoClipboardService` and `ConvoComponentFactoryService` to paste components into containers
- **Utility / lookup methods**:
  - `getComponentDefinitions`, `getComponentDefinition`
  - `getAvailablePackages`, `getSystemEntities`, `getSelection`, `getSelectedService`

The directive also reacts to events:

- `ServiceReleaseDevelopImport` → reloads the service (`reloadService`)
- `PackagesUpdated` → re‑initializes available packages/definitions
- `CtrlSPressed` (rootScope) → auto‑saves if there are unsaved changes

### How views use it (link function)

The `link` function exposes a narrower, view‑focused surface on `$scope`:

- exposes flags and actions used from templates:
  - `$scope.isServiceChanged`, `$scope.saveChanges`, `$scope.revertClicked()`
  - `$scope.getSelection`, `$scope.getSelectedService`
  - `$scope.addNewBlock`, `$scope.showNewReadSubroutine`, `$scope.showNewProcessSubroutine`
  - `$scope.removeBlock`, `$scope.removeSubroutine`
- maintains:
  - `$scope.availableBlockTypes` – runnable block types (implements `IRunnableBlock`)
  - `$scope.availableContexts` – datasource components
- listens for `PackageDefinitionsUpdated` to refresh block types and contexts.

If you need to add new workflow‑related actions or make block types/contexts appear in the toolbox, **this directive is usually where you plug into**.

---

## Editor support components

Several helper folders under `./convoworks/service/editor` contain components used across tabs:

- `service/editor/notifications/` – notification component & helpers
- `service/editor/propagation/` – progress / status of propagation of changes to connected platforms
- `service/editor/toolbox/` – toolbox UI with components used in the workflow editor
- `service/editor/props/` – property editors and templates for individual components (e.g. params editor templates)
- `service/editor/sync/` – sync‑related UI pieces
- `service/editor/actions/` – various editor actions and dialogs

When in doubt, search within `./convoworks/service/editor` for the component/directive/tag name you see in the template.

---

## Additional admin views (not in the main service editor)

Besides the core service editor, there are two additional settings areas implemented as separate AngularJS modules:

- `./api-builder` – **API builder** admin UI
  - `config-api-builder-editor.directive.js`
  - `config-api-builder-editor.tmpl.html`
  - `index.js` – module entry
- `./wp-hooks` – **WordPress hooks / integrations** admin UI
  - `config-wp-hooks-editor.directive.js`
  - `config-wp-hooks-editor.tmpl.html`
  - `index.js` – module entry

These are used for additional Convoworks component packages and external platforms, and appear as extra settings pages in the WordPress admin.

---

## Tips for agents

- **Start from the route**: when changing or adding a screen, first check `./convoworks/app.ui-route.js` to see which state, controller, and template are involved.
- **For anything inside a service** (workflow, variables, intents, config, test, etc.), expect it to depend on `service-context.directive.js` in some way.
- **For workflow changes**, you will almost always touch:
  - `./convoworks/service/editor/workflow/*`
  - `./convoworks/service/service-context.directive.js`
  - possibly `./convoworks/common/convoworks-api.js` if new backend calls are needed.
- **For new platform integrations**, look at how `config-amazon-editor`, `config-viber-editor`, and `config-convo-chat-editor` are wired under the `configuration-*` states in `./convoworks/service/config/`.
- In order to see changes, you have to run `npm run build:admin` and reload page.
