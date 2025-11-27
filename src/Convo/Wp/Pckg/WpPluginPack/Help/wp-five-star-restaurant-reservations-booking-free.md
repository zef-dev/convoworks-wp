### Five Star Restaurant Reservations Booking Free Context

Integrates the [Five Star Restaurant Reservations](https://wordpress.org/plugins/restaurant-reservations/) plugin so you can manage restaurant bookings from Convoworks.

This context targets the **free** version of the plugin and exposes booking operations to your conversational flows.

### When to use

Use **Five Star Restaurant Reservations Booking Free Context** when:

- You use the Five Star Restaurant Reservations plugin to handle restaurant bookings.
- You want users to check, create, or modify bookings via voice/chat.

Supported scenarios include:

- Loading a single booking for a user identified by email.
- Loading multiple bookings for a user (by email).
- Checking availability for a booking request.
- Suggesting available time slots.
- Creating a new booking.
- Updating an existing booking.
- Canceling an existing booking.

### Plugin-specific notes

- This context only covers functionality available in the **free** version of the plugin.
- If the **“Allow Cancellations”** option is disabled in plugin settings, cancellation operations will not work.
- If **“Require Phone”** is set to “Yes”, you must provide a `phone` value in the payload for:
  - **Create Appointment Element**
  - **Update Appointment Element**

### Properties

#### Context ID (`id`)

Unique identifier for this context.

- Can be a literal or an expression, for example:

  - `restaurant_reservation`
  - `${RESERVATION_CONTEXT_ID}`

You will reference this ID from booking-related elements and expressions:

```text
${contexts['restaurant_reservation']}
```

### Payload keys for create/update elements

When using the corresponding **Create** / **Update Appointment** (booking) elements, the payload may include:

- **`message`** – Additional note for the staff (free text).
- **`name`** – Customer’s full name under which the reservation is made.
- **`party`** – Number of people.
- **`phone`** – Customer’s phone number (required if the plugin’s “Require Phone” option is enabled).

Depending on plugin configuration, other fields may also be available or required.

### Example

1. Add **Five Star Restaurant Reservations Booking Free Context** with:

   - **Context ID**: `restaurant_reservation`

2. Use a create/update booking element with:

   - **Context ID**: `restaurant_reservation`
   - Payload containing:

```text
{
  "name":     ${user_name},
  "party":    ${party_size},
  "phone":    ${user_phone},
  "message":  ${special_request}
}
```

3. Use availability and search elements with the same context ID to load and manage user bookings by email address.

### Tips

- Ensure plugin settings (cancellation, phone requirement, schedule, etc.) align with the flows you expose in Convoworks.
- Always validate collected data (email, party size, date/time) before sending it to the context.
- Provide clear user messages when a requested slot is unavailable and offer alternatives using the “suggest slots” capabilities.


