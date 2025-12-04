# Convoworks Workflow Debugger - Implementation Plan

**Status**: Planning / Design Phase  
**Created**: 2025-12-04  
**Type**: Enhancement  
**Complexity**: Medium-High

---

## Executive Summary

Implement a **workflow-level debugger** for Convoworks that allows developers to:
- Trace component execution in real-time
- Set breakpoints on specific components
- Step through service execution
- Inspect parameters, request/response state at any point
- Visualize execution flow in the admin UI

The debugger works at the **component level** (not PHP level) and is designed specifically for the tree-based, declarative nature of Convoworks services.

---

## Core Design Decision: Dynamic Class Extension

### Approach
Use **runtime class generation** (similar to PHPUnit mocks) to extend component classes before instantiation, adding debug hooks while preserving type identity.

### Why This Works
- **Preserves `instanceof` checks**: Generated class extends original, so all type checks pass
- **Works with `findAncestor()` and `findChildren()`**: Type relationships are preserved through inheritance
- **Zero changes to existing components**: All 100+ components automatically gain debug support
- **Toggle on/off**: Simple factory swap, no runtime overhead when disabled
- **Minimal overhead when enabled**: One `parent::method()` call per execution

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ConvoServiceFactory                       │
│  (loads service JSON, creates components via PackageProvider)│
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │   PackageProvider/Definition   │
        │ (creates component factories)  │
        └────────┬───────────────────────┘
                 │
                 │ Debug mode check
                 │
        ┌────────▼───────────────────────────┐
        │  Factory Selection                  │
        │  • Normal: DefaultComponentFactory  │
        │  • Debug:  DebugComponentFactory    │
        └────────┬───────────────────────────┘
                 │
                 ▼
        ┌─────────────────────────────────────┐
        │   DebugComponentFactory              │
        │   • Uses DebugProxyGenerator         │
        │   • Instantiates extended classes    │
        └────────┬────────────────────────────┘
                 │
                 ▼
        ┌─────────────────────────────────────┐
        │   DebugProxyGenerator                │
        │   • Generates class once per type    │
        │   • Caches in static array           │
        │   • Extends original with hooks      │
        └────────┬────────────────────────────┘
                 │
                 ▼
        ┌─────────────────────────────────────┐
        │  Generated Debug Class               │
        │  (extends original component)        │
        │  • Overrides read()/process()/run() │
        │  • Calls debugger hooks              │
        │  • Calls parent:: for real logic     │
        └────────┬────────────────────────────┘
                 │
                 ▼
        ┌─────────────────────────────────────┐
        │   IDebugger Implementation           │
        │   • TracingDebugger (logs)           │
        │   • BreakpointDebugger (pauses)      │
        │   • ProfilingDebugger (performance)  │
        └──────────────────────────────────────┘
```

---

## Phase 1: Core Debug Infrastructure

### 1.1 Create Core Interfaces and Base Classes

**Location**: `src/Convo/Core/Debug/`

#### Files to Create:

**`IDebugger.php`**
```php
interface IDebugger
{
    public function onBeforeRead($component, $request, $response);
    public function onAfterRead($component, $request, $response);
    public function onBeforeProcess($component, $request, $response, $result);
    public function onAfterProcess($component, $request, $response);
    public function onBeforeRun($component, $request, $response);
    public function onAfterRun($component, $request, $response);
    public function onError($component, $exception);
}
```

**Key Responsibilities**:
- Define hooks for all component execution methods
- Provide consistent interface for different debugger implementations
- Allow composition of multiple debuggers

---

**`DebugProxyGenerator.php`**

Core class generation engine. Generates extended classes with debug hooks.

**Key Features**:
- Static class cache (`$_generatedClasses`) to avoid regenerating
- Reflection-based method detection
- Handles final classes gracefully (returns original)
- Generates classes in `Convo\Core\Debug\Generated` namespace
- Uses deterministic naming: `Debug_{ClassName}_{hash}`

**Key Methods**:
- `getDebugClass($originalClass)`: Main entry point
- `_generateDebugClass()`: Creates new extended class
- `_buildClassCode()`: Generates PHP code string
- `_shouldOverride()`: Checks if method can be overridden

**Considerations**:
- Check for final classes/methods
- Handle private methods gracefully
- Preserve visibility (public/protected)
- Use `parent::` to delegate to original logic
- Static `$__debugger` property for injection

---

**`DebugComponentFactory.php`**

Replacement for `DefaultComponentFactory` when debug mode is active.

**Key Features**:
- Implements `IComponentFactory` interface
- Uses `DebugProxyGenerator` to get extended class
- Sets debugger on generated class via static method
- Instantiates extended class instead of original

**Integration Point**:
- Replaces `DefaultComponentFactory` in PackageProvider
- Conditionally created based on debug mode flag

---

### 1.2 Debugger Implementations

**`TracingDebugger.php`**

Simple trace collector - no breakpoints, just logging execution flow.

**Features**:
- Collects execution traces in memory array
- Records: order, phase, component ID, timestamp, params, response changes
- Provides `getTraces()` for retrieval
- Can output to Monolog or custom storage

**Use Cases**:
- Understanding execution flow
- Post-mortem debugging
- Performance analysis foundation
- Test view visualization

**Storage Options**:
- In-memory (current request only)
- WordPress transients (session-based)
- Database table `wp_convoworks_debug_traces`
- Log files via Monolog

---

**`BreakpointDebugger.php`**

Adds breakpoint support with state serialization.

**Features**:
- Wraps `TracingDebugger` for base functionality
- Maintains list of breakpoint component IDs
- Throws `DebugBreakException` when breakpoint hit
- Serializes service state at break point
- Supports resume/continue operations

**Key Challenge**: Service State Serialization
- Need to serialize: request params, session data, service instance state
- Consider: JSON representation vs PHP serialize
- Store in: WordPress transients or dedicated table

**Break Flow**:
1. Component executes
2. Check if component ID in breakpoint list
3. If yes: serialize state, throw `DebugBreakException`
4. Catch at request handler level
5. Return "paused" response to UI with snapshot ID
6. UI displays state, offers continue/step
7. On continue: load snapshot, resume execution

---

**`ProfilingDebugger.php`**

Performance-focused debugger.

**Features**:
- Tracks execution time per component
- Counts invocations
- Identifies bottlenecks
- Generates performance report

**Metrics**:
- Total time per component type
- Slowest individual components
- Most frequently called components
- Read vs Process vs Run phase breakdown

---

### 1.3 Exception Classes

**`DebugBreakException.php`**
```php
class DebugBreakException extends \Exception
{
    private $_snapshotId;
    private $_snapshot;
    
    public function __construct($snapshotId, $snapshot)
    {
        $this->_snapshotId = $snapshotId;
        $this->_snapshot = $snapshot;
        parent::__construct("Debug breakpoint hit");
    }
    
    public function getSnapshotId() { return $this->_snapshotId; }
    public function getSnapshot() { return $this->_snapshot; }
}
```

---

## Phase 2: Debug Mode Configuration

### 2.1 Add Debug Mode Detection

**Location**: `src/Convo/Core/Factory/PackageProviderFactory.php` or `ConvoServiceFactory.php`

**Add**:
- Check for debug mode flag (request header, query param, or service config)
- Possible sources:
  - Request header: `X-Convo-Debug: true`
  - Query param: `?convo_debug=1`
  - Service meta flag: `debug_enabled`
  - User preference (stored in WP user meta)

**Example**:
```php
private function _isDebugMode($request, $serviceId)
{
    // Check request header
    if (isset($_SERVER['HTTP_X_CONVO_DEBUG'])) {
        return true;
    }
    
    // Check query param (only in test view)
    if (isset($_GET['convo_debug']) && $_GET['convo_debug'] === '1') {
        return true;
    }
    
    // Check service meta
    $meta = $this->_serviceDataProvider->getServiceMeta($user, $serviceId);
    if (isset($meta['debug_enabled']) && $meta['debug_enabled']) {
        return true;
    }
    
    return false;
}
```

---

### 2.2 Modify PackageProvider Factory Creation

**Location**: Where `DefaultComponentFactory` is instantiated (likely in `PackageProvider` or `AbstractPackageDefinition`)

**Before**:
```php
$factory = new DefaultComponentFactory($componentData);
```

**After**:
```php
if ($debugMode) {
    $proxyGenerator = new DebugProxyGenerator($logger);
    $debugger = $this->_createDebugger($debugMode, $logger);
    $factory = new DebugComponentFactory($componentData, $proxyGenerator, $debugger);
} else {
    $factory = new DefaultComponentFactory($componentData);
}
```

---

### 2.3 Debugger Selection Strategy

Based on debug mode value, create appropriate debugger:

```php
private function _createDebugger($debugMode, $logger)
{
    if ($debugMode === 'trace') {
        return new TracingDebugger($logger);
    }
    
    if ($debugMode === 'breakpoint') {
        $tracer = new TracingDebugger($logger);
        $sessionStore = new WordPressTransientStore();
        return new BreakpointDebugger($tracer, $sessionStore);
    }
    
    if ($debugMode === 'profile') {
        return new ProfilingDebugger($logger);
    }
    
    // Default
    return new TracingDebugger($logger);
}
```

---

## Phase 3: Backend REST API

### 3.1 Debug Endpoints

**Location**: `src/Convo/Core/Admin/` (new file: `DebugRestHandler.php`)

#### Endpoints to Implement:

**GET `/admin/debug/traces/{sessionId}`**
- Returns execution traces for a test session
- Used by UI to visualize execution flow

**POST `/admin/debug/breakpoints/{serviceId}`**
- Set/update breakpoints for a service
- Body: `{ "component_ids": ["abc-123", "def-456"] }`

**GET `/admin/debug/breakpoints/{serviceId}`**
- Get current breakpoints for a service

**GET `/admin/debug/snapshot/{snapshotId}`**
- Retrieve serialized state from a breakpoint
- Returns: component state, params, request/response data

**POST `/admin/debug/continue/{snapshotId}`**
- Resume execution from a breakpoint
- Options: `continue`, `step-over`, `step-into`

---

### 3.2 Test View Integration

**Modify**: Test chat API calls to support debug mode

**Add to request**:
```json
{
  "text": "user message",
  "platform_id": "convo_chat",
  "debug": {
    "enabled": true,
    "mode": "trace",
    "session_id": "unique-session-id"
  }
}
```

**Response format**:
```json
{
  "response": {
    "text": "Bot response",
    "...": "..."
  },
  "debug": {
    "session_id": "unique-session-id",
    "status": "completed|paused",
    "trace_count": 42,
    "snapshot_id": "bp_abc123" // if paused
  }
}
```

---

## Phase 4: Admin UI (AngularJS)

### 4.1 Debug Controls in Test View

**Location**: `app/convoworks/test/` or `app/convoworks/editor/test/`

**Add Components**:

**Debug Toggle Button**
- Enable/disable debug mode for test chat
- Shows debug panel when enabled

**Debug Panel**
- Execution trace visualization
- Breakpoint list
- Current execution state

**Trace Timeline**
- Visual representation of component execution order
- Click to inspect component state at that point
- Shows timing information

---

### 4.2 Workflow Editor Integration

**Location**: `app/convoworks/editor/workflow/`

**Add Features**:

**Breakpoint Markers**
- Click component to toggle breakpoint
- Visual indicator (red dot) on components with breakpoints
- Persisted per service in browser storage or backend

**Execution Overlay**
- After running in debug mode, overlay execution info on workflow
- Highlight executed components
- Show execution order numbers
- Display timing/performance data

**Component Inspector**
- Right-click component → "Inspect Last Execution"
- Shows: input params, output, timing, errors
- Linked to most recent debug trace

---

### 4.3 New Services

**`debug-service.js`**
```javascript
angular.module('convoworks').service('DebugService', function($http, ConvoworksApi) {
    
    this.setDebugMode = function(enabled, mode) {
        // Store in session/local storage
    };
    
    this.getTraces = function(sessionId) {
        return $http.get('/admin/debug/traces/' + sessionId);
    };
    
    this.setBreakpoints = function(serviceId, componentIds) {
        return $http.post('/admin/debug/breakpoints/' + serviceId, {
            component_ids: componentIds
        });
    };
    
    this.getSnapshot = function(snapshotId) {
        return $http.get('/admin/debug/snapshot/' + snapshotId);
    };
    
    this.continue = function(snapshotId, action) {
        return $http.post('/admin/debug/continue/' + snapshotId, {
            action: action // 'continue', 'step', 'step-into'
        });
    };
});
```

---

### 4.4 New Directives

**`debug-panel.directive.js`**
- Main debug UI container
- Shows traces, breakpoints, controls

**`execution-trace.directive.js`**
- Visualizes execution timeline
- Tree view of component execution

**`component-inspector.directive.js`**
- Shows detailed component state
- Params, request/response diffs

---

## Phase 5: Data Storage

### 5.1 WordPress Database Tables

**Option 1: Dedicated Debug Table**

```sql
CREATE TABLE wp_convoworks_debug_traces (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    service_id VARCHAR(64) NOT NULL,
    execution_order INT NOT NULL,
    phase VARCHAR(32) NOT NULL,
    component_id VARCHAR(64) NOT NULL,
    component_class VARCHAR(255) NOT NULL,
    block_id VARCHAR(64),
    timestamp DECIMAL(16,6) NOT NULL,
    duration DECIMAL(10,6),
    params LONGTEXT,
    response_changes LONGTEXT,
    error TEXT,
    INDEX idx_session (session_id),
    INDEX idx_service (service_id),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Option 2: WordPress Transients**
- Use `set_transient('convo_debug_' . $sessionId, $traces, HOUR_IN_SECONDS)`
- Simpler, auto-expires
- Good for development/testing
- Not suitable for production logging

**Option 3: Log Files**
- Use Monolog to write structured JSON logs
- Parse logs for UI display
- Better for production, doesn't bloat DB
- Harder to query

**Recommendation**: Start with **Option 2 (Transients)** for MVP, add Option 1 for production if needed.

---

### 5.2 Breakpoint Storage

**Store in Service Meta**:
```php
// In service meta JSON
{
  "debug": {
    "breakpoints": ["component-id-1", "component-id-2"],
    "enabled": true
  }
}
```

**Or User Preference**:
```php
// Per-user debug settings
update_user_meta($userId, 'convo_debug_breakpoints_' . $serviceId, [
    'component-id-1',
    'component-id-2'
]);
```

---

## Phase 6: Testing Strategy

### 6.1 Unit Tests

**Test Cases**:
- `DebugProxyGenerator` generates valid PHP classes
- Generated classes extend original correctly
- `instanceof` checks pass for generated classes
- Debug hooks are called in correct order
- Original component logic still executes
- Errors are properly caught and re-thrown

**Location**: `tests/Convo/Core/Debug/`

**Files**:
- `DebugProxyGeneratorTest.php`
- `DebugComponentFactoryTest.php`
- `TracingDebuggerTest.php`
- `BreakpointDebuggerTest.php`

---

### 6.2 Integration Tests

**Test Scenarios**:
1. Create service with debug mode enabled
2. Execute test request
3. Verify traces collected
4. Verify component execution order
5. Verify params captured correctly

**Test with**:
- Different component types (elements, processors, blocks)
- Nested components (containers)
- Error scenarios
- Different platforms (Alexa, ConvoChat, WP Hooks)

---

### 6.3 Performance Testing

**Metrics to Measure**:
- Overhead with debug mode OFF (should be zero)
- Overhead with debug mode ON (acceptable: < 10%)
- Memory usage increase
- Class generation time (first request vs cached)

**Test with**:
- Large services (50+ components)
- Deep nesting (10+ levels)
- Repeated requests (cache efficiency)

---

## Phase 7: Documentation

### 7.1 User Documentation

**File**: `docs/DEBUGGER_USER_GUIDE.md`

**Contents**:
- How to enable debug mode
- Using the debug panel in test view
- Setting breakpoints
- Interpreting traces
- Common debugging workflows
- Performance considerations

---

### 7.2 Developer Documentation

**File**: `docs/DEBUGGER_DEVELOPER_GUIDE.md`

**Contents**:
- Architecture overview
- How to create custom debuggers
- Extending debug hooks
- Integration with custom components
- Debug data format specifications

---

### 7.3 API Documentation

**File**: `docs/DEBUGGER_API_REFERENCE.md`

**Contents**:
- REST endpoint specifications
- Request/response formats
- WebSocket protocol (if implemented)
- JavaScript API reference

---

## Implementation Timeline

### Week 1-2: Core Infrastructure
- [ ] Create `IDebugger` interface
- [ ] Implement `DebugProxyGenerator`
- [ ] Implement `DebugComponentFactory`
- [ ] Implement `TracingDebugger`
- [ ] Unit tests for core classes
- [ ] Integration point in `PackageProvider`

### Week 3-4: Backend API
- [ ] Create `DebugRestHandler`
- [ ] Implement trace storage (transients)
- [ ] Implement breakpoint storage
- [ ] Add debug mode detection
- [ ] API endpoint tests

### Week 5-6: Basic UI
- [ ] Add debug toggle to test view
- [ ] Create `debug-service.js`
- [ ] Create `debug-panel.directive`
- [ ] Display execution traces
- [ ] Show basic component info

### Week 7-8: Breakpoints
- [ ] Implement `BreakpointDebugger`
- [ ] Implement `DebugBreakException`
- [ ] Add breakpoint UI controls
- [ ] Test pause/resume flow
- [ ] State serialization/deserialization

### Week 9-10: Workflow Integration
- [ ] Add breakpoint markers to workflow editor
- [ ] Execution overlay visualization
- [ ] Component inspector panel
- [ ] Visual execution flow

### Week 11-12: Polish & Testing
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation
- [ ] Bug fixes
- [ ] Production readiness review

---

## Potential Challenges & Solutions

### Challenge 1: Final Classes
**Problem**: Can't extend final classes  
**Solution**: Detect final classes, return original, log warning, skip debugging for those components

### Challenge 2: Performance Overhead
**Problem**: Debug hooks add latency  
**Solution**: 
- Only enable in development/test mode
- Use static debugger injection (minimal overhead)
- Cache generated classes
- Lazy-load debug infrastructure

### Challenge 3: State Serialization
**Problem**: Complex service state hard to serialize  
**Solution**:
- Focus on params and response only initially
- Use JSON-safe representations
- Don't try to serialize entire service instance
- Provide "resumption hints" rather than full state

### Challenge 4: Async/Multi-Request Flows
**Problem**: Service execution may span multiple requests  
**Solution**:
- Session-based correlation IDs
- Store traces in session/transient
- Group by session in UI
- Clear on new conversation

### Challenge 5: WordPress Memory Limits
**Problem**: Large traces consume memory  
**Solution**:
- Configurable trace limit (max 1000 events)
- Auto-flush to storage periodically
- Summarize deep recursion
- Option to disable param capture

---

## Future Enhancements

### Phase 8+ (Post-MVP)

**Advanced Breakpoints**:
- Conditional breakpoints (expression-based)
- Hit count breakpoints
- Temporary breakpoints

**Time-Travel Debugging**:
- Replay past executions
- Step backward through traces
- State diff viewer

**Remote Debugging**:
- Debug production services (with auth)
- WebSocket connection for live updates
- Team debugging (multiple users watching)

**Visual Debugging**:
- Animated execution flow
- 3D component tree visualization
- Heatmap of frequently executed paths

**Integration with External Tools**:
- Export traces to Chrome DevTools format
- Xdebug integration for PHP-level debugging
- Logging integration (ELK stack, etc.)

**AI-Assisted Debugging**:
- Suggest potential issues
- Explain execution flow
- Recommend optimizations

---

## Success Criteria

### MVP Success Criteria (End of Phase 6)
- ✅ Can enable debug mode in test view
- ✅ Execution traces visible in UI
- ✅ Can set/unset breakpoints via UI
- ✅ Breakpoints pause execution correctly
- ✅ Can inspect component state at any point
- ✅ Zero overhead when debug mode disabled
- ✅ < 10% overhead when debug mode enabled
- ✅ Works with all component types
- ✅ All `instanceof` checks still work
- ✅ Comprehensive unit test coverage

### Production Readiness
- ✅ Documentation complete
- ✅ Security review passed (no debug in production by default)
- ✅ Performance benchmarks met
- ✅ User acceptance testing passed
- ✅ Integration tests passing

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Performance degradation | High | Medium | Extensive benchmarking, optimization passes |
| `instanceof` failures | High | Low | Comprehensive testing, inheritance-based approach |
| Memory leaks | Medium | Medium | Proper cleanup, transient expiration |
| Complex serialization | Medium | High | Simplify state capture, focus on essentials |
| User confusion | Low | Medium | Clear UI, good documentation |
| Production exposure | High | Low | Feature flag, permissions check |

---

## Related Resources

- PHPUnit Mock Object Generator (inspiration): https://github.com/sebastianbergmann/phpunit
- Chrome DevTools Protocol: https://chromedevtools.github.io/devtools-protocol/
- Xdebug Protocol: https://xdebug.org/docs/dbgp
- WordPress Transients API: https://developer.wordpress.org/apis/transients/

---

## Appendix A: Example Generated Debug Class

```php
namespace Convo\Core\Debug\Generated {
    class Debug_TextResponseElement_a1b2c3 extends \Convo\Pckg\Core\Elements\TextResponseElement {
        
        private static $__debugger = null;
        
        public static function setDebugger($debugger) {
            self::$__debugger = $debugger;
        }
        
        public function read(\Convo\Core\Workflow\IConvoRequest $request, \Convo\Core\Workflow\IConvoResponse $response)
        {
            if (self::$__debugger) {
                self::$__debugger->onBeforeRead($this, $request, $response);
                try {
                    parent::read($request, $response);
                    self::$__debugger->onAfterRead($this, $request, $response);
                } catch (\Exception $e) {
                    self::$__debugger->onError($this, $e);
                    throw $e;
                }
            } else {
                parent::read($request, $response);
            }
        }
    }
}
```

---

## Appendix B: Debug Data Format

### Trace Entry Format
```json
{
  "order": 1,
  "phase": "before_read",
  "component_id": "abc-123-def-456",
  "component_class": "\\Convo\\Pckg\\Core\\Elements\\TextResponseElement",
  "component_name": "Say Hello",
  "block_id": "home",
  "block_name": "Home",
  "timestamp": 1701734567.123456,
  "duration": null,
  "params": {
    "text": "Hello world!",
    "append": false
  },
  "request": {
    "text": "hi",
    "platform": "convo_chat"
  },
  "response_before": {
    "text": ""
  },
  "response_after": {
    "text": "Hello world!"
  },
  "error": null
}
```

### Breakpoint Format
```json
{
  "component_id": "abc-123",
  "enabled": true,
  "condition": null,
  "hit_count": 0,
  "hit_limit": null
}
```

### Snapshot Format
```json
{
  "snapshot_id": "bp_1701734567_abc123",
  "timestamp": 1701734567.123456,
  "service_id": "my-service",
  "component_id": "abc-123",
  "phase": "before_read",
  "traces": [...],
  "params": {
    "request": {...},
    "session": {...},
    "user": {...},
    "service": {...}
  },
  "request": {...},
  "response": {...}
}
```

---

**End of Implementation Plan**

