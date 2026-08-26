import { createMemberActivitiesGateway, type MemberActivitiesGateway } from "~/services/member-activities/member-activities-gateway";

export function useMemberActivitiesGateway(): MemberActivitiesGateway | undefined {
  const config = useRuntimeConfig() as { public: { apiBase: string; useMockApi: boolean } };
  return config.public.useMockApi ? undefined : createMemberActivitiesGateway({ apiBase: config.public.apiBase });
}
