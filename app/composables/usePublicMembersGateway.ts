import { createApiPublicMembersGateway } from '~/services/members/api-public-members.gateway'
export function usePublicMembersGateway() { const config = useRuntimeConfig() as { public: { apiBase: string; useMockApi: boolean } }; return config.public.useMockApi ? undefined : createApiPublicMembersGateway({ apiBase: config.public.apiBase }) }
