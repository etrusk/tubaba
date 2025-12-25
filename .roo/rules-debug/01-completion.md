# Debug Mode Completion Rules

## Post-Completion Protocol

After resolving the debug issue, execute these steps:

### 1. Build Verification
```bash
npm run build
```
Ensure build succeeds before presenting completion to user.

### 2. Commit Prompt
Ask the user: "Should I commit and push these changes?"
- Wait for explicit approval before any git operations
- If approved, use conventional commit format
