### Easy Appointments Context

Provides appointment management using the [Easy Appointments](https://wordpress.org/plugins/easy-appointments/) WordPress booking plugin.

Use this context to load, check, create, update, or cancel appointments directly from your Convoworks service.

### When to use

Use **Easy Appointments Context** when:

- You already use the Easy Appointments plugin on your site.
- You want to check availability and suggest free slots for a specific location/service/worker.
- You need to create, update, or cancel appointments for a user identified by email.

Typical scenarios:

- Loading a single appointment for a user (by email).
- Loading multiple appointments for a user (by email).
- Checking if a specific date/time is available.
- Suggesting available time slots for an appointment type.
- Creating, updating, or canceling appointments for a user.

### Properties

#### Context ID (`id`)

Unique identifier for this context.  
Can be a literal string or an expression, for example:

- `${APPOINTMENT_CONTEXT_ID}`
- `easy_appointments`

Use this value later in expressions such as `${contexts['easy_appointments']...}`.

#### Location ID (`location`)

ID of the **location** used for booking.  
Typically a numeric value that matches the **Location** configured in Easy Appointments.

You can also use expressions, for example:

- `${user_location_id}`

#### Service ID (`service`)

ID of the **service** used for booking.  
Typically a numeric value that matches the **Service** in Easy Appointments.

Example expressions:

- `${APPOINTMENT_SERVICE_ID}`
- `${session.service_id}`

#### Worker ID (`worker`)

ID of the **worker** that will handle the appointment.  
Typically a numeric value that matches the **Worker** in Easy Appointments.

Example expressions:

- `${APPOINTMENT_WORKER_ID}`
- `${user.preferred_worker_id}`

### Runtime behavior

This context wraps Easy Appointments’ API and exposes methods you can call from Convoworks expressions and elements.  
Depending on which element you use (check availability, create appointment, update appointment, etc.), the context will:

- Query existing appointments for a user identified by email.
- Check availability for a given date, time, location, service, and worker.
- Suggest free time slots for selected appointment parameters.
- Create, update, or cancel an appointment.

### Example

1. Add **Easy Appointments Context** with:

   - **Context ID**: `easy_appointments`
   - **Location ID**: `${EA_LOCATION_ID}`
   - **Service ID**: `${EA_SERVICE_ID}`
   - **Worker ID**: `${EA_WORKER_ID}`

2. In a later step, use a dedicated Easy Appointments element (for example, *Create Appointment Element*) and configure it to use this context ID.

3. Use expressions like:

```text
${contexts['easy_appointments'].lastCreatedAppointment}
```

to access the most recent appointment created by this context.

### Tips

- Keep **Context ID** stable so you can reference it reliably from other elements.
- Store IDs for location/service/worker in variables or service parameters so you can reuse them across multiple dialogs.
- Handle errors from the plugin (invalid date/time, unavailable slot, etc.) using condition elements and user-friendly messages.


