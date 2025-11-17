# Convoworks Framework (PHP) – Agent Notes

These notes are meant as a **starting point for coding tasks** in the Convoworks PHP framework inside the `convoworks-wp` WordPress plugin.

---

## 1. What Convoworks Is

Convoworks is a **workflow handler framework**. It:

- Works with **workflow components** (PHP classes implementing core workflow interfaces)
- Executes them based on a **service definition** (JSON)
- Loads additional functionality through **packages** (core packages and WordPress‑specific packages)

This repository, **`convoworks-wp`**, is a **WordPress plugin** that embeds Convoworks as a PHP library and adds WordPress‑specific infrastructure and component packages.

- Generic framework / engine: `Convo\Core` (plus `Convo\Pckg`, `Convo\Providers` etc.)
- WordPress integration and WP‑specific packages: `Convo\Wp\*`

Originally Convoworks core lived as a separate PHP library, but it has been imported directly into this plugin for easier maintenance.

---

## 2. Main Namespaces & Responsibilities

This is the minimal map you should keep in mind when working on PHP code.

### 2.1 `Convo\Core`

This is the **framework core**. It is mostly WordPress‑agnostic.

Key areas:

#### a) Admin REST API – `Convo\Core\Admin`

Admin REST interface that powers the Angular editor and other admin operations.

Examples:
- `Convo\Core\Admin\AdminRestApi` – dispatches admin REST requests
- `Convo\Core\Admin\ServicesRestHandler` – CRUD operations on services
- `Convo\Core\Admin\ServiceImpExpRestHandler` – import/export of service definitions
- `Convo\Core\Admin\ServiceVersionsRestHandler` – manage service versions

When you see **REST admin operations** in the UI, the corresponding PHP handlers are typically here.

#### b) Workflow Interfaces – `Convo\Core\Workflow`

Defines the **core workflow contracts** used by all components/packages.

Important interfaces/classes (not exhaustive):
- `IConversationProcessor`, `IConversationElement`, `IConvoRequest`, `IConvoResponse`
- `AbstractWorkflowComponent`, `AbstractWorkflowContainerComponent`
- Various media and intent related interfaces (e.g. `IConvoAudioRequest`, `IIntentAwareRequest`, etc.)

If you are implementing a **new workflow component**, it will almost always:
- Implement one of the `Workflow` interfaces, and/or
- Extend one of the `Abstract*` base classes in this namespace.

#### c) Service Factory & Package Loading – `Convo\Core\Factory`

Defines how a **service definition JSON** is turned into a **`ConvoServiceInstance`** with all components wired.

Key classes:
- `Convo\Core\Factory\ConvoServiceFactory` – main entry point for building services
- `IComponentFactory`, `IComponentProvider`, `IPackageDescriptor`, `IPackageDefinition` – abstractions for packages and components
- `PackageProvider` / `PackageProviderFactory` – register and locate packages
- `PlatformRequestFactory`, `IPlatform`, `IRestPlatform` – mapping between external platform requests and Convoworks request/response objects

If you need to **register new packages, components, or platforms**, this is the place to look first.

#### d) Service Publishing / Releases – `Convo\Core\Publish`

Defines how we manage **service releases** for various platforms.

Important classes:
- `AbstractServicePublisher`
- `IPlatformPublisher`
- `PlatformPublisherFactory`
- `ServiceReleaseManager`

This is where logic for handling **published versions** of a Convoworks service lives.

#### e) Adapters (platform specific) – `Convo\Core\Adapters`

Contains adapters for different **request channels / platforms** that are not WordPress‑specific.

Examples (directories):
- `Adapters\Alexa`
- `Adapters\ConvoChat`
- `Adapters\Viber`
- Plus `PublicRestApi` etc.

Adapters translate **external requests** (e.g. Alexa, chat, Viber) into Convoworks request objects and build appropriate responses.

#### f) Other important core areas

- `Convo\Core\ConvoServiceInstance` – the actual **runtime service object** that is executed for a request
- `Convo\Core\Intent` – intent/entities model
- `Convo\Core\Params` – parameter storage and scopes (`RequestParamsScope`, `ComponentParamsScope`, etc.)
- `Convo\Core\Preview` – preview / test speech resources
- `Convo\Core\Rest` – low‑level REST support and exceptions
- `Convo\Core\Util` – shared utilities and middleware
- `Convo\Core\Migrate` – service migration scripts between Convoworks versions

---

### 2.2 `Convo\Wp`

WordPress integration layer. This is where Convoworks is hooked into WP and where WP‑specific components live.

Key areas:

- `Convo\Wp\Providers` – plugin bootstrap & WP integration
  - `Convo\Wp\Providers\ConvoWPPlugin` – main plugin provider/entry
  - `HooksRegistration` – registers API routes, hooks, etc.
  - `RouteRegistration`, `ShortcodeRegistration`, `AssetsProvider`, `PluginActivator`, `PluginInstaller`, `UpgradesProvider`

- `Convo\Wp\Http` – controllers for WP admin pages and REST endpoints
  - `DashboardController`, `GettingStartedController`, `ServicesController`, `SettingsController`, etc.
  - `Http\Api` subnamespace – lower‑level API controllers, PSR‑7 request adapter

- `Convo\Wp\Data` – WordPress‑backed implementations of data interfaces
  - E.g. `WpServiceDataProvider`, `WpServiceMediaManager`, `WpServiceParams`, `WpServiceParamsFactory`, `WpConvoServiceConversationRequestDao`

- `Convo\Wp\Pckg` – WordPress‑specific **component packages**
  - `ApiBuilder` – API‑builder components and platform
    - `ApiBuilderRestHandler`, `ApiBuilderPlatform`, `ApiBuilderPublisher`, component classes, template JSONs
  - `WpCore` – generic WP elements (DB access, loops, mail, remote requests, etc.)
  - `WpHooks` – components for working with WordPress hooks
  - `WpPluginPack` – integrations with selected external plugins (EasyAppointments, Formidable Forms, etc.)

- `Convo\Wp\DI\ServiceContainerFactory` – **central DI container builder** for the plugin, using Symfony’s `ContainerBuilder`.
  - `createSharedContainer()` wires all shared core and WP services: `ConvoServiceFactory`, `ServiceReleaseManager`, package definitions, WP data providers (`WpServiceDataProvider`, `WpServiceParamsFactory`, `WpServiceMediaManager`, `WpCache`, etc.), platform factories (`PlatformRequestFactory`, `PlatformPublisherFactory`), and event listeners.
  - `createAdminContainer()` and `createPublicContainer()` build **admin** and **public** containers on top of the shared one, configuring Monolog loggers, REST handlers (admin and public), and related services.
  - `getAdminMiddlewares()` and `getPublicMiddlewares()` return the **middleware stacks** (logging, body parsing, Convoworks/WP exception handling, gzip, JSON headers, etc.) used by the admin and public REST front controllers.
  - If you need to **add/modify REST handlers, services, or middlewares** at the WordPress/HTTP boundary, this is usually the first place to update.

WordPress related source is **always under `Convo\Wp`**.

---

## 3. How a Convoworks Service Is Executed

High‑level flow for a request:

1. **External request enters the system**
   - Through a specific adapter (e.g. Alexa adapter, Convo Chat adapter, WP hook, custom REST handler, etc.).

2. **Request is converted to Convoworks objects**
   - The adapter uses `PlatformRequestFactory` / `IPlatform` implementations to create an `IConvoRequest` and `IConvoResponse` for the current platform.

3. **Service is loaded**
   - `ConvoServiceFactory` reads the **service JSON definition**, resolves all packages and components, and builds a `ConvoServiceInstance`.

4. **Service is executed**
   - `ConvoServiceInstance` runs the workflow: components from different packages cooperate based on the JSON configuration.

5. **Response is returned to the platform**
   - The adapter maps the `IConvoResponse` back to the platform‑specific response (e.g. Alexa JSON, HTTP API response, WP hook return value).

---

## 4. Where to Look for Common Tasks

When working on future coding tasks, use this as a quick guide:

- **Add or modify admin REST endpoints**
  - Look in `src/Convo/Core/Admin/*` for core admin handlers
  - WordPress wrapping / routing is under `src/Convo/Wp/Http` and `src/Convo/Wp/Providers`.

- **Implement a new workflow component (generic, not WP‑specific)**
  - Start from `Convo\Core\Workflow` interfaces and abstract classes
  - Register it in a package under `Convo\Pckg` (or another suitable core package) via `Factory` mechanisms.

- **Implement WordPress‑specific functionality (query posts, send mail, call WP APIs, etc.)**
  - Check `Convo\Wp\Pckg\WpCore` and related help files
  - For hooks‑based integration, see `Convo\Wp\Pckg\WpHooks`.

- **Create or extend an integration package** (e.g. API Builder, external plugins)
  - Look in `Convo\Wp\Pckg\*` for examples of package definition JSONs, package PHP descriptors, and element implementations.

- **Work with service publishing / platform releases**
  - Use `Convo\Core\Publish` for the core publishing logic
  - For WordPress‑specific parts, check how platforms/publishers are wired in `Convo\Wp` packages.

---

## 5. Notes & Conventions

- Convoworks is **primarily a PHP library**, with WordPress acting as a host and management UI.
- Service definitions are **JSON** and live alongside package definitions; they are loaded and interpreted by `ConvoServiceFactory`.
- New functionality is usually added via **packages**:
  - Define package descriptor (`*PackageDefinition.php` / JSON)
  - Implement component classes (often in `Pckg/...`)
  - Wire them into Factory/Platform as needed.
- **Namespaces & backslashes**:
  - In PHP code, use normal `use` statements at the top of the file for classes (`use Convo\Core\Publish\ServiceReleaseManager;`).
  - Use a **single** backslash as the namespace separator in PHP code, including when passing class names as strings to DI (for example: `$containerBuilder->register('ServiceImpExpRestHandler::class, ServiceImpExpRestHandler::class);`).
  - The "double backslash" you sometimes see is usually an escaping artifact in **other** contexts (Markdown, JSON, regex). In PHP source, writing `\\Convo\\Core...` as a namespace is wrong; keep it as `\Convo\Core...` in code and let external formats handle any extra escaping.
  - For admin handlers and services, prefer using imported class names (via `use`) rather than fully qualified names scattered through the code.
- **DI / wiring new dependencies**:
  - When you add a new constructor argument to an admin REST handler (e.g. injecting `ServiceReleaseManager` into `ServiceImpExpRestHandler`), you must also update the corresponding registration in `ServiceContainerFactory::createAdminContainer()` to pass a `Reference` to that service.
  - Shared/core services (like `ConvoServiceFactory`, `ServiceReleaseManager`, data providers, and package providers) are typically registered in `ServiceContainerFactory::createSharedContainer()` and then reused in both admin and public containers.

This document is intentionally high‑level; it should be used as an **orientation map** before diving into specific files when implementing new tasks.
