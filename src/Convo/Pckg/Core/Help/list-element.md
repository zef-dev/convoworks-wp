### List

Display properties of **multiple objects** in a collection provided by an `Http Client` or `Json Reader` element.

### When to use

Use **List** when you have a collection of items and want to display them as a list or carousel:

- Search results (products, posts, records).
- Lists of options the user can choose from.

### Properties

#### List title

Title for the list.

#### List template

Visual layout for the list.

- Typically **List** or **Carousel**, depending on platform support.

#### Items

Collection of objects to display.

- Usually a field on the HTTP/JSON response.
- Example: `${row.body.someExampleCollectionOfObject}`

#### Offset

Index of the first item to display (0‑based).

#### Limit

Maximum number of items to display.

#### Item fields via `listItem`

Within the list, each item is available as `listItem`:

- `${listItem.value}` – current item value.
- `${listItem.natural}` – 1‑based index.
- `${listItem.index}` – 0‑based index.
- `${listItem.first}` – `true` for first item.
- `${listItem.last}` – `true` for last item.

Common bindings:

- **Title**: `${listItem.natural}. ${listItem.value.propertyBestSuitedForTitle}`
- **Subtitle**: `${listItem.value.propertyBestSuitedForSubtitle}`
- **Descriptions**: `${listItem.value.somePrimaryDescription}`, etc.
- **Image URL**: `${listItem.value.someImageLink}`
- **Image text**: `${listItem.value.someImageText}`

### Example (Http Client)

1. Use **Http Client** to fetch data and store it under `row`.
2. Configure **List**:
   - **List title**: `Search results`
   - **Items**: `${row.body.someExampleCollectionOfObject}`
   - **Item title**: `${listItem.natural}. ${listItem.value.propertyBestSuitedForTitle}`
3. Place a **Text response** before the **List** so platforms like Alexa show both spoken and visual output.

### Tips

- Use **Offset** and **Limit** to implement paging and “next page” behavior.
- Always ensure the upstream data‑fetching element (`Http Client` / `Json Reader`) has run before the **List**.


