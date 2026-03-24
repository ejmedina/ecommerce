@AGENTS.md

# Testing Requirements

## Mandatory Rules

### 1. Write Tests for New Code
- EVERY new function, utility, action, or API route MUST have corresponding tests
- Tests should be in the same directory: `src/lib/utils/foo.ts` → `src/lib/utils/foo.test.ts`
- Test files use `.test.ts` extension with Vitest

### 2. Test Coverage Requirements
- **New code**: 80% minimum coverage for new files
- **Modified code**: All existing tests must continue passing
- Run tests before considering a task complete: `npm test -- --run`

### 3. Test Categories (Priority Order)

**Critical (Always Required):**
- Business logic functions (shipping, pricing, order calculations)
- Utility functions used in multiple places
- API routes and their edge cases
- Prisma actions and database operations

**High Priority:**
- Form validation logic
- Data transformation utilities
- Authentication/authorization helpers

**Nice to Have:**
- Simple UI components (prefer integration tests with Testing Library)
- One-off utility functions

### 4. Before Finishing Any Task
Run `npm test -- --run` and confirm:
- [ ] All existing tests pass
- [ ] New tests cover the implemented functionality
- [ ] No TypeScript errors

### 5. Test Structure
```typescript
import { describe, it, expect } from 'vitest'

describe('functionName', () => {
  it('should do X when Y', () => {
    expect(fn('Y')).toBe('X')
  })
  
  it('should handle edge case Z', () => {
    expect(fn('Z')).toBeNull()
  })
})
```

### 6. CI Enforcement
- Tests run automatically on every push to `main` and `develop`
- Lint runs alongside tests
- Coverage reports are uploaded as artifacts
