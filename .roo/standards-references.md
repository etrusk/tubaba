# Industry Standards Reference Library

Quick links to authoritative sources for challenging decisions against best practices.

## Security

| Standard | Reference | When to Cite |
|----------|-----------|--------------|
| OWASP Top 10 | https://owasp.org/Top10/ | Any security-related code review |
| OWASP Cheat Sheets | https://cheatsheetseries.owasp.org/ | Specific implementation guidance |
| CWE Top 25 | https://cwe.mitre.org/top25/ | Vulnerability classification |

## TypeScript / JavaScript

| Topic | Reference | When to Cite |
|-------|-----------|--------------|
| TypeScript Handbook | https://www.typescriptlang.org/docs/handbook/ | Type system questions |
| TypeScript Do's and Don'ts | https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html | Style decisions |
| Node.js Best Practices | https://github.com/goldbergyoni/nodebestpractices | Node.js architecture |
| JavaScript Info | https://javascript.info/ | Language fundamentals |

## Architecture & Design

| Topic | Reference | When to Cite |
|-------|-----------|--------------|
| SOLID Principles | https://en.wikipedia.org/wiki/SOLID | OOP design decisions |
| 12-Factor App | https://12factor.net/ | Cloud-native architecture |
| Clean Architecture | https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html | Layer separation |
| Domain-Driven Design | https://martinfowler.com/bliki/DomainDrivenDesign.html | Complex domain modeling |

## API Design

| Topic | Reference | When to Cite |
|-------|-----------|--------------|
| REST API Design | https://restfulapi.net/ | HTTP API patterns |
| JSON:API Spec | https://jsonapi.org/ | Response structure |
| HTTP Status Codes | https://httpstatuses.com/ | Response code selection |
| OpenAPI Spec | https://swagger.io/specification/ | API documentation |

## Testing

| Topic | Reference | When to Cite |
|-------|-----------|--------------|
| Testing Trophy | https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications | Test strategy |
| Jest Best Practices | https://github.com/goldbergyoni/javascript-testing-best-practices | Test implementation |
| Test Doubles | https://martinfowler.com/bliki/TestDouble.html | Mock/stub/spy usage |

## Database

| Topic | Reference | When to Cite |
|-------|-----------|--------------|
| SQL Injection Prevention | https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html | Database queries |
| Database Normalization | https://en.wikipedia.org/wiki/Database_normalization | Schema design |
| N+1 Query Problem | https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem-in-orm | Query optimization |

## How to Use These References

When challenging a decision or flagging an issue:

1. **Identify the standard category** (security, architecture, etc.)
2. **Find the specific reference** from the table above
3. **Quote the relevant section** with a direct link
4. **Propose the compliant alternative**

### Example Challenge

> "This approach violates OWASP A03 (Injection). The SQL query uses string 
> concatenation instead of parameterized queries. See 
> https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
> 
> Instead, use: `db.query('SELECT * FROM users WHERE id = ?', [userId])`"
