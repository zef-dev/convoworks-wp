## Component Help Markdown – Agent Guidelines

This document explains **how to write and structure Markdown help files** for Convoworks components.
These files live under each package, typically in `src/Convo/Pckg/<Package>/Help/` and are loaded by
`AbstractPackageDefinition::getComponentHelp()` and rendered in the **right-hand sidebar** of the
admin workflow editor.

---

### 1. File location and naming

- **Location**: put help files in the `Help/` folder of the package, e.g.
  - `src/Convo/Pckg/Core/Help/loop-element.md`
  - `src/Convo/Pckg/WpCore/Help/query-posts.md`

- **Naming convention**:
  - Use **kebab-case** names that match the `_help` definition in the component descriptor
    (or the auto-generated name based on class).
  - Example: `LoopElement` → `loop-element.md`.

- **Extensions supported**:
  - `.md` or `.markdown` – **preferred and future-default** format.
  - `.html` or `.htm` – **legacy / compatibility** format; keep only where migration has not yet been done.
  - If both `.html` and `.md` exist for the same base name, the system will pick the
    first matching file based on internal search order; **prefer a single authoritative file and use Markdown for all new and migrated help**.

---

### 1.1 Migration plan (HTML → Markdown)

We are gradually moving all component help to **Markdown**:

- **New components**:
  - Always add help as `*.md` / `*.markdown`.
  - Do **not** add new HTML help files.

- **Existing components**:
  - When you touch a component, prefer to **migrate its help** from HTML to Markdown instead of editing the HTML file.
  - After migrating, remove the old HTML help file to avoid confusion and keep Markdown as the single source of truth.

In a future major version, HTML help may be fully dropped; write and update all help with this in mind.

---

### 2. When Markdown help is used

In the component definition (`ComponentDefinition` JSON / PHP),
the `_help` system property determines how help is loaded:

- **File-based help**:
  - `_help.type = "file"`
  - `_help.filename` (optional) – base file name (without extension)
  - If `filename` is omitted, the name is **derived from the component class** (kebab-case).

- **Inline HTML help**:
  - `_help.type = "html"`
  - `_help.template` – HTML string stored directly in the definition.

For `_help.type = "file"`, the admin calls the `package-help` REST endpoint, which:

- Locates the actual file using the base name and supported extensions.
- Returns `content` (raw markdown or HTML) and `format` (`"markdown"` or `"html"`).
- The Angular properties editor converts markdown into HTML with **Showdown** and renders it.

---

### 3. Recommended structure for component help

Keep help concise and action-oriented. A good structure is:

1. **Title + short summary**
2. **When to use**
3. **Properties** (one subsection per property)
4. **Runtime behavior / special notes** (if applicable)
5. **Examples**
6. **Tips & gotchas**

#### 3.1 Title + summary

Use a level-3 heading for the component name and a short descriptive sentence:

```markdown
### Loop

Iterate over each item in a collection and execute child elements for every item.
```

#### 3.2 “When to use”

Explain the typical scenarios for this component:

```markdown
### When to use

Use **Loop** when you have a collection (array, iterator, or any traversable) and you want
to run the same logic for each item:

- Rendering a list of products or posts.
- Processing records returned from an API or database.
```

#### 3.3 Properties section

For each editor property that matters to the user, add a `####` subsection:

```markdown
### Properties

#### Items (data_collection)

Collection to iterate over. Must evaluate to an **array**, **Iterator**, or **IteratorAggregate**.
Example values:

- `${players}`
- `${response.items}`
```

Where useful, **map UI labels to underlying property names** (`data_collection`, `item`, etc.), and
mention evaluation rules (e.g. expression vs. literal).

#### 3.4 Runtime behavior / special notes

Document any non-obvious behavior that comes from the PHP implementation, such as:

- Status / context variables set by the component.
- Loop / branching semantics (e.g. `loop_until` in `LoopElement`).
- Scope of parameters (request/service/session).

Use code fences with plain text where appropriate:

```markdown
On each iteration, the loop stores this object in the request scope:

```text
${player.value}    // current item
${player.index}    // 0-based index
${player.natural}  // 1-based index
${player.first}    // true for first item in range
${player.last}     // true for last item in range
```
```

#### 3.5 Examples

Provide at least one realistic example that combines properties and expressions:

```markdown
### Example

Suppose you have a list of players in `${players}` and each has a `score`:

- **Items**: `${players}`
- **Data collection item name**: `player`
- Inside **Loop**, add a `Text Response` with:

  > Player `${player.natural}`'s score is `${player.value.score}`
```

#### 3.6 Tips & gotchas

Call out common mistakes and best practices:

```markdown
### Tips

- Do *not* wrap the data collection item name in `${}` – use `player`, not `${player}`.
- Use **Offset** and **Limit** to implement paging.
- Use **Loop until** to exit early when a condition is satisfied.
```

---

### 4. Showdown Markdown features available

Markdown help uses the [Showdown](https://github.com/showdownjs/showdown) converter with
the following options enabled for component help:

- **`tables: true`** – GitHub-style tables are supported.
- **`strikethrough: true`** – `~~text~~` renders as `<del>text</del>`.
- **`tasklists: true`** – `- [x] Done` / `- [ ] Pending` render as task list items.
- **`simpleLineBreaks: true`** – Single newlines become `<br>`; no need for two spaces.
- **`openLinksInNewWindow: true`** – Links open in a new tab/window.
- **`disableForced4SpacesIndentedSublists: true`** – 2-space indentation is enough for sublists.

You can safely use:

- Standard Markdown headings, lists, emphasis, links, and images.
- Tables for property or field references.
- Blockquotes for short “copy-paste this expression” snippets.

---

### 5. Style and tone

- **Keep it short and practical** – focus on what the user needs to configure and how it behaves.
- **Prefer examples over theory** – show at least one realistic usage scenario.
- **Use consistent terminology**:
  - Use the same property names and labels as the admin UI.
  - Refer to expressions with the `${...}` syntax as they appear in the editor.
- **Avoid internal implementation details** unless they directly affect configuration or behavior.

---

### 6. Checklist for new help files

Before committing a new `*.md` help file, verify:

1. **Location / name**: File is under the correct `Help/` folder and matches the `_help` filename.
2. **Structure**: Has at least:
   - Title
   - When to use
   - Properties
   - Example
3. **Expressions**: All `${...}` examples are valid in the context of the component.
4. **Tables** (if any): Render correctly in the sidebar (check in the admin UI).
5. **Links**: External links are correct and safe (they will open in a new tab).

---

### 7. Automation scenarios for agents

This section describes how agents should **locate and update help files automatically** when given minimal input in a chat.

#### 7.1 Single component rewrite (by PHP class reference)

When the user references a specific component PHP class (for example:
`@src/Convo/Pckg/Appointments/CreateAppointmentElement.php`) and asks to
generate or rewrite help:

1. **Locate the package definition**:
   - Look in the same folder (or one level above) for `*PackageDefinition.php`
     (e.g. `AppointmentsPackageDefinition.php`).
2. **Find the component definition**:
   - In the package definition, search for the `ComponentDefinition` whose
     component class (2nd constructor argument) matches the referenced PHP class.
3. **Locate current help file**:
   - Read the `_help` system property:
     - If `_help.type == "file"` and `_help.filename` ends with `.html`,
       read the HTML help from the package `Help/` folder.
4. **Generate / rewrite markdown help**:
   - Create or overwrite a `*.md` file in the same `Help/` folder with the
     same base name (e.g. `create-appointment-element.md`).
   - Structure the content according to the sections in this document
     (title, When to use, Properties, Runtime behavior, Examples, Tips).
   - Use information from:
     - The component PHP class (behavior, properties, scopes, errors).
     - Existing HTML help (to keep good explanations and examples).
5. **Update the package definition**:
   - Change `_help['filename']` to point to the new `*.md` file instead of
     the old `.html`.
6. **Deprecated components**:
   - If the display name (3rd argument to `ComponentDefinition`) starts with
     `x!`, the component is **deprecated / hidden** in the UI. Only migrate
     its help to markdown if explicitly asked by the user.

#### 7.2 Whole package rewrite (by package folder reference)

When the user references an entire package folder (for example:
`@src/Convo/Pckg/Appointments`) and asks to rewrite all component help:

1. **Locate the package definition file**:
   - In the referenced folder, look for `*PackageDefinition.php`
     (e.g. `AppointmentsPackageDefinition.php`).
2. **Iterate over all component definitions**:
   - Use the array returned from `_initDefintions()` in the package definition.
   - For each `ComponentDefinition`:
     - Skip components whose **display name** starts with `x!` (deprecated
       and hidden from UI) unless the user explicitly wants them migrated.
3. **Process each component with file-based help**:
   - If `_help.type == "file"` and `_help.filename` is set:
     - Resolve the current help file path in the package `Help/` folder.
     - If it is `.html`, read it and the component PHP class.
     - Generate a new `.md` file with the same base name following this
       guideline.
     - Update `_help['filename']` to the `.md` file.
4. **Apply changes in small, reviewable batches**:
   - Prefer to work in logical groups (e.g. all appointments CRUD elements)
     and show or apply patches per group so the user can review changes.
5. **Respect user’s scope and safety preferences**:
   - If the user asks for a “dry run”, generate markdown content and code
     snippets but do not apply patches until explicitly allowed.
   - If the user lists a subset of components, limit migration to that subset.


