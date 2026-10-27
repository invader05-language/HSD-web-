# Member result context contract

`GET /api/v1/recruitment/results/me/context` is the private, session-scoped read used by `/member/results`.

The response is one coherent snapshot:

```ts
{
  batch: { id: string; name: string; effectiveStatus?: string | null } | null;
  application: {
    id: string;
    batchId: string;
    status?: string;
    acceptsAdjustment?: boolean;
    baizeDirection?: string | null;
    preferences?: Array<{ rank: "FIRST" | "SECOND" | "THIRD"; center: { id: string; slug: string; name: string } }>;
  } | null;
  stages: MemberStageResultsDto | MemberStageResultsDto["stages"] | null;
  adjustment: {
    decision: "ADMITTED" | "NOT_ADMITTED";
    targetCenter?: { id: string; slug: string; name: string } | null;
    groupCode?: GroupCodeReferenceDto | null;
    publishedAt?: string | null;
  } | null;
  assessmentTransfer: PublishedAssessmentTransferDto | null;
  currentRouting: {
    center?: { id: string; slug: string; name: string } | null;
    round?: number | null;
    groupCode?: GroupCodeReferenceDto | null;
    status?: string | null;
  } | null;
  finalResult: MyRecruitmentResultDto | {
    decision: "ADMITTED" | "NOT_ADMITTED";
    finalCenter?: AssessmentCenterDto | null;
    admissionSource?: "FIRST_CHOICE" | "ADJUSTMENT" | null;
    finalBaizeDirection?: string | null;
    publishedAt: string;
  } | null;
}
```

`application` remains present after a batch is closed. `currentRouting` and an ordinary `adjustment` target describe the current center and QR before `finalResult` is published. A Baize `assessmentTransfer` keeps its existing entry and next-round QR semantics. The web client accepts both the full published result projection and the compact final result form while the generated API snapshot is being updated.
