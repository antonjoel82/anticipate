# Frontend Development Guide

## Core Programming Principles

### General

- Use PascalCase for component file names and Components -- even those from ShadCN / Radix
- Use camelCase for all other files
- Utilize semantic dot-suffixes (i.e. `.utils.ts` or `.const.ts`) for most file types, but not components, hooks, etc
- Make incremental commits grouped by functionality rather than one large one per task

### TypeScript

- **Zero `any` types** - Use strict TypeScript everywhere
- Define `type` for all data structures
- Use type guards for runtime validation
- Generate types from external schemas (databases, APIs)
- Leverage generic constraints instead of `any`
- Prefix any boolean field names (in code or Databases) with words that explicitly call out that it's a boolean. E.g. "is, can, should, are, etc."
- Use explicit types when initializing variables such that they are typed correctly.
- Use `Array<T>` instead of `T[]`
- Use abstracted types to make intent clear and allow for easier refactoring. E.g.

  ```TypeScript
  // bad - don't do this
  interface Team {
    id: number;
  }

  // good
  type TeamId = number;
  interface Team {
    id: TeamId;
  }
  ```

### Code Organization

- **Domain-driven structure** - Organize by business domain, not technical layer
- **Named exports only** (except framework-required default exports)
- **Direct imports only** - No barrel exports (`index.ts` files) as they negatively impact build performance and module resolution speed
- Clear separation between business logic and framework code
- Co-locate tests and the code they test! Unless specific e2e sort of tests like Playwright

### Error Handling

- **Consistent error patterns** - Create domain-specific error classes
- Centralized error handling with unique error IDs
- Structured logging with context
- Never leak internal errors to users
- Validate inputs at boundaries

### Data Patterns

- **Immutability** - Prefer immutable operations and pure functions
- Service layer for business logic encapsulation
- Separate concerns: validation, transformation, persistence

## Frontend Architecture

### Project Structure

```
src/
├── design-system/
├── domains/           # Business domains (events, users, etc.)
│   └── [domain]/
│       ├── types/ # Domain types
│       ├── hooks/ # Business logic
│       ├── utils/ # Utils
|       └── components/ # UI components by domain
├── shared/           # Cross-domain utilities
└── routes/          # Framework routing
```

## Frontend Patterns

### Component Architecture

- **Component composition** over inheritance
- **Hooks for state management** - Avoid global state when possible
- **Server state separation** - Use query libraries for API data
- **Progressive enhancement** - Build for accessibility first
- **Performance budgets** - Monitor bundle size and load times
- Build components as headless for flexibility across use cases
- Extract reusable logic into custom hooks
  - Hooks compose pure utility functions (testable inputs/outputs)
  - Multiple hooks can be composed to provide component props
- Strong separation of concerns: functions → hooks → components

#### Component Props - Avoid Boolean Hell

**Principle:** Multiple related boolean props create complexity and impossible states.

❌ **Avoid:**

```typescript
interface Props {
  isGenerating: boolean
  isStreaming: boolean
  canSendMessage: boolean
}
```

✅ **Prefer enumerated states:**

```typescript
type ChatState = 'idle' | 'generating' | 'streaming' | 'disabled'
interface Props {
  state: ChatState
}
```

✅ **Or Sets for concurrent capabilities:**

```typescript
type ChatCapability = 'can-send' | 'can-clear' | 'is-streaming'
interface Props {
  capabilities: Set<ChatCapability>
}
```

**Benefits:**

- Single source of truth
- Prevents impossible states
- More scalable
- Easier to reason about

### Styling & Design System Standards

- Use class variant authority package for all component styling
  - Define variants through properties: size, color, action type, etc
  - No raw/base tokens in application code
  - Everything originates from semantic tokens or design system variants
- Create 2 Storybook Stories for every Design System component
- Don't declare magic values. When setting a fixed or responsive height, set it as a CSS variable for access everywhere.
  - E.g. `--max-shader-panel-height:
- Use `react-icons` for icons. Never install other icon libraries. Default to Tabler Icons (`react-icons/tb`).
  - When importing icons, use an alias to remove the prefix:
    ```TypeScript
      import { TbCheck as Check } from 'react-icons/tb';
    ```

### File Organization & TypeScript

- Declare functions, hooks, components in eponymous files
- Use direct imports from specific files rather than barrel exports
- Strong TypeScript typing required
  - Define PropTypes in separate TypeScript type above component
  - Use defined types within component implementation

### State Management

- **Local state first** - Use component state before global state
- **Server state isolation** - Separate client state from server data
- **Optimistic updates** - Update UI immediately, handle failures
- **State normalization** - Avoid deeply nested state structures

#### State Management Architecture Pattern

This project follows a strict separation of state management responsibilities:

**React Query** - Server state only:

- API data fetching and caching
- Server mutations with optimistic updates
- SSR hydration via `ensureQuery()` in route loaders
- Never use for UI state (collapsed panels, input values, etc.)

**Jotai** - Persistent UI state:

- UI state that should persist across renders
- Cross-component UI coordination
- User preferences and settings
- Never use for server data or temporary input state

**useState** - Ephemeral local state:

- Streaming progress indicators
- Form input values (before submission)
- Temporary UI state scoped to a single component
- Publish to React Query cache when operation completes

**Example Pattern:**

````typescript
export function useGenerativeChat() {
  // React Query for server state
  const { data: messages } = useMessages(conversationId);
  const createMessage = useCreateMessage();

  // Jotai for persistent UI state
  const [session, setSession] = useAtom(generativeSessionAtom);

  // useState for streaming/local state
  const [progress, setProgress] = useState<StreamProgress | null>(null);

  const sendMessage = async (prompt: string) => {
    // Local state for streaming
    setProgress({ stage: 'generating', message: 'Starting...' });

    // Stream completion -> publish to React Query
    const result = await generateShader({ prompt });
    await createMessage.mutateAsync({ content: result });

    // Update Jotai for UI coordination
    setSession({ mode: 'editing' });
  };
}

### API Integration

- **Client abstraction** - Wrap HTTP clients for consistency
- **Retry logic** - Handle transient failures gracefully
- **Request deduplication** - Avoid duplicate concurrent requests
- **Response caching** - Cache responses based on staleness tolerance

### Testing Strategy

- **Component tests** for UI behavior
- **E2E tests** for critical user flows
- **Test data factories** for consistent fixtures
- **Domain-focused tests** - Test business logic thoroughly
- **Integration tests** for API contracts

## Performance Guidelines

- **Lazy loading** - Load components and routes on demand
- **Bundle optimization** - Tree-shake unused code
- **Memory management** - Avoid memory leaks in long-running processes
- **Caching strategies** - Cache at appropriate layers

### Animation & Real-Time Performance

**Critical Rule: Never call `setState` inside `requestAnimationFrame` loops**

This causes React to re-render the component tree 60 times per second, competing with your animation for CPU time.

```typescript
// ❌ TERRIBLE - 60 React re-renders per second
const animate = () => {
  setState({ data: newData }); // Triggers re-render!
  requestAnimationFrame(animate);
};

// ✅ GOOD - Use refs for 60fps, throttle state to 15fps
const dataRef = useRef(data);
const lastUIUpdate = useRef(0);

const animate = () => {
  dataRef.current = newData; // No re-render

  // Throttle React updates
  if (performance.now() - lastUIUpdate.current > 66) { // ~15fps
    lastUIUpdate.current = performance.now();
    setState({ data: newData });
  }
  requestAnimationFrame(animate);
};
````

**Effect Dependencies in Animation Loops**

Values in useEffect deps that change frequently will restart the animation loop:

```typescript
// ❌ BAD - Loop restarts on debug toggle
useEffect(() => {
  animate()
  return cleanup
}, [isPaused, isDebugMode]) // isDebugMode causes restart

// ✅ GOOD - Use refs for non-critical deps
const isDebugModeRef = useRef(isDebugMode)
isDebugModeRef.current = isDebugMode

useEffect(() => {
  const animate = () => {
    if (isDebugModeRef.current) {
      /* ... */
    }
  }
  animate()
  return cleanup
}, [isPaused]) // Only critical deps
```

**Object Reference Stability**

Inline fallback objects create new references every render:

```typescript
// ❌ BAD - New object every render
const config = data?.config || { defaults: true }

// ✅ GOOD - Memoize fallbacks
const defaultConfig = useMemo(() => ({ defaults: true }), [])
const config = data?.config || defaultConfig
```

### Route Code Splitting (TanStack Router)

Heavy routes should use `.lazy.tsx` files:

```typescript
// routes/heavy-page.tsx - Loader only
export const Route = createFileRoute('/heavy')({
  loader: async () => {
    /* SSR data */
  },
})

// routes/heavy-page.lazy.tsx - Component (code-split)
export const Route = createLazyFileRoute('/heavy')({
  component: HeavyComponent,
  pendingComponent: LoadingSpinner,
})
```

## Quality Standards

### Code Quality

- **Meaningful names** - Functions and variables should be self-documenting
- **Single responsibility** - Functions should do one thing well
- **Early returns** - Reduce nesting with guard clauses
- **Comment business logic only** - Code should be self-explanatory
- **Consistent formatting** - Use automated formatters

## Key Principles Summary

1. **Type safety everywhere** - Catch errors at compile time
2. **Domain-driven organization** - Structure by business logic
3. **Immutable data patterns** - Reduce side effects and bugs
4. **Consistent error handling** - Provide clear error experiences
5. **Performance by default** - Build fast applications from the start
6. **Test-driven quality** - Write tests that give confidence
7. **Component composition** - Build reusable, maintainable UI
8. **Accessibility first** - Build inclusive user experiences

```

```
