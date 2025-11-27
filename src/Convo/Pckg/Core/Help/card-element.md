### Card

Display properties of a **single object** (item) provided by an `Http Client` or `Json Reader` element.

### When to use

Use **Card** when you have already fetched data and want to show details of **one item**:

- Show details of a selected product, post, or record.
- Display richer output (title, subtitle, descriptions, image) alongside spoken text.

### Properties

#### Item

The object whose properties you want to display.

- Typically points to a field on the HTTP/JSON response.
- Example: `${row.body.someExampleObject}`

#### Data item fields

These map fields on the item to visual parts of the card, for example:

- **Title** – `${cardItem.propertyBestSuitedForTitle}`
- **Subtitle** – `${cardItem.propertyBestSuitedForSubtitle}`
- **Description 1 / 2 / 3** – `${cardItem.somePrimaryDescription}`, etc.
- **Image URL** – `${cardItem.someImageLink}`
- **Image text** – `${cardItem.someImageText}`

The UI exposes these as individual properties; internally you access them through the `cardItem` status variable.

### Example (Http Client)

1. Use **Http Client** to fetch data and store it under `row`.
2. Configure **Card**:
   - **Item**: `${row.body.someExampleObject}`
   - **Data item title**: `${cardItem.propertyBestSuitedForTitle}`
   - **Data item subtitle**: `${cardItem.propertyBestSuitedForSubtitle}`
   - **Data item Description 1**: `${cardItem.somePrimaryDescription}`
   - **Data item image url**: `${cardItem.someImageLink}`
3. Place a **Text response** before the **Card** so that platforms like Alexa can present both speech and visual card content.

### Tips

- Always ensure the upstream `Http Client` or `Json Reader` has run before the Card.
- For Alexa and similar platforms, pair a **Text response** element with the **Card** element to give users both voice and visual context.


