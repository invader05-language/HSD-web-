import type {
  AdminAccountListResponseDto,
  AdminAccountResponseDto,
  AdminCenterListResponseDto,
  AdminProjectListResponseDto,
  AppointOrganizationPositionDto,
  CreateManagedMemberDto,
  CreateMembershipDto,
  ManagedMemberCreatedResponseDto,
  ManagedMemberListResponseDto,
  ManagedMemberResponseDto,
  OrganizationMembershipResponseDto,
  PreparatoryMemberImportDto,
  PreparatoryMemberImportReportResponseDto,
  PromoteManagedMemberDto,
  PublicCenterListResponseDto,
  PublicCenterDetailResponseDto,
  RetireMembershipDto,
  RetiredCoreMemberResponseDto,
  RetiredOrganizationMembershipResponseDto,
  HandoverCenterMinisterDto,
  RevokeOrganizationPositionDto,
  SetCoreMembershipDto,
  UpdateMembershipDto,
} from "../../../packages/api-client/src";

export interface OrganizationGateway {
  publicCenters(): Promise<PublicCenterListResponseDto>;
  publicCenter(publicSlug: string): Promise<PublicCenterDetailResponseDto>;
  listCenters(): Promise<AdminCenterListResponseDto>;
  listManagedMembers(): Promise<ManagedMemberListResponseDto>;
  createManagedMember(payload: CreateManagedMemberDto): Promise<ManagedMemberCreatedResponseDto>;
  promoteMemberToFormal(personId: string, payload: PromoteManagedMemberDto): Promise<ManagedMemberResponseDto>;
  createMembership(payload: CreateMembershipDto): Promise<OrganizationMembershipResponseDto>;
  updateMembership(personId: string, payload: UpdateMembershipDto): Promise<OrganizationMembershipResponseDto>;
  retireMembership(personId: string, payload: RetireMembershipDto): Promise<RetiredOrganizationMembershipResponseDto>;
  listAccounts(): Promise<AdminAccountListResponseDto>;
  dryRunImport(payload: PreparatoryMemberImportDto): Promise<PreparatoryMemberImportReportResponseDto>;
  commitImport(payload: PreparatoryMemberImportDto): Promise<PreparatoryMemberImportReportResponseDto>;
  appointAllianceOwner(personId: string, payload: AppointOrganizationPositionDto): Promise<unknown>;
  revokeAllianceOwner(personId: string, payload: RevokeOrganizationPositionDto): Promise<unknown>;
  appointCenterMinister(centerId: string, personId: string, payload: AppointOrganizationPositionDto): Promise<unknown>;
  revokeCenterMinister(centerId: string, personId: string, payload: RevokeOrganizationPositionDto): Promise<unknown>;
  handoverCenterMinister(centerId: string, outgoingPersonId: string, incomingPersonId: string, payload: HandoverCenterMinisterDto): Promise<unknown>;
  setCoreMembership(personId: string, payload: SetCoreMembershipDto): Promise<unknown>;
  grantProjectLead(projectId: string, personId: string, payload: AppointOrganizationPositionDto): Promise<unknown>;
  revokeProjectLead(projectId: string, personId: string, payload: RevokeOrganizationPositionDto): Promise<unknown>;
  listAdminProjects(): Promise<AdminProjectListResponseDto>;
}
