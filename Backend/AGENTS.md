# Repository Guidelines

## Project Structure & Module Organization
The Spring Boot service is rooted at src/main/java/org/vesper, with VesperApplication bootstrapping the context. Package folders map to layers (controller, service, epo, entity, dto, config) so keep new classes in their layer to preserve clear wiring. Shared configuration, static assets, and pplication.properties live in src/main/resources; database fixtures or temp files belong under data/ instead of esources/.

## Build, Test & Development Commands
- ./gradlew bootRun (Linux/macOS) or .&\gradlew bootRun (PowerShell) starts the API with dev profiles and reload support.
- ./gradlew build performs a clean compile, runs the full test suite, and assembles the runnable jar into uild/libs.
- ./gradlew test --info surfaces JUnit output when iterating on failing cases.
- ./gradlew clean clears uild/ to resolve stale classpath issues.

## Coding Style & Naming Conventions
Use Java 21, 4-space indentation, and Lombok annotations (@Getter, @Builder) where precedent exists. Controllers end with Controller, services with Service, repositories with Repository, and DTOs with Request/Response. Expose REST endpoints with descriptive, kebab-cased paths (e.g., /api/perfumes). Prefer constructor injection and mark security concerns with clear @PreAuthorize expressions.

## Testing Guidelines
JUnit 5 and Spring Boot test slices are available via spring-boot-starter-test and spring-security-test. Place tests under src/test/java mirroring the main package. Name classes SomethingTests and individual methods using shouldDoX_whenCondition. Run targeted suites with ./gradlew test --tests "org.vesper.service.*". Aim to cover controller happy paths, security edge cases, and repository queries before opening a PR.

## Commit & Pull Request Guidelines
Recent history favors short, present-tense Spanish summaries (e.g., cambio a mysql, compato la subida de imagenes a un solo controller). Keep that tone, start with the feature or module touched, and avoid trailing punctuation. For pull requests, include: 1) a concise change description, 2) linked Jira/GitHub issue, 3) manual test notes or curl commands, and 4) screenshots for API contract or error message changes. Ensure CI passes and tag reviewers responsible for the affected module.

## Configuration & Security Notes
Secrets and API tokens should never live in pplication.properties; instead, use environment variables or an external vault. Document any new pplication-*.properties profiles you introduce. Validate that new endpoints respect SecurityConfig rules and update audience validation if OAuth scopes change.
