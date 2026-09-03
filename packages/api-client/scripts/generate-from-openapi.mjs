import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const packageRoot = resolve(import.meta.dirname, "..");
const snapshotPath = resolve(packageRoot, "openapi.snapshot.json");
const outputPath = resolve(packageRoot, "src/generated.ts");
const browserOperations = {
  authLogin: "POST /api/v1/auth/login",
  authSession: "GET /api/v1/auth/session",
  authChangePassword: "POST /api/v1/auth/change-password",
  memberProfile: "GET /api/v1/members/me",
  memberProfileUpdate: { operation: "PATCH /api/v1/members/me", successStatus: "200" },
  memberHonorCreate: "POST /api/v1/members/me/honors",
  memberHonors: "GET /api/v1/members/me/honors",
  memberHonorConsent: { operation: "PATCH /api/v1/members/me/honors/{id}/consent", successStatus: "200" },
  memberGrowthRecords: "GET /api/v1/members/me/growth-records",
  memberGrowthRecord: "GET /api/v1/members/me/growth-records/{id}",
  memberGrowthRecordCreate: "POST /api/v1/members/me/growth-records",
  memberGrowthRecordUpdate: { operation: "PATCH /api/v1/members/me/growth-records/{id}", successStatus: "200" },
  memberGrowthRecordDelete: { operation: "DELETE /api/v1/members/me/growth-records/{id}", successStatus: "200" },
  adminHonors: "GET /api/v1/admin/honors",
  adminHonorApprove: { operation: "POST /api/v1/admin/honors/{id}/approve", successStatus: "200" },
  publicMembers: "GET /api/v1/public/members",
  publicMember: "GET /api/v1/public/members/{publicId}",
  adminMemberCreate: "POST /api/v1/admin/members",
  adminMembers: "GET /api/v1/admin/members",
  adminMemberPromote: { operation: "POST /api/v1/admin/members/{personId}/promote", successStatus: "200" },
  adminAccounts: "GET /api/v1/admin/accounts",
  adminAuditEvents: "GET /api/v1/admin/audit-events",
  publicCenters: "GET /api/v1/public/centers",
  publicCenterDetail: "GET /api/v1/public/centers/{publicSlug}",
  publicHomepageStats: "GET /api/v1/public/homepage/stats",
  organizationCenters: "GET /api/v1/admin/organization/centers",
  organizationMembershipCreate: "POST /api/v1/admin/organization/memberships",
  organizationMembershipUpdate: "PATCH /api/v1/admin/organization/memberships/{personId}",
  organizationMembershipRetire: { operation: "POST /api/v1/admin/organization/memberships/{personId}/retire", successStatus: "200" },
  organizationPositionAppointAllianceOwner: "POST /api/v1/admin/organization/positions/alliance-owners/{personId}",
  organizationPositionRevokeAllianceOwner: { operation: "POST /api/v1/admin/organization/positions/alliance-owners/{personId}/revoke", successStatus: "200" },
  organizationPositionAppointCenterMinister: "POST /api/v1/admin/organization/positions/centers/{centerId}/ministers/{personId}",
  organizationPositionRevokeCenterMinister: { operation: "POST /api/v1/admin/organization/positions/centers/{centerId}/ministers/{personId}/revoke", successStatus: "200" },
  organizationPositionHandoverCenterMinister: { operation: "POST /api/v1/admin/organization/positions/centers/{centerId}/ministers/{outgoingPersonId}/handover/{incomingPersonId}", successStatus: "200" },
  organizationPositionSetCoreMembership: { operation: "POST /api/v1/admin/organization/positions/core-members/{personId}", successStatus: "200" },
  organizationPositionGrantProjectLead: "POST /api/v1/admin/organization/positions/projects/{projectId}/leads/{personId}",
  organizationPositionRevokeProjectLead: { operation: "POST /api/v1/admin/organization/positions/projects/{projectId}/leads/{personId}/revoke", successStatus: "200" },
  preparatoryImportDryRun: { operation: "POST /api/v1/admin/imports/preparatory-members/dry-run", successStatus: "200" },
  preparatoryImportCommit: "POST /api/v1/admin/imports/preparatory-members/commit",
  adminPortalDraft: "GET /api/v1/admin/portal/configuration/draft",
  adminPortalSaveDraft: "PUT /api/v1/admin/portal/configuration/draft",
  adminPortalPreview: "GET /api/v1/admin/portal/configuration/preview",
  adminPortalPublish: "POST /api/v1/admin/portal/configuration/publish",
  publicPortal: "GET /api/v1/public/portal",
  adminContentList: "GET /api/v1/admin/content",
  adminContentDetail: "GET /api/v1/admin/content/{contentId}",
  adminContentCreate: "POST /api/v1/admin/content",
  adminContentUpdate: { operation: "PATCH /api/v1/admin/content/{contentId}", successStatus: "200" },
  adminContentPreview: "GET /api/v1/admin/content/{contentId}/preview",
  adminContentSubmitReview: { operation: "POST /api/v1/admin/content/{contentId}/submit-review", successStatus: "200" },
  adminContentReturnDraft: { operation: "POST /api/v1/admin/content/{contentId}/return-draft", successStatus: "200" },
  adminContentApprovePublication: { operation: "POST /api/v1/admin/content/{contentId}/approve-publication", successStatus: "200" },
  adminContentPublish: "POST /api/v1/admin/content/{contentId}/publish",
  adminContentPublishDirect: "POST /api/v1/admin/content/{contentId}/publish-direct",
  adminContentOffline: { operation: "POST /api/v1/admin/content/{contentId}/offline", successStatus: "200" },
  adminUploads: "GET /api/v1/admin/uploads",
  adminUploadIntent: "POST /api/v1/admin/uploads/intents",
  adminUploadComplete: { operation: "POST /api/v1/admin/uploads/{uploadId}/complete", successStatus: "200" },
  adminUploadStatus: "GET /api/v1/admin/uploads/{uploadId}",
  adminMediaAttachmentCreate: "POST /api/v1/admin/media/attachments",
  adminMediaAttachmentUpdate: { operation: "PATCH /api/v1/admin/media/attachments/{id}", successStatus: "200" },
  recruitmentCurrent: "GET /api/v1/recruitment/current",
  recruitmentUpcoming: "GET /api/v1/recruitment/upcoming",
  recruitmentMyApplication: "GET /api/v1/recruitment/batches/{batchId}/my-application",
  recruitmentApplicationCreate: "POST /api/v1/recruitment/batches/{batchId}/applications",
  recruitmentApplicationUpdate: { operation: "PATCH /api/v1/recruitment/batches/{batchId}/applications/{applicationId}", successStatus: "200" },
  recruitmentApplicationWithdraw: { operation: "POST /api/v1/recruitment/batches/{batchId}/applications/{applicationId}/withdraw", successStatus: "200" },
  adminRecruitmentBatches: "GET /api/v1/admin/recruitment/batches",
  adminRecruitmentBatchCreate: "POST /api/v1/admin/recruitment/batches",
  adminRecruitmentBatch: "GET /api/v1/admin/recruitment/batches/{batchId}",
  adminRecruitmentBatchUpdate: { operation: "PATCH /api/v1/admin/recruitment/batches/{batchId}", successStatus: "200" },
  adminRecruitmentBatchLifecycleEvents: "GET /api/v1/admin/recruitment/batches/{batchId}/lifecycle-events",
  adminRecruitmentApplications: "GET /api/v1/admin/recruitment/batches/{batchId}/applications",
  adminRecruitmentApplication: "GET /api/v1/admin/recruitment/batches/{batchId}/applications/{applicationId}",
  adminRecruitmentBatchPublish: { operation: "POST /api/v1/admin/recruitment/batches/{batchId}/publish", successStatus: "200" },
  adminRecruitmentBatchOpenNow: { operation: "POST /api/v1/admin/recruitment/batches/{batchId}/open-now", successStatus: "200" },
  adminRecruitmentBatchPause: { operation: "POST /api/v1/admin/recruitment/batches/{batchId}/pause", successStatus: "200" },
  adminRecruitmentBatchResume: { operation: "POST /api/v1/admin/recruitment/batches/{batchId}/resume", successStatus: "200" },
  adminRecruitmentBatchClose: { operation: "POST /api/v1/admin/recruitment/batches/{batchId}/close", successStatus: "200" },
  adminRecruitmentBatchReopen: { operation: "POST /api/v1/admin/recruitment/batches/{batchId}/reopen", successStatus: "200" },
  adminRecruitmentBatchArchive: { operation: "POST /api/v1/admin/recruitment/batches/{batchId}/archive", successStatus: "200" },
  assessmentBatch: "GET /api/v1/admin/recruitment/batches/{batchId}/assessments",
  assessmentAdjustmentTargets: "GET /api/v1/admin/recruitment/batches/{batchId}/assessments/adjustment-targets",
  assessmentRoundResult: "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/round-results",
  assessmentAdjustmentProposal: "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/adjustment-proposals",
  assessmentAdjustmentDecision: "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/adjustment-decisions",
  assessmentAdvance: "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/advance",
  assessmentPublish: "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/publish",
  recruitmentResults: "GET /api/v1/recruitment/results/me",
  recruitmentResponsibleContact: "GET /api/v1/recruitment/results/me/{resultId}/responsible-contacts/{contactPersonId}",
  adminProjects: "GET /api/v1/admin/projects",
  adminProject: "GET /api/v1/admin/projects/{id}",
  adminProjectCreate: "POST /api/v1/admin/projects",
  adminProjectUpdate: "PATCH /api/v1/admin/projects/{id}",
  adminProjectPublish: "POST /api/v1/admin/projects/{id}/publish",
  adminProjectOffline: { operation: "POST /api/v1/admin/projects/{id}/offline", successStatus: "200" },
  publicProjects: "GET /api/v1/public/projects",
  publicProject: "GET /api/v1/public/projects/{slug}",
  adminActivities: "GET /api/v1/admin/activities",
  adminActivity: "GET /api/v1/admin/activities/{id}",
  adminActivityCreate: "POST /api/v1/admin/activities",
  adminActivityUpdate: "PATCH /api/v1/admin/activities/{id}",
  adminActivityPublish: "POST /api/v1/admin/activities/{id}/publish",
  adminActivityRegistrationOpen: { operation: "POST /api/v1/admin/activities/{id}/registration/open", successStatus: "200" },
  adminActivityRegistrationClose: { operation: "POST /api/v1/admin/activities/{id}/registration/close", successStatus: "200" },
  adminActivityOffline: { operation: "POST /api/v1/admin/activities/{id}/offline", successStatus: "200" },
  publicActivities: "GET /api/v1/public/activities",
  publicActivity: "GET /api/v1/public/activities/{slug}",
  publicTimeline: "GET /api/v1/public/timeline",
  activityRegistrationCreate: "POST /api/v1/activities/{slug}/registrations",
  activityRegistrationForm: "GET /api/v1/activities/{slug}/registration-form",
  activityRegistrationMine: "GET /api/v1/activities/{slug}/registration",
  activityRegistrationCancel: { operation: "POST /api/v1/registrations/{id}/cancel", successStatus: "200" },
  adminRegistrationTemplate: "GET /api/v1/admin/registration-template",
  adminRegistrationTemplateDraft: { operation: "POST /api/v1/admin/registration-template/draft", successStatus: "200" },
  adminRegistrationTemplatePublish: { operation: "POST /api/v1/admin/registration-template/publish", successStatus: "200" },
  adminActivityRegistrationForm: "GET /api/v1/admin/activities/{activityId}/registration-form",
  adminActivityRegistrations: "GET /api/v1/admin/activities/{activityId}/registrations",
  adminRegistrations: "GET /api/v1/admin/registrations",
  adminRegistrationDetail: "GET /api/v1/admin/registrations/{id}",
  adminActivityRegistrationDecision: { operation: "POST /api/v1/admin/registrations/{id}/decision", successStatus: "200" },
  adminGalleries: "GET /api/v1/admin/galleries",
  adminGallery: "GET /api/v1/admin/galleries/{id}",
  adminGalleryCreate: "POST /api/v1/admin/galleries",
  adminGalleryUpdate: "PATCH /api/v1/admin/galleries/{id}",
  adminGalleryPublish: "POST /api/v1/admin/galleries/{id}/publish",
  adminGalleryOffline: { operation: "POST /api/v1/admin/galleries/{id}/offline", successStatus: "200" },
  publicGalleries: "GET /api/v1/public/galleries",
  publicGallery: "GET /api/v1/public/galleries/{slug}",
  adminResources: "GET /api/v1/admin/resources",
  adminResource: "GET /api/v1/admin/resources/{id}",
  adminResourceCreate: "POST /api/v1/admin/resources",
  adminResourceVersionCreate: "POST /api/v1/admin/resources/{id}/versions",
  adminResourceVersions: "GET /api/v1/admin/resources/{id}/versions",
  adminResourcePublish: "POST /api/v1/admin/resources/{id}/publish",
  adminResourceOffline: { operation: "POST /api/v1/admin/resources/{id}/offline", successStatus: "200" },
  publicResources: "GET /api/v1/public/resources",
  publicResource: "GET /api/v1/public/resources/{slug}",
  publicResourceVersion: "GET /api/v1/public/resources/{slug}/versions/{versionLabel}",
  adminHelp: "GET /api/v1/admin/help",
  adminHelpCreate: "POST /api/v1/admin/help",
  adminHelpUpdate: { operation: "PATCH /api/v1/admin/help/{id}/draft", successStatus: "200" },
  adminHelpPublish: "POST /api/v1/admin/help/{id}/publish",
  publicHelp: "GET /api/v1/public/help",
  publicHelpDetail: "GET /api/v1/public/help/{slug}",
};

const queryTypes = {
  ListActivityRegistrationsDto: "GET /api/v1/admin/activities/{activityId}/registrations",
};

const document = JSON.parse(await readFile(snapshotPath, "utf8"));
const paths = document.paths ?? {};
const invalidPaths = Object.keys(paths).filter((path) => !path.startsWith("/api/v1/"));
if (invalidPaths.length) throw new Error(`OpenAPI contains unversioned production paths: ${invalidPaths.join(", ")}`);

const schemas = document.components?.schemas ?? {};

function referenceName(reference) {
  return reference.$ref.split("/").at(-1);
}

function tsType(schema) {
  if (!schema) return "unknown";

  let type;
  if (schema.$ref) type = referenceName(schema);
  else {
    const alternatives = schema.oneOf ?? schema.anyOf;
    if (alternatives) type = alternatives.map(tsType).join(" | ");
    else if (schema.allOf) type = schema.allOf.map(tsType).join(" & ");
    else if (schema.enum) type = schema.enum.map((value) => JSON.stringify(value)).join(" | ");
    else if (schema.type === "array") type = `Array<${tsType(schema.items)}>`;
    else if (schema.type === "object" || schema.properties) {
      const required = new Set(schema.required ?? []);
      const properties = Object.entries(schema.properties ?? {})
        .map(([name, property]) => `  ${JSON.stringify(name)}${required.has(name) ? "" : "?"}: ${tsType(property)};`)
        .join("\n");
      if (properties) type = `{\n${properties}\n}`;
      else if (schema.additionalProperties && typeof schema.additionalProperties === "object") type = `Record<string, ${tsType(schema.additionalProperties)}>`;
      else type = "Record<string, unknown>";
    } else if (schema.type === "integer" || schema.type === "number") type = "number";
    else if (schema.type === "boolean") type = "boolean";
    else if (schema.type === "string") type = "string";
    else if (schema.type === "null") type = "null";
    else type = "unknown";
  }

  return schema.nullable && type !== "null" ? `(${type}) | null` : type;
}

const declarations = Object.entries(schemas)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([name, schema]) => `export type ${name} = ${tsType(schema)};`)
  .join("\n\n");

const queryDeclarations = Object.entries(queryTypes)
  .map(([name, operation]) => {
    const [method, path] = operation.split(" ");
    const parameters = paths[path]?.[method.toLowerCase()]?.parameters ?? [];
    const queryParameters = parameters.filter((parameter) => parameter.in === "query");
    if (!queryParameters.length) throw new Error(`Missing query parameters for ${operation}`);
    const properties = queryParameters
      .map((parameter) => `  ${JSON.stringify(parameter.name)}${parameter.required ? "" : "?"}: ${tsType(parameter.schema)};`)
      .join("\n");
    return `export type ${name} = {\n${properties}\n};`;
  })
  .join("\n\n");

const operations = Object.entries(browserOperations).map(([name, configuredOperation]) => {
  const operation = typeof configuredOperation === "string" ? configuredOperation : configuredOperation.operation;
  const [method, path] = operation.split(" ");
  const successStatus = typeof configuredOperation === "string"
    ? (method === "POST" ? "201" : "200")
    : configuredOperation.successStatus;
  const response = paths[path]?.[method.toLowerCase()]?.responses?.[successStatus];
  const schema = response?.content?.["application/json"]?.schema;
  if (!schema) throw new Error(`Missing JSON success response schema for ${operation}`);
  return { name, operation, method, path, responseType: tsType(schema), schema };
});

const responseMap = operations.map(({ operation, responseType }) => `  ${JSON.stringify(operation)}: ${responseType};`).join("\n");
const pathMap = operations.map(({ name, path }) => `  ${name}: ${JSON.stringify(path)},`).join("\n");
const operationMap = operations.map(({ operation, method, path }) => `  ${JSON.stringify(operation)}: { method: ${JSON.stringify(method)}, path: ${JSON.stringify(path)} },`).join("\n");
const responseSchemas = Object.fromEntries(operations.map(({ operation, schema }) => [operation, schema]));

const output = `/**\n * AUTO-GENERATED from packages/api-client/openapi.snapshot.json.\n * Refresh with: pnpm --filter @hsd/api export:browser-openapi && pnpm --filter @hsd/api-client generate\n * Do not edit manually.\n */\n\n${declarations}\n\nexport const API_V1_PATHS = {\n${pathMap}\n} as const;\n\nexport const API_OPERATIONS = {\n${operationMap}\n} as const;\n\nexport type ApiOperation = keyof typeof API_OPERATIONS;\nexport type ApiV1Path = (typeof API_V1_PATHS)[keyof typeof API_V1_PATHS];\n\nexport interface ApiResponseByOperation {\n${responseMap}\n}\n\nexport type ApiResponseFor<TOperation extends ApiOperation> = ApiResponseByOperation[TOperation];\n\nconst API_RESPONSE_SCHEMAS = ${JSON.stringify(responseSchemas, null, 2)} as const;\n\ntype JsonSchema = {\n  $ref?: string; type?: string; nullable?: boolean; enum?: unknown[]; properties?: Record<string, JsonSchema>; required?: string[]; items?: JsonSchema; oneOf?: JsonSchema[]; anyOf?: JsonSchema[]; allOf?: JsonSchema[]; additionalProperties?: boolean | JsonSchema;\n};\n\nconst API_COMPONENT_SCHEMAS = ${JSON.stringify(schemas, null, 2)} as const;\n\nfunction resolveSchema(schema: JsonSchema): JsonSchema {\n  if (!schema.$ref) return schema;\n  const name = schema.$ref.split("/").at(-1);\n  const referenced = (API_COMPONENT_SCHEMAS as Record<string, JsonSchema>)[name];\n  if (!referenced) return schema;\n  const { $ref: _reference, ...overrides } = schema;\n  return { ...referenced, ...overrides };\n}\n\nfunction conforms(schema: JsonSchema, value: unknown, strictObject = true): boolean {\n  const resolved = resolveSchema(schema);\n  if (value === null) return resolved.nullable === true || resolved.type === "null" || (resolved.oneOf ?? resolved.anyOf ?? []).some((item) => conforms(item, value, strictObject));\n  if (resolved.oneOf || resolved.anyOf) return (resolved.oneOf ?? resolved.anyOf ?? []).some((item) => conforms(item, value, strictObject));\n  if (resolved.allOf && !resolved.allOf.every((item) => conforms(item, value, false))) return false;\n  if (resolved.enum && !resolved.enum.includes(value)) return false;\n  if (resolved.type === "array") return Array.isArray(value) && value.every((item) => conforms(resolved.items ?? {}, item, strictObject));\n  if (resolved.type === "object" || resolved.properties) {\n    if (!value || typeof value !== "object" || Array.isArray(value)) return false;\n    const record = value as Record<string, unknown>;\n    const properties = resolved.properties ?? {};\n    if (!(resolved.required ?? []).every((key) => key in record)) return false;\n    if (!Object.entries(properties).every(([key, property]) => !(key in record) || conforms(property, record[key], strictObject))) return false;\n    if (!strictObject || Object.keys(properties).length === 0) return true;\n    return Object.keys(record).every((key) => {\n      if (key in properties) return true;\n      if (resolved.additionalProperties === true) return true;\n      if (resolved.additionalProperties && typeof resolved.additionalProperties === "object") return conforms(resolved.additionalProperties, record[key], strictObject);\n      return false;\n    });\n  }\n  if (resolved.type === "integer") return typeof value === "number" && Number.isInteger(value);\n  if (resolved.type === "number") return typeof value === "number";\n  if (resolved.type === "boolean") return typeof value === "boolean";\n  if (resolved.type === "string") return typeof value === "string";\n  return true;\n}\n\nexport function isApiResponse<TOperation extends ApiOperation>(operation: TOperation, value: unknown): value is ApiResponseFor<TOperation> {\n  return conforms(API_RESPONSE_SCHEMAS[operation], value);\n}\n`;

const outputWithQueries = output.replace(`${declarations}\n\n`, `${declarations}\n\n${queryDeclarations}\n\n`);
await writeFile(outputPath, `// @ts-nocheck\n${outputWithQueries}`, "utf8");
console.info(`Generated ${operations.length} browser operation declarations from ${snapshotPath}`);
