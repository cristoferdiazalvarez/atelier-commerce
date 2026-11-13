# Atelier Commerce delivery plan

## Current scope and authorization

Continue in the existing Atelier Commerce workspace. Never modify BusinessOS. The owner authorized a public `cristoferdiazalvarez/atelier-commerce` GitHub repository, commits and pushes after security validation. The owner has now authorized a separate Vercel Hobby project and Neon Free database. Paid services, payment cards, live payments and changes to BusinessOS remain forbidden.

| Phase               | Acceptance criteria                                                                                                                                        | State                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1. Review           | Read baseline docs; inspect code/data/Git; verify authenticated GitHub owner                                                                               | Complete                                                                                                            |
| 2. Functionality    | Real catalog/variants, account-isolated persistent bag/favorites, address CRUD, server totals, private admin CRUD/search/pagination, transactional stock   | Implemented; validation recorded in PROGRESS.md                                                                     |
| 3. Quality          | Lint, strict types, production build, PostgreSQL integration, desktop/mobile E2E, accessibility checks, screenshots and dependency/secret review           | Complete: 16 unit/integration tests, 26 production E2E checks, lint/typecheck/build, audit and secret review        |
| 4. GitHub           | English documentation, safe examples, PostgreSQL CI, public main branch, description/topics and actual workflow verification                               | Complete: public main, description/topics, anonymous HTTP 200 and successful remote Verify run                      |
| 5. Demo preparation | Current Hobby/Free research, isolated visitor identity, production variables, migrations/seeds, authenticated maintenance and exact HTTPS activation guide | Authorized; waiting for secure access to the Vercel and Neon accounts                                               |
| 6. Handoff          | Actual repository/Actions URLs; results, implemented features, limitations and remaining interventions                                                     | Complete: actual URLs and results in PROGRESS.md; HTTPS activation is authorized and awaits provider account access |

## External dependencies

- Stripe private TEST credentials are required only for a real Stripe test-account network transaction. Unpaid demo checkout works without them.
- Vercel/Neon resource creation is explicitly authorized. Secure account access is still required: integrations are not connected and local CLI/API credentials are unavailable. Do not request hosting approval again.
- Docker execution requires a Docker-equipped machine; the current host has no Docker installation.

## Verification gate

Use a disposable PostgreSQL database for tests. Verify the staged Git content excludes environment secrets, local database files, generated reports and logs. Do not describe unexecuted checks as successful. Verify remote GitHub Actions after pushing and correct failures before final handoff where possible.
