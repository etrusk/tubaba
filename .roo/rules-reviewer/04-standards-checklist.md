# Industry Standards Quick Reference

Use this checklist when reviewing code against established best practices.

## TypeScript Standards

### Required (Block if Violated)
- ❌ `any` types without `@ts-expect-error` comment explaining why
- ❌ Non-null assertions (`!`) without null check on preceding line
- ❌ Type assertions (`as X`) instead of proper type guards
- ❌ Implicit `any` from missing parameter types

### Expected (Flag for Discussion)
- ⚠️ Missing explicit return types on exported functions
- ⚠️ Union types exceeding 4 options (consider discriminated union)
- ⚠️ Generic type parameters exceeding 2 per function
- ⚠️ `Object` or `{}` as types (use `Record<string, unknown>`)

### Best Practice (Recommend)
- ✅ Strict mode enabled in tsconfig.json
- ✅ `readonly` for arrays/objects that shouldn't mutate
- ✅ `unknown` over `any` when type is truly unknown
- ✅ Explicit `undefined` in optional parameters

---

## Security Standards (OWASP Top 10 2021)

### A01: Broken Access Control
- ❌ Missing authorization checks on protected endpoints
- ❌ IDOR vulnerabilities (user A accessing user B's resources)
- ❌ CORS misconfiguration (`Access-Control-Allow-Origin: *` on sensitive APIs)

### A02: Cryptographic Failures
- ❌ Passwords stored in plain text or weak hashing (MD5, SHA1)
- ❌ Sensitive data transmitted without TLS
- ❌ Hardcoded encryption keys

### A03: Injection
- ❌ SQL string concatenation (use parameterized queries)
- ❌ User input in shell commands (use allowlists)
- ❌ Unsanitized HTML rendering (use framework escaping)

### A04: Insecure Design
- ❌ Missing rate limiting on authentication
- ❌ No account lockout after failed attempts
- ❌ Security-sensitive operations without confirmation

### A05: Security Misconfiguration
- ❌ Debug mode enabled in production
- ❌ Default credentials
- ❌ Verbose error messages exposing internals

---

## Code Quality Standards (SOLID + Clean Code)

### Single Responsibility
- ❌ God objects (>5 public methods doing unrelated things)
- ❌ Functions exceeding 50 lines
- ❌ Classes with "Manager", "Handler", "Processor" doing multiple jobs

### Dependency Management
- ❌ Direct instantiation of dependencies inside constructors
- ❌ Static method calls for swappable services
- ❌ Circular dependencies between modules

### Code Clarity
- ❌ Magic numbers without named constants
- ❌ Nested conditionals >3 levels deep
- ❌ Boolean parameters (use options object or separate methods)
- ❌ Comments explaining "what" instead of "why"

---

## Node.js/JavaScript Standards

### Async Patterns
- ❌ Sync file I/O in request handlers (`readFileSync`, `writeFileSync`)
- ❌ Unhandled promise rejections
- ❌ Callback hell (>2 levels of nesting)
- ❌ Mixing callbacks and promises

### Error Handling
- ❌ Empty catch blocks
- ❌ Catching errors without logging
- ❌ Throwing strings instead of Error objects
- ❌ Not propagating errors in async chains

### Performance
- ⚠️ Large arrays processed synchronously
- ⚠️ No pagination on data fetches
- ⚠️ Repeated expensive computations (consider memoization)

---

## Reporting Template

When a standard is violated, report as:

```markdown
## Recommendations (Should Fix)
- [ ] [Violation description]
  - **Location:** `file.ts:line`
  - **Standard:** [OWASP A03 | SOLID-SRP | TypeScript strict | Node.js async]
  - **Evidence:** [Link to official docs or industry consensus]
  - **Fix:** [Compliant alternative approach]
```

---

## Authoritative References

- **OWASP Top 10:** https://owasp.org/Top10/
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/handbook/
- **Node.js Best Practices:** https://github.com/goldbergyoni/nodebestpractices
- **Clean Code (Martin):** https://gist.github.com/wojteklu/73c6914cc446146b8b533c0988cf8d29
- **SOLID Principles:** https://en.wikipedia.org/wiki/SOLID
