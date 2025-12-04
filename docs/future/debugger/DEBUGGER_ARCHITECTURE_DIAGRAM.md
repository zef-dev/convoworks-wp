# Convoworks Debugger - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Convoworks Admin UI                          │
│                          (AngularJS)                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │  Test View    │  │   Workflow   │  │  Component Inspector │    │
│  │  + Debug      │  │   Editor     │  │                      │    │
│  │    Toggle     │  │  + Execution │  │  • View params       │    │
│  │  + Debug      │  │    Overlay   │  │  • View state        │    │
│  │    Panel      │  │  + Breakpoint│  │  • View timing       │    │
│  │               │  │    Markers   │  │                      │    │
│  └───────┬───────┘  └──────┬───────┘  └──────────┬───────────┘    │
│          │                 │                      │                 │
│          └─────────────────┴──────────────────────┘                 │
│                            │                                         │
│                            │ REST API Calls                          │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WordPress REST API Layer                          │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  DebugRestHandler                                             │  │
│  │  • GET  /admin/debug/traces/{sessionId}                       │  │
│  │  • POST /admin/debug/breakpoints/{serviceId}                  │  │
│  │  • GET  /admin/debug/breakpoints/{serviceId}                  │  │
│  │  • GET  /admin/debug/snapshot/{snapshotId}                    │  │
│  │  • POST /admin/debug/continue/{snapshotId}                    │  │
│  └───────────────────────────┬──────────────────────────────────┘  │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Convoworks Service Execution                        │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  ConvoServiceFactory                                          │  │
│  │  • Loads service JSON                                         │  │
│  │  • Detects debug mode                                         │  │
│  │  • Creates components via PackageProvider                     │  │
│  └───────────────────────────┬──────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  PackageProvider                                              │  │
│  │                                                               │  │
│  │  Debug Mode Check:                                            │  │
│  │  ┌─────────────┐        ┌──────────────────────────┐         │  │
│  │  │ Debug OFF?  │──Yes──▶│ DefaultComponentFactory  │         │  │
│  │  └──────┬──────┘        └──────────┬───────────────┘         │  │
│  │         │                           │                         │  │
│  │         No                          │ Creates standard        │  │
│  │         │                           │ component               │  │
│  │         ▼                           │                         │  │
│  │  ┌──────────────────────┐          │                         │  │
│  │  │ DebugComponentFactory│          │                         │  │
│  │  │  • DebugProxyGen     │          │                         │  │
│  │  │  • IDebugger         │          │                         │  │
│  │  └──────┬───────────────┘          │                         │  │
│  │         │                           │                         │  │
│  │         │ Creates debug-enabled    │                         │  │
│  │         │ component                │                         │  │
│  │         └───────────────────────────┘                         │  │
│  │                         │                                     │  │
│  └─────────────────────────┼─────────────────────────────────────┘  │
│                            │                                         │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Debug Infrastructure Layer                         │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  DebugProxyGenerator                                          │  │
│  │  • Generates extended classes at runtime                      │  │
│  │  • Caches in static array                                     │  │
│  │                                                               │  │
│  │  Input:  \Convo\Pckg\Core\Elements\TextResponseElement       │  │
│  │  Output: \Convo\Core\Debug\Generated\Debug_TextResponse_abc  │  │
│  │                                                               │  │
│  │  Generated class extends original + adds debug hooks          │  │
│  └───────────────────────────┬──────────────────────────────────┘  │
│                              │                                       │
│                              │ Extended class                        │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Debug_ComponentClass_hash (Generated)                        │  │
│  │                                                               │  │
│  │  class Debug_TextResponse_a1b2c3                              │  │
│  │      extends TextResponseElement {                            │  │
│  │                                                               │  │
│  │    private static $__debugger;                                │  │
│  │                                                               │  │
│  │    public function read($req, $res) {                         │  │
│  │      self::$__debugger->onBeforeRead(this);  ◄───┐           │  │
│  │      parent::read($req, $res);  ◄────────────────┼─ Original │  │
│  │      self::$__debugger->onAfterRead(this);   ◄───┘   Logic   │  │
│  │    }                                                          │  │
│  │  }                                                            │  │
│  └───────────────────────────┬──────────────────────────────────┘  │
│                              │                                       │
│                              │ Calls hooks                           │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  IDebugger Implementation                                     │  │
│  │                                                               │  │
│  │  ┌───────────────────┐  ┌──────────────────┐  ┌───────────┐ │  │
│  │  │ TracingDebugger   │  │ BreakpointDebugger│  │ Profiling │ │  │
│  │  │                   │  │                   │  │ Debugger  │ │  │
│  │  │ • Logs traces     │  │ • Wraps Tracer    │  │           │ │  │
│  │  │ • Stores in array │  │ • Checks BPs      │  │ • Timing  │ │  │
│  │  │ • Returns traces  │  │ • Throws          │  │ • Metrics │ │  │
│  │  │                   │  │   DebugBreakEx    │  │ • Reports │ │  │
│  │  └───────┬───────────┘  └────────┬──────────┘  └─────┬─────┘ │  │
│  │          │                       │                    │       │  │
│  └──────────┼───────────────────────┼────────────────────┼─────────┘
│             │                       │                    │         │
│             ▼                       ▼                    ▼         │
│  ┌─────────────────────┐  ┌────────────────┐  ┌─────────────────┐ │
│  │ Trace Storage       │  │ Breakpoint     │  │ Performance     │ │
│  │ (Transients/DB)     │  │ Storage        │  │ Logs            │ │
│  └─────────────────────┘  └────────────────┘  └─────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Instantiation Flow

### Normal Mode (Debug OFF)

```
┌────────────────────┐
│  Service JSON      │
│  {                 │
│    class: "Text... │
│    properties: {}  │
│  }                 │
└─────────┬──────────┘
          │
          ▼
┌────────────────────────────┐
│  PackageProvider           │
│  createComponent()         │
└─────────┬──────────────────┘
          │
          ▼
┌────────────────────────────┐
│  DefaultComponentFactory   │
│  createComponent()         │
└─────────┬──────────────────┘
          │
          │ new $componentData['class']
          │
          ▼
┌────────────────────────────┐
│  new TextResponseElement() │
│  (Standard instance)       │
└────────────────────────────┘
```

### Debug Mode (Debug ON)

```
┌────────────────────┐
│  Service JSON      │
│  {                 │
│    class: "Text... │
│    properties: {}  │
│  }                 │
└─────────┬──────────┘
          │
          ▼
┌────────────────────────────────────────┐
│  PackageProvider                       │
│  createComponent()                     │
│  (detects debug mode)                  │
└─────────┬──────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  DebugComponentFactory                      │
│  createComponent()                          │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  DebugProxyGenerator                        │
│  getDebugClass('TextResponseElement')       │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ Check cache                          │  │
│  │ ├─ Found? Return cached class        │  │
│  │ └─ Not found? Generate new           │  │
│  │                                      │  │
│  │    ┌──────────────────────────┐     │  │
│  │    │ Reflect on original class│     │  │
│  │    │ Generate PHP code        │     │  │
│  │    │ eval() to create class   │     │  │
│  │    │ Cache in static array    │     │  │
│  │    └──────────────────────────┘     │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  Returns: Debug_TextResponseElement_a1b2c3 │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  Set debugger on generated class            │
│  Debug_TextResponseElement_a1b2c3::         │
│    setDebugger($tracingDebugger)            │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  new Debug_TextResponseElement_a1b2c3()     │
│  (Debug-enabled instance)                   │
│                                             │
│  • IS a TextResponseElement (inheritance)   │
│  • Has debug hooks injected                 │
└─────────────────────────────────────────────┘
```

## Execution Flow Comparison

### Normal Execution

```
Request
   │
   ▼
┌─────────────────────┐
│ ConvoServiceInstance│
│ run()               │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ ConversationBlock   │
│ run()               │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ TextResponseElement │
│ read()              │──┐
└─────────────────────┘  │
                         │ Original Logic
┌─────────────────────┐  │
│ • Evaluate text     │◀─┘
│ • Add to response   │
└─────────────────────┘
           │
           ▼
       Response
```

### Debug Execution

```
Request + Debug Flag
   │
   ▼
┌─────────────────────┐
│ ConvoServiceInstance│
│ run()               │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────┐
│ ConversationBlock           │
│ run()                       │
│ (Debug_ConversationBlock)   │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ Debug_TextResponseElement_a1b2c3    │
│ read()                              │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 1. debugger.onBeforeRead()      │ │
│ │    • Log entry                  │ │
│ │    • Capture params             │ │
│ │    • Check breakpoints          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 2. parent::read()               │ │
│ │    • Evaluate text              │◀┼── Original Logic
│ │    • Add to response            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 3. debugger.onAfterRead()       │ │
│ │    • Log exit                   │ │
│ │    • Capture response changes   │ │
│ │    • Record timing              │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
           │
           ▼
   Response + Debug Data
```

## Type Hierarchy Preservation

```
                 IConversationElement (interface)
                           ▲
                           │
                    implements
                           │
        AbstractWorkflowComponent (abstract)
                           ▲
                           │
                       extends
                           │
              TextResponseElement (concrete)
                           ▲
                           │
                       extends ◄─── GENERATED AT RUNTIME
                           │
          Debug_TextResponseElement_a1b2c3


Instance: $component = new Debug_TextResponseElement_a1b2c3()

✅ $component instanceof Debug_TextResponseElement_a1b2c3   // true
✅ $component instanceof TextResponseElement                // true
✅ $component instanceof AbstractWorkflowComponent          // true
✅ $component instanceof IConversationElement               // true

✅ findAncestor('IConversationElement')                     // Works!
✅ findChildren('ICustomInterface')                         // Works!
✅ is_a($component, 'TextResponseElement')                  // Works!
```

## Data Flow

```
┌──────────────────────────────────────────────────────────┐
│                    User Interaction                       │
└────────┬─────────────────────────────────────────────────┘
         │
         │ 1. User sends message in Test View
         │    with debug toggle ON
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  Admin UI (AngularJS)                                    │
│  • Adds debug: { enabled: true, session_id: "..." }     │
└────────┬─────────────────────────────────────────────────┘
         │
         │ 2. POST /admin/services/{id}/test
         │    with debug params
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  WordPress REST Handler                                  │
│  • Detects debug flag                                    │
│  • Enables debug mode for this request                  │
└────────┬─────────────────────────────────────────────────┘
         │
         │ 3. Creates service with debug mode ON
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  ConvoServiceFactory                                     │
│  • Uses DebugComponentFactory                            │
│  • All components wrapped with debug hooks               │
└────────┬─────────────────────────────────────────────────┘
         │
         │ 4. Service executes with tracing
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  TracingDebugger                                         │
│  • Collects traces in memory                             │
│  • Each component execution logged                       │
│  Trace: { order, phase, component_id, timestamp, ... }   │
└────────┬─────────────────────────────────────────────────┘
         │
         │ 5. Execution completes
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  Store Traces                                            │
│  • WordPress Transient (temp storage)                    │
│  • Key: 'convo_debug_session_' + session_id             │
│  • Expires: 1 hour                                       │
└────────┬─────────────────────────────────────────────────┘
         │
         │ 6. Return response + debug metadata
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  Response                                                │
│  {                                                       │
│    response: { text: "...", ... },                      │
│    debug: {                                             │
│      session_id: "session-123",                         │
│      status: "completed",                               │
│      trace_count: 42                                    │
│    }                                                    │
│  }                                                      │
└────────┬─────────────────────────────────────────────────┘
         │
         │ 7. UI requests trace details
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  GET /admin/debug/traces/session-123                    │
└────────┬─────────────────────────────────────────────────┘
         │
         │ 8. Retrieve from storage
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  DebugRestHandler                                        │
│  • Loads traces from transient                           │
│  • Returns JSON array of trace entries                  │
└────────┬─────────────────────────────────────────────────┘
         │
         │ 9. Display in UI
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  Debug Panel                                             │
│  • Timeline visualization                                │
│  • Component tree with execution order                  │
│  • Click to inspect details                             │
└──────────────────────────────────────────────────────────┘
```

## Breakpoint Flow

```
┌──────────────────────────────────────────────────────────┐
│  User sets breakpoint on component in Workflow Editor   │
└────────┬─────────────────────────────────────────────────┘
         │
         │ POST /admin/debug/breakpoints/{serviceId}
         │ { component_ids: ["abc-123"] }
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  Store breakpoints in service meta or user prefs         │
└────────┬─────────────────────────────────────────────────┘
         │
         │ User sends test message
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  Service executes with BreakpointDebugger                │
└────────┬─────────────────────────────────────────────────┘
         │
         │ Component "abc-123" about to execute
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  BreakpointDebugger.onBeforeRead()                       │
│  • Check if component_id in breakpoint list              │
│  • YES! → Serialize state                                │
│  • Store snapshot in transient                           │
│  • Throw DebugBreakException                             │
└────────┬─────────────────────────────────────────────────┘
         │
         │ Exception caught at request handler
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  Return "paused" response                                │
│  {                                                       │
│    status: "paused",                                     │
│    snapshot_id: "bp_abc123",                            │
│    component_id: "abc-123",                             │
│    traces: [...]                                        │
│  }                                                      │
└────────┬─────────────────────────────────────────────────┘
         │
         │ UI displays paused state
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  Debug Panel shows:                                      │
│  • "Paused at: TextResponseElement"                     │
│  • Current params and state                             │
│  • Buttons: Continue | Step | Stop                      │
└────────┬─────────────────────────────────────────────────┘
         │
         │ User clicks "Continue"
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  POST /admin/debug/continue/bp_abc123                   │
│  { action: "continue" }                                  │
└────────┬─────────────────────────────────────────────────┘
         │
         │ Load snapshot, resume execution
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  Service continues from breakpoint                       │
│  • Restore state from snapshot                           │
│  • Continue component execution                          │
└────────┬─────────────────────────────────────────────────┘
         │
         ▼
      Response
```

---

**Legend:**
- `│` : Flow direction
- `▼` : Next step
- `◀─` : Reference/delegation
- `┌─┐` : Component/layer boundary
- `✅` : Success condition
- `❌` : Failure condition

