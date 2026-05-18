# KBase Backend Testing Guide

This document explains what is tested, which tools are used, how the tests are organized, and how testing is connected to CI/CD.

## Testing Goals

The backend tests are designed to verify the main business behavior of each service before Docker images are built and deployed.

Current focus:

- Unit tests for service-layer business logic.
- Controller tests for API response wrapping and service delegation.
- Security helper tests for authenticated user extraction and role checks.
- Gateway filter tests for JWT validation, header forwarding, and blacklist behavior.
- JaCoCo coverage reports for each backend service.

The tests avoid real external systems such as PostgreSQL, Redis, S3, SQS, and Eureka. Those dependencies are mocked so the test suite stays fast and stable in CI.

## Tools Used

- **JUnit 5**: test framework.
- **Mockito**: mocks repositories, service clients, S3, SQS, Redis-backed helpers, and downstream services.
- **AssertJ**: readable assertions.
- **Spring Test**: helpers such as `ReflectionTestUtils`, `MockMultipartFile`, and reactive mock exchange objects.
- **JaCoCo**: coverage report generation.
- **GitHub Actions**: runs tests in CI/CD and publishes coverage reports.

## Test Structure

Tests follow the same package structure as production code:

```text
kbase-auth-service/
  src/test/java/com/kbase/auth/
    controller/
    service/
    util/

kbase-project-service/
  src/test/java/com/kbase/project/
    controller/
    security/
    service/

kbase-storage-service/
  src/test/java/com/kbase/storage/
    controller/
    security/
    service/

kbase-api-gateway/
  src/test/java/com/kbase/gateway/
    filter/
    util/
```

## What Is Covered

### API Gateway

Covered tests:

- JWT validation utility.
- Expired and malformed token handling.
- Public routes bypass authentication.
- Protected routes without tokens continue without spoofed `X-User-*` headers.
- Invalid JWT returns `401 Unauthorized`.
- Blacklisted user returns `401 Unauthorized`.
- Valid JWT forwards trusted `X-User-Id`, `X-User-Email`, and `X-User-Role` headers.
- SSE clients can provide JWT through the `token` query parameter.

Main test files:

- `JwtTokenProviderTest`
- `JwtAuthenticationGatewayFilterTest`

### Auth Service

Covered tests:

- User registration creates a user and returns access/refresh tokens.
- Duplicate email registration is rejected.
- Login succeeds for active users.
- Login rejects inactive users.
- Refresh token flow rotates refresh tokens.
- Inactive users cannot refresh access tokens.
- Internal user lookup handles invalid IDs.
- Profile update trims full names.
- User deactivation revokes refresh tokens, blacklists the user at the gateway, and publishes an event.
- User activation removes the user from the gateway blacklist.
- Auth controller endpoints delegate to `AuthService` and return expected response statuses.
- JWT generation and parsing.

Main test files:

- `AuthServiceTest`
- `AuthControllerTest`
- `JwtTokenProviderTest`

### Project Service

Covered tests:

- Project creation creates owner membership.
- Duplicate project names for the same owner are rejected.
- Long descriptions are rejected.
- Adding members validates user existence and saves membership.
- Adding the owner as a member is rejected.
- Project member listing uses fallback values when Auth Service does not return user details.
- Owner role updates and owner promotion through member role update are rejected.
- Ownership transfer updates project owner and member roles.
- Project deletion cleans related storage, invitations, activities, and project data.
- Admin storage limit update validates input and persists the new limit.
- Invitation creation, duplicate invite rejection, revocation, acceptance, and rejection.
- Invitation acceptance creates membership and notification.
- Activity logging sends events to SQS and maps activity events to entities.
- Project controller endpoints delegate to `ProjectService`.
- `SecurityUtils` reads authenticated principal and role.

Main test files:

- `ProjectServiceTest`
- `ProjectInvitationServiceTest`
- `NotificationServiceTest`
- `ActivityLogServiceTest`
- `ProjectControllerTest`
- `SecurityUtilsTest`

### Storage Service

Covered tests:

- File upload checks project quota, uploads to S3, saves metadata, and publishes activity events.
- Quota exceeded upload is rejected before S3 upload.
- Soft delete marks documents as deleted and publishes activity.
- Restore clears soft-delete fields and publishes activity.
- Hard delete removes S3 object and database record.
- Preview URL generation requires read access and returns a presigned URL.
- Download resolves S3 key and returns a stream.
- Project cascade delete removes all related S3 files and DB rows.
- Document list methods map entities to DTOs.
- Trash cleanup deletes expired trash from S3 and DB.
- Permission checks allow valid roles and reject viewers, non-members, unknown roles, and missing documents.
- Storage controller endpoints delegate to `FileStorageService`.
- `SecurityUtils` reads authenticated principal and role.

Main test files:

- `FileStorageServiceTest`
- `StoragePermissionServiceTest`
- `TrashCleanupServiceTest`
- `StorageControllerTest`
- `SecurityUtilsTest`

## How To Run Tests Locally

Run all backend tests and generate coverage:

```bash
mvn clean verify
```

Run one service:

```bash
mvn -pl kbase-auth-service -am clean verify
mvn -pl kbase-project-service -am clean verify
mvn -pl kbase-storage-service -am clean verify
mvn -pl kbase-api-gateway -am clean verify
```

## Coverage Reports

JaCoCo generates one HTML report per module:

```text
kbase-api-gateway/target/site/jacoco/index.html
kbase-auth-service/target/site/jacoco/index.html
kbase-project-service/target/site/jacoco/index.html
kbase-storage-service/target/site/jacoco/index.html
```

Current line coverage after the latest local verification:

| Service | Line Coverage |
|---|---:|
| API Gateway | 60.66% |
| Auth Service | 45.05% |
| Project Service | 40.26% |
| Storage Service | 48.09% |

The public coverage website is published by GitHub Actions:

```text
https://leeduchank.github.io/kbase_project/
```

## CI/CD Integration

Testing is connected to CI/CD through GitHub Actions:

- `.github/workflows/run-tests.yml` runs `mvn clean verify` on `push`, `pull_request`, and manual dispatch.
- Service deployment workflows run `mvn -pl <service> -am clean verify`.
- If tests fail, the workflow stops before Docker image build, Docker push, and EC2 deployment.
- JaCoCo HTML reports are uploaded as workflow artifacts.
- On `main`, coverage reports are published to GitHub Pages.

Deployment workflows now use `verify` instead of `-DskipTests`, so tests are part of the deployment gate.

## Recommended Next Steps

- Add integration tests with Testcontainers for repository/database behavior.
- Add API tests with `MockMvc` or `WebTestClient` for security configuration.
- Add coverage thresholds once the team agrees on target numbers.
- Suggested first threshold: 40% line coverage per service, then increase gradually.
