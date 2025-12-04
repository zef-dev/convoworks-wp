# Convoworks Debugger - Quick Reference

**TL;DR**: Runtime class extension debugger for Convoworks workflow components.

---

## Core Concept

Instead of wrapping components (breaks `instanceof`), we **extend them dynamically** before instantiation:

```
Original Component → DebugProxyGenerator → Extended Component
   ↓                       ↓                      ↓
TextElement      generates once        Debug_TextElement_a1b2c3
   ↓                       ↓                      ↓
new TextElement()  →  new Debug_TextElement_a1b2c3()
```

**Result**: All type checks pass because inheritance preserves identity.

---

## Key Files to Create

### Backend (PHP)

```
src/Convo/Core/Debug/
├── IDebugger.php                    # Interface for all debuggers
├── DebugProxyGenerator.php          # Generates extended classes
├── DebugComponentFactory.php        # Factory that uses generated classes
├── TracingDebugger.php              # Logs execution traces
├── BreakpointDebugger.php           # Adds pause/resume
├── ProfilingDebugger.php            # Performance metrics
├── DebugBreakException.php          # Exception for breakpoints
└── Generated/                       # Namespace for generated classes (empty)

src/Convo/Core/Admin/
└── DebugRestHandler.php             # REST API for debug operations
```

### Frontend (AngularJS)

```
app/convoworks/debug/
├── debug-service.js                 # Angular service for debug API
├── debug-panel.directive.js         # Main debug UI panel
├── execution-trace.directive.js     # Trace timeline visualization
├── component-inspector.directive.js # Component state viewer
├── debug-panel.tmpl.html
├── execution-trace.tmpl.html
└── component-inspector.tmpl.html
```

---

## Integration Points

### 1. PackageProvider (Factory Creation)

**Location**: Wherever `DefaultComponentFactory` is instantiated

```php
// Normal mode
$factory = new DefaultComponentFactory($componentData);

// Debug mode  
if ($debugEnabled) {
    $generator = new DebugProxyGenerator($logger);
    $debugger = new TracingDebugger($logger);
    $factory = new DebugComponentFactory($componentData, $generator, $debugger);
}
```

### 2. Service Factory (Debug Mode Detection)

**Location**: `ConvoServiceFactory::getService()` or similar

```php
$debugMode = $this->_isDebugMode($request, $serviceId);
// Pass to PackageProvider
```

### 3. Test View API (Request Enhancement)

**Location**: Test chat request handler

```javascript
// Frontend sends
{
  text: "hello",
  debug: {
    enabled: true,
    session_id: "session-123"
  }
}

// Backend responds
{
  response: { text: "hi" },
  debug: {
    session_id: "session-123",
    status: "completed",
    trace_count: 42
  }
}
```

---

## REST API Endpoints

```
POST   /admin/debug/breakpoints/{serviceId}    # Set breakpoints
GET    /admin/debug/breakpoints/{serviceId}    # Get breakpoints
GET    /admin/debug/traces/{sessionId}         # Get execution traces
GET    /admin/debug/snapshot/{snapshotId}      # Get breakpoint snapshot
POST   /admin/debug/continue/{snapshotId}      # Resume from breakpoint
```

---

## How It Works (Runtime Flow)

### Without Debugger (Normal)
```
Request → ConvoServiceFactory → PackageProvider → DefaultComponentFactory
    → new TextElement() → component.read() → Response
```

### With Debugger (Debug Mode)
```
Request → ConvoServiceFactory → PackageProvider → DebugComponentFactory
    → DebugProxyGenerator.getDebugClass('TextElement')
    → (first time: generate + cache Debug_TextElement)
    → new Debug_TextElement() → component.read()
        → debugger.onBeforeRead()
        → parent::read() (original logic)
        → debugger.onAfterRead()
    → Response + Debug Data
```

---

## Generated Class Example

**Original**:
```php
class TextResponseElement extends AbstractWorkflowComponent {
    public function read($request, $response) {
        $text = $this->evaluateString($this->_text);
        $response->addText($text);
    }
}
```

**Generated** (once per class, cached):
```php
namespace Convo\Core\Debug\Generated;

class Debug_TextResponseElement_a1b2c3 extends \Convo\Pckg\Core\Elements\TextResponseElement {
    private static $__debugger = null;
    
    public static function setDebugger($debugger) {
        self::$__debugger = $debugger;
    }
    
    public function read($request, $response) {
        if (self::$__debugger) {
            self::$__debugger->onBeforeRead($this, $request, $response);
            try {
                parent::read($request, $response); // Original logic
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
```

**Instance**:
```php
$instance = new Debug_TextResponseElement_a1b2c3($properties, $service);

// ✅ All type checks work
$instance instanceof TextResponseElement;        // true
$instance instanceof AbstractWorkflowComponent;  // true
$instance instanceof IConversationElement;       // true
```

---

## Why This Approach?

### ❌ Simple Wrapper (doesn't work)
```php
class Wrapper {
    private $wrapped;
    public function __call($method, $args) { ... }
}

$instance = new Wrapper(new TextElement());
$instance instanceof TextElement;  // ❌ FALSE - breaks code
```

### ✅ Dynamic Extension (works)
```php
class Debug_TextElement extends TextElement {
    public function read($req, $res) {
        parent::read($req, $res);  // Delegates to original
    }
}

$instance = new Debug_TextElement();
$instance instanceof TextElement;  // ✅ TRUE - preserves type
```

---

## Implementation Checklist

### Phase 1: MVP (Tracing Only)
- [ ] Create `IDebugger` interface
- [ ] Implement `DebugProxyGenerator`
- [ ] Implement `DebugComponentFactory`
- [ ] Implement `TracingDebugger`
- [ ] Hook into PackageProvider
- [ ] Add debug mode detection
- [ ] Create `DebugRestHandler`
- [ ] Add test view debug toggle
- [ ] Display traces in UI

### Phase 2: Breakpoints
- [ ] Implement `BreakpointDebugger`
- [ ] Add state serialization
- [ ] Create breakpoint UI controls
- [ ] Test pause/resume flow

### Phase 3: Polish
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation
- [ ] Production hardening

---

## Performance Considerations

### Overhead
- **Debug OFF**: 0% overhead (uses standard factory)
- **Debug ON**: ~5-10% overhead (one `parent::` call + hook execution)
- **Class generation**: One-time cost per class type (~5-10ms), then cached

### Memory
- **Generated classes**: Minimal (stored in opcache if available)
- **Traces**: Configurable limit (default: 1000 events max)
- **Storage**: Use WordPress transients (auto-expire)

### Optimization Tips
- Generate classes once, cache in static array
- Use static debugger injection (no per-instance overhead)
- Lazy-load debug infrastructure
- Only enable in development/test environments

---

## Security Considerations

- **Production**: Debug mode should be disabled by default
- **Access**: Only authenticated admin users can enable debug
- **Data exposure**: Traces may contain sensitive data (filter as needed)
- **Performance**: Debug mode can add load (rate limit if needed)

**Recommended**:
```php
if (!current_user_can('manage_options')) {
    return false; // No debug for non-admins
}

if (defined('WP_ENV') && WP_ENV === 'production') {
    return false; // No debug in production
}
```

---

## Testing Strategy

### Unit Tests
```php
// Test that generated classes work
$generator = new DebugProxyGenerator($logger);
$debugClass = $generator->getDebugClass(TextElement::class);
$instance = new $debugClass($properties, $service);

// Verify type preservation
$this->assertInstanceOf(TextElement::class, $instance);
$this->assertInstanceOf(AbstractWorkflowComponent::class, $instance);

// Verify hooks called
$debugger = new TracingDebugger($logger);
$debugClass::setDebugger($debugger);
$instance->read($request, $response);
$traces = $debugger->getTraces();
$this->assertCount(2, $traces); // before + after
```

### Integration Tests
```php
// Test full service execution with debug
$service = $factory->getService($user, $serviceId, $versionId, $paramsFactory);
$request = $this->createMockRequest();
$response = $this->createMockResponse();

// Enable debug mode
$this->enableDebugMode();

// Execute
$service->run($request, $response);

// Verify traces
$traces = $this->getDebugTraces();
$this->assertGreaterThan(0, count($traces));
```

---

## Common Issues & Solutions

### Issue: Generated class not found
**Cause**: Class generation failed or wasn't triggered  
**Solution**: Check logs, verify eval() not disabled, check class name

### Issue: `instanceof` still failing
**Cause**: Using wrapper instead of extension  
**Solution**: Verify using `DebugProxyGenerator`, not a wrapper class

### Issue: Debugger not called
**Cause**: Static debugger not set  
**Solution**: Call `$debugClass::setDebugger($debugger)` after generation

### Issue: Final class error
**Cause**: Trying to extend final class  
**Solution**: `DebugProxyGenerator` should detect and skip final classes

### Issue: Memory leak
**Cause**: Traces accumulating indefinitely  
**Solution**: Add trace limit, clear old traces, use transients with expiration

---

## Future Ideas

- **Conditional breakpoints**: Break only if expression true
- **Time-travel debugging**: Replay past executions
- **Remote debugging**: Debug production (with auth)
- **Visual flow**: Animated execution diagram
- **AI suggestions**: Explain issues, suggest fixes
- **Export traces**: Chrome DevTools format

---

## Questions?

See full implementation plan: `DEBUGGER_IMPLEMENTATION_PLAN.md`

