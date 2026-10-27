import { describe, expect, it, vi } from 'vitest';
import { createApiRecruitmentGateway } from '../../app/services/recruitment/api-recruitment.gateway';

describe('round publication API', () => {
  it('uses the existing global advance action with CSRF and the disclosure preview fingerprint', async () => {
    const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({currentRound:2,status:'ASSESSING',version:4,publishedAt:null}),{status:201}));
    const gateway=createApiRecruitmentGateway({apiBase:'http://backend.test',fetcher,readCookie:()=> 'test-csrf',createRequestId:()=> 'test-request'});
    await gateway.advanceAssessment('batch',{expectedVersion:3,previewFingerprint:'sha256:'+'a'.repeat(64),confirmed:true});
    const [url,options]=fetcher.mock.calls[0]!;
    expect(url).toBe('http://backend.test/api/v1/admin/recruitment/batches/batch/assessments/advance');
    expect(options.headers['X-CSRF-Token']).toBe('test-csrf');
    expect(JSON.parse(options.body)).not.toHaveProperty('centerId');
    expect(JSON.parse(options.body).previewFingerprint).toMatch(/^sha256:/);
  });
  it('reads published stages independently of the currently open batch', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ batchId:null,batchName:null,center:null,stages:[],finalGroupCode:null }),{status:200}));
    const gateway = createApiRecruitmentGateway({apiBase:'http://backend.test',fetcher});
    const extended = gateway as typeof gateway & { getMyStageResults?: ()=>Promise<unknown> };
    expect(typeof extended.getMyStageResults).toBe('function');
    await extended.getMyStageResults!();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]![0]).toContain('/recruitment/results/me/stages');
  });
});
