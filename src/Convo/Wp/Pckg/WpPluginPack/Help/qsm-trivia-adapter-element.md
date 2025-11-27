### QSM Trivia Adapter Element

Converts a QSM (Quiz and Survey Master) quiz into a format suitable for Convoworks Trivia elements (for example, a Trivia Round block).

The element reads a QSM multiple-choice quiz and produces a normalized array of questions and answers that you can use in your flows.

### When to use

Use **QSM Trivia Adapter Element** when:

- You already have a QSM quiz with **horizontal/vertical multiple choice** questions.
- Each question has exactly one correct answer.
- You want to reuse that quiz inside Convoworks Trivia components.

### Before you start

Prepare the QSM quiz with the following rules:

- Only use **multiple choice** question types (horizontal or vertical layout).
- For older QSM versions with “correct answer” flags:
  - **Mark exactly one answer as correct** for each question.
- For newer QSM versions with “points per answer”:
  - **Only the correct answer should have points** (1 or more).
  - All other answers must have **0 points**.
- Maximum of **28 answers per question** (one for each letter of the English alphabet).

Take note of the quiz **ID** – you can find it by inspecting the shortcode for the quiz.

### Properties

#### QSM Quiz ID (`quiz_id`)

ID of the QSM quiz to adapt.

- You can enter a literal numeric ID (e.g. `3`), or an expression:

  - `${QSM_QUIZ_ID}`
  - `${params.quiz_id}`

This value is evaluated as an expression, so you can dynamically select which quiz to load.

#### Storage type (`scope_type`)

Where to store the adapted quiz in the Convoworks parameter scopes.

Possible values:

- `request` – request scope
- `session` – session scope
- `installation` – installation scope
- `user` – user scope

Choose the scope based on how long you want to keep the adapted quiz available (for example, use **session** while the current game is active).

#### Name (`scope_name`)

Name under which the adapted quiz will be stored.

Default: `questions`

Examples:

- `trivia_questions`
- `${GAME_QUESTIONS_KEY}`

Access pattern in expressions:

```text
${session.trivia_questions}
```

if you used `session` as the storage type.

### Result structure

The element stores an **array of questions** under the configured scope and name.  
Each question object has the following shape:

- `text` – the text of the question.
- `answers` – an array of answer objects:
  - `text` – answer text.
  - `letter` – the letter assigned to the answer (A, B, C, …).
  - `is_correct` – boolean indicating whether this is the correct answer.
- `correct_answer` – a convenience field set to the correct answer object (same structure as items in `answers`).

Example (simplified):

```text
[
  {
    text: "What is 2 + 2?",
    answers: [
      { text: "3", letter: "A", is_correct: false },
      { text: "4", letter: "B", is_correct: true }
    ],
    correct_answer: { text: "4", letter: "B", is_correct: true }
  },
  ...
]
```

### Example

1. Add **QSM Trivia Adapter Element** with:

   - **QSM Quiz ID**: `${QSM_QUIZ_ID}`
   - **Storage type**: `session`
   - **Name**: `trivia_questions`

2. After execution, the adapted questions are available as:

```text
${session.trivia_questions}
```

3. Use your trivia components (e.g. **Trivia Round**) and point them to this array.

### Tips

- Validate the QSM quiz configuration (one correct answer, point values) before using it in production.
- If you change the quiz in QSM, re-test your Convoworks flow to ensure the structure still matches expectations.
- Use **session** scope for per-game state; use **user** scope if you want to keep quiz state across sessions per user.


