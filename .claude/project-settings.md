# Project Reminders

## Testing Checklist

Before completing any task, verify:

- [ ] **Tests written**: New code has corresponding `.test.ts` files
- [ ] **Tests pass**: `npm test -- --run` exits with code 0
- [ ] **Coverage**: New critical functions have adequate test coverage
- [ ] **No regressions**: Existing tests still pass

## Quick Commands

```bash
# Run all tests
npm test -- --run

# Watch mode during development
npm run test:watch

# Check coverage
npm run test:coverage
```
