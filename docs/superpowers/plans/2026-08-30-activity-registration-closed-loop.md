# Activity Registration Closed Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing activity registration flow with one shared versioned registration template, dynamic answers, registration detail, and server-side export without replacing existing activity lifecycle or registration APIs.

**Architecture:** Keep `ActivityRegistration` as the source of truth. Add immutable template revisions and JSON answers, bind a revision when an activity first opens registration, and extend existing registration services/controllers plus the Activities store and pages. Existing lifecycle, optimistic locking, center scope, audit, and CSV safety patterns remain authoritative.

**Tech Stack:** NestJS 11, Prisma 6, PostgreSQL, Fastify, Nuxt 4, Vue 3, Pinia, TypeScript, Vitest, Playwright.

---

### Task 1: Registration template domain and persistence

**Files:**
- Create: `E:/文档/ChatGPT/HSD_alliance_backend/src/registrations/registration-template.ts`
- Create: `E:/文档/ChatGPT/HSD_alliance_backend/src/registrations/dto/registration-template.dto.ts`
- Create: `E:/文档/ChatGPT/HSD_alliance_backend/src/registrations/dto/registration-template-response.dto.ts`
- Modify: `E:/文档/ChatGPT/HSD_alliance_backend/prisma/schema.prisma`
- Create: `E:/文档/ChatGPT/HSD_alliance_backend/prisma/migrations/20260830000200_activity_registration_template/migration.sql`
- Test: `E:/文档/ChatGPT/HSD_alliance_backend/test/registration-template-spec.ts`

- [ ] Write and run failing pure validation tests for field definitions, stable IDs, required answers, field types, options, and multi-select limits.
- [ ] Implement normalized template definitions and answer validation with stable `DomainError` codes.
- [ ] Add template/revision relations, activity revision binding, registration answer JSON, and identity snapshots with a non-destructive V1 backfill.
- [ ] Add DTOs with class-validator and Swagger metadata.
- [ ] Run the pure test and Prisma schema formatting/checks.

### Task 2: Existing registration and activity lifecycle integration

**Files:**
- Modify: `E:/文档/ChatGPT/HSD_alliance_backend/src/activities/activities.service.ts`
- Modify: `E:/文档/ChatGPT/HSD_alliance_backend/src/registrations/registrations.service.ts`
- Modify: `E:/文档/ChatGPT/HSD_alliance_backend/src/registrations/registrations-member.controller.ts`
- Modify: `E:/文档/ChatGPT/HSD_alliance_backend/src/registrations/registrations-admin.controller.ts`
- Modify: `E:/文档/ChatGPT/HSD_alliance_backend/src/registrations/dto/registration.dto.ts`
- Modify: `E:/文档/ChatGPT/HSD_alliance_backend/src/registrations/dto/registration-response.dto.ts`
- Modify: `E:/文档/ChatGPT/HSD_alliance_backend/test/activities.e2e-spec.ts`
- Create: `E:/文档/ChatGPT/HSD_alliance_backend/test/registrations-template.e2e-spec.ts`

- [ ] Add failing tests for first-open template binding, dynamic submission, cancellation/reactivation, answer replay, and version stability across close/reopen.
- [ ] Add template draft/publish and public form reads under the existing registrations domain.
- [ ] Bind the current published template inside the existing registration-open transaction only when no activity template is bound.
- [ ] Extend create/mine/list/admin detail and decision responses without removing legacy fields.
- [ ] Reactivate the existing unique registration row on re-registration, clearing old decision fields and preserving audit/version semantics.
- [ ] Enforce live admin scope for list/detail/export and member identity snapshots server-side.

### Task 3: Admin list, detail, and export API

**Files:**
- Create: `E:/文档/ChatGPT/HSD_alliance_backend/src/registrations/dto/list-admin-activity-registrations.dto.ts`
- Modify: `E:/文档/ChatGPT/HSD_alliance_backend/src/registrations/registrations-admin.controller.ts`
- Modify: `E:/文档/ChatGPT/HSD_alliance_backend/src/registrations/registrations.service.ts`
- Modify: `E:/文档/ChatGPT/HSD_alliance_backend/test/registrations-template.e2e-spec.ts`

- [ ] Add failing tests for server-side keyword/activity/status/sort/page filtering, empty exports, cross-center rejection, and CSV escaping/formula protection.
- [ ] Implement paginated aggregate admin list while preserving the existing per-activity list route.
- [ ] Implement detail response using the registration's immutable template revision.
- [ ] Implement UTF-8 BOM CSV export for all matching records, with stable field-ID column merging and safe filenames.
- [ ] Record export audit metadata without storing answer values in the audit event.

### Task 4: API client and shared frontend types

**Files:**
- Modify: `E:/文档/ChatGPT/HSD/packages/api-client/openapi.snapshot.json`
- Modify: `E:/文档/ChatGPT/HSD/packages/api-client/src/generated.ts`
- Create/Modify: `E:/文档/ChatGPT/HSD/app/types/activity-registration.ts`
- Modify: `E:/文档/ChatGPT/HSD/app/services/content/api-content.gateway.ts`
- Test: `E:/文档/ChatGPT/HSD/tests/unit/activity-registration-api.test.ts`

- [ ] Add failing client contract tests for template, form, list, detail, re-registration, and export paths.
- [ ] Regenerate or update the OpenAPI snapshot and generated client methods.
- [ ] Add typed frontend field/template/answer/list/detail models and error mappings.
- [ ] Keep the existing `registrations.create`, `mine`, `cancel`, `listAdmin`, and `decide` methods source-compatible.

### Task 5: Member and admin frontend closed loop

**Files:**
- Modify: `E:/文档/ChatGPT/HSD/app/pages/activities/[slug].vue`
- Modify: `E:/文档/ChatGPT/HSD/app/stores/activities.ts`
- Create: `E:/文档/ChatGPT/HSD/app/components/activity/ActivityRegistrationForm.vue`
- Create: `E:/文档/ChatGPT/HSD/app/pages/admin/activities/registration-template.vue`
- Modify: `E:/文档/ChatGPT/HSD/app/pages/admin/activities/registrations.vue`
- Create: `E:/文档/ChatGPT/HSD/app/components/admin/ActivityRegistrationDetailDrawer.vue`
- Test: `E:/文档/ChatGPT/HSD/tests/unit/activity-registration-ui.test.ts`
- Test: `E:/文档/ChatGPT/HSD/tests/e2e/activity-registration-closed-loop.spec.ts`

- [ ] Add failing tests for identity read-only fields, dynamic field rendering, validation, submit/cancel/re-register, template editing, detail answers, filtering, and export states.
- [ ] Extend the existing Activities store and gateway rather than creating a parallel registration store.
- [ ] Render the locked activity template in the existing activity detail registration interaction.
- [ ] Enable the configuration button and implement draft/edit/publish/history UI for the shared template.
- [ ] Enable the export button and implement server-side filtered export with loading, empty, error, and permission states.
- [ ] Add an accessible registration detail drawer and preserve existing decision actions.

### Task 6: Verification and release readiness

**Files:**
- Modify: `E:/文档/ChatGPT/HSD/docs/testing/qa-data-coverage.md`
- Modify: `E:/文档/ChatGPT/HSD/HSD需求文档.md`

- [ ] Run backend pure tests, contract tests, migration checks, and activity/registration E2E tests where dependencies and disposable PostgreSQL are available.
- [ ] Run frontend unit tests, typecheck, API contract checks, and the new Playwright closed-loop test.
- [ ] Run `git diff --check` in both repositories and inspect only intentional changes.
- [ ] Report any environment blockers precisely; do not deploy, migrate production, commit, or push without explicit authorization.
