import {
  isApiResponse,
  type CurrentSessionResponseDto,
} from "../../../packages/api-client/src";

export type CurrentSessionFixtureInput = {
  accountId: string;
  personId: string;
  name: string;
  adminLevel: "MEMBER" | "ADMIN" | "OWNER";
  center?: { id: string; name: string };
  capabilities?: string[];
  personStatus?: "PREPARATORY" | "FORMAL_MEMBER" | "NOT_ADMITTED";
};

export function assertCurrentSessionFixture(value: unknown): asserts value is CurrentSessionResponseDto {
  if (!isApiResponse("GET /api/v1/auth/session", value)) {
    throw new Error("Invalid GET /api/v1/auth/session fixture");
  }
}

export function currentSessionFixture(input: CurrentSessionFixtureInput): CurrentSessionResponseDto {
  if (input.adminLevel === "ADMIN" && !input.center) {
    throw new Error("ADMIN session fixtures require a center");
  }

  const adminCenter = input.center
    ? { id: input.center.id, name: input.center.name, role: "CENTER_MINISTER" as const }
    : null;

  const response = {
    account: {
      id: input.accountId,
      adminLevel: input.adminLevel,
      adminCenterId: adminCenter?.id ?? null,
      adminCenter,
      capabilities: [...(input.capabilities ?? [])],
    },
    person: {
      id: input.personId,
      name: input.name,
      status: input.personStatus ?? "FORMAL_MEMBER",
    },
    mustChangePassword: false,
  } satisfies CurrentSessionResponseDto;

  assertCurrentSessionFixture(response);
  return response;
}
