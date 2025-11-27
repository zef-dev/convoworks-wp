### Text response

Present a message to the user. The message can be a normal response or a **reprompt** that asks the user for input after a period of inactivity.

### When to use

Use **Text response** any time you need to tell the user something:

- Greetings and introductions.
- Notifications and status updates.
- Confirmations and follow‑up questions.
- Reprompts when the user has not responded.

### Properties

#### Type

Controls whether this is a normal response or a reprompt.

- **Default** – standard response message.
- **Reprompt** – message used if the user does not answer in time.

#### Text

The message to speak / display.

- Supports the Convoworks Expression Language and SSML.
- For Alexa, you can use SSML tags to control pronunciation, pauses, etc.

Example:

> `Hello ${user_name}, how can I help you today?`

#### Alexa Domain (platform‑specific)

Fine‑tunes Alexa’s speaking style:

- **Normal** – standard Alexa voice.
- **Conversational** – more informal, like natural conversation.
- **Long Form** – suited for longer texts such as podcasts.
- **Music** – optimized for talking about media content.
- **News** – news‑style cadence and intonation.

#### Alexa Emotion / Alexa Emotion Intensity (platform‑specific)

Adjust Alexa’s emotional tone.

- Emotion (e.g. *excited*, *disappointed*).
- Intensity (e.g. *low*, *medium*, *high*).

#### Append

Whether to append this text to the previous speech or start a new message.

- **On** – appended to the previous sentence.
- **Off** – starts a new speech output entry.

### Examples

#### Simple text response

- **Type**: `Default`
- **Alexa Domain**: `Normal`
- **Alexa Emotion**: `Neutral`
- **Alexa Emotion Intensity**: `Medium`
- **Text**: `Hello world!`
- **Append**: `false`

#### Simple reprompt

- **Type**: `Reprompt`
- **Text**: `In order to continue, please tell me your name.`
- **Append**: `false`

### Tips

- Use **Reprompt** messages whenever you expect the user to answer a question.
- Combine with expressions to personalize messages (names, values, counts, etc.).
- For Alexa, keep SSML well‑formed; invalid SSML will cause the response to fail.


