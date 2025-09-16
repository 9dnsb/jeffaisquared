---
description: Run full code quality check pipeline
argument-hint: (no arguments needed)
---

Run the complete code quality pipeline for the project:

- TypeScript compilation check (strict mode)
- ESLint code quality rules
- Code duplication detection with jscpd
- Unit tests with coverage reporting
- Playwright E2E tests
- Production build verification

Execute: `npm run check`

This ensures all code follows project standards before committing or deploying.