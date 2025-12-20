# Security Review Checklist

AI-generated code has ~40% vulnerability rate. Check explicitly:

## Secrets & Credentials
- [ ] No hardcoded API keys, passwords, tokens
- [ ] No secrets in comments or variable names
- [ ] Environment variables used for all credentials
- [ ] `.env` files in `.gitignore`

## Injection Vulnerabilities
- [ ] SQL: Parameterized queries only (no string concatenation)
- [ ] Command injection: No user input in shell commands
- [ ] XSS: User input sanitized before rendering
- [ ] Path traversal: No user input in file paths without validation

## Input Validation
- [ ] All user-facing endpoints validate input
- [ ] Type checking on API request bodies
- [ ] Length/range limits on string/number inputs
- [ ] Reject unexpected fields (allowlist, not blocklist)

## Authentication & Authorization
- [ ] Auth required on protected routes
- [ ] Authorization checks (not just authentication)
- [ ] Session/token expiry implemented
- [ ] Password hashing (bcrypt/argon2, not MD5/SHA1)

## Dependencies
- [ ] No known vulnerable packages (`npm audit`)
- [ ] No unnecessary dependencies added
- [ ] Lockfile updated consistently

## If Any Check Fails

Report with severity:
- **CRITICAL**: Secrets exposed, injection possible, auth bypass
- **HIGH**: Missing validation, weak crypto, vulnerable deps
- **MEDIUM**: Missing auth on non-sensitive routes, no rate limiting
- **LOW**: Best practice suggestions

Block merge for CRITICAL/HIGH. Flag MEDIUM for human decision.
