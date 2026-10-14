import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiRecruitmentGateway } from '../../app/services/recruitment/api-recruitment.gateway';

const metadata = { id:'upload-1',centerId:'center',createdBy:{id:'actor',username:'admin',displayName:'管理员'},fileName:'qr.png',mimeType:'image/png',byteSize:3,kind:'image',status:'uploading',version:1,expiresAt:'2026-10-14T12:00:00Z',failureCode:null,completedAt:null,createdAt:'2026-10-14T00:00:00Z',updatedAt:'2026-10-14T00:00:00Z' };
const code = {id:'code',round:1,version:1,status:'READY',imageUrl:'/api/v1/admin/group-code/image?version=1',uploadId:'upload-1',updatedAt:'2026-10-14T00:00:00Z'};
const configuration = (uploadId='upload-1') => ({batchId:'batch',centers:[{id:'center',name:'人才发展中心',slug:'talent',rounds:[{...code,uploadId}]}]});
function harness(overrides:{url?:string;processing?:boolean;lostBind?:boolean;otherUpload?:boolean;scanFailure?:boolean;lostConfig?:boolean;neverReady?:boolean;nativeReceiver?:boolean}={}) {
  let polls=0,configReads=0;
  const fetcher=vi.fn(async function(this:unknown,url:Parameters<typeof fetch>[0],init?:RequestInit) {
    if(overrides.nativeReceiver&&this!==undefined&&this!==globalThis)throw new TypeError('Illegal invocation');
    const path=new URL(String(url)).pathname;
    if(path.includes('/storage/'))return new Response('',{status:200,headers:{etag:'test-etag'}});
    if(path.endsWith('/group-code/uploads'))return Response.json({...metadata,upload:{url:overrides.url??'https://example.test/storage/bucket/key?signature=secret',headers:{'content-type':'image/png'}}});
    if(path.endsWith('/complete'))return Response.json({...metadata,status:overrides.processing?'processing':'ready',version:2});
    if(path.endsWith('/admin/uploads/upload-1'))return Response.json({...metadata,status:overrides.scanFailure?'failed':overrides.neverReady||overrides.processing&&polls++===0?'processing':'ready',version:2,failureCode:overrides.scanFailure?'UPLOAD_CHECKSUM_MISMATCH':null});
    if(path.endsWith('/assessment-group-codes')){
      if(overrides.lostConfig&&configReads++===0)throw new TypeError('Network lost');
      if(overrides.neverReady)return Response.json({batchId:'batch',centers:[{id:'center',name:'人才发展中心',slug:'talent',rounds:[{id:null,round:1,version:0,status:'MISSING',imageUrl:null,uploadId:null,updatedAt:null}]}]});
      return Response.json(configuration(overrides.otherUpload?'someone-else':'upload-1'));
    }
    if(init?.method==='PUT'){if(overrides.lostBind)throw new TypeError('Failed to fetch');const {uploadId,updatedAt,...reference}=code;return Response.json(reference);}
    throw Error('Unexpected '+path);
  }) as typeof fetch;
  const gateway=createApiRecruitmentGateway({apiBase:'https://example.test',fetcher,readCookie:()=> 'csrf'});
  return {gateway,fetcher};
}
afterEach(()=>vi.useRealTimers());
describe('group code upload recovery',()=>{
  it('refuses an HTTP signed destination before sending the file',async()=>{
    const {gateway,fetcher}=harness({url:'http://example.test/storage/key'});
    await expect(gateway.uploadAssessmentGroupCode('batch','center',1,0,new File(['png'],'qr.png',{type:'image/png'}))).rejects.toMatchObject({code:'GROUP_CODE_UPLOAD_HTTPS_REQUIRED'});
    expect(vi.mocked(fetcher).mock.calls.some(([url])=>String(url).startsWith('http://'))).toBe(false);
  });
  it('waits for processing and confirms the exact upload before announcing success',async()=>{
    const {gateway,fetcher}=harness({processing:true});const states:string[]=[];
    const operation=gateway.uploadAssessmentGroupCode('batch','center',1,0,new File(['png'],'qr.png',{type:'image/png'}),{onProgress:event=>states.push(event.phase)});
    const assertion=expect(operation).resolves.toMatchObject({uploadId:'upload-1'});
    await assertion;
    expect(states).toEqual(expect.arrayContaining(['uploading','checking','saving','confirming','saved']));
    expect(vi.mocked(fetcher).mock.calls.filter(([url])=>String(url).endsWith('/group-code/uploads'))).toHaveLength(1);
  });
  it('recovers a lost bind response by reading the exact saved upload',async()=>{
    const {gateway}=harness({lostBind:true});
    await expect(gateway.uploadAssessmentGroupCode('batch','center',1,0,new File(['png'],'qr.png',{type:'image/png'}))).resolves.toMatchObject({uploadId:'upload-1'});
  });
  it('does not mistake another administrator QR for this upload',async()=>{
    const {gateway}=harness({lostBind:true,otherUpload:true});
    await expect(gateway.uploadAssessmentGroupCode('batch','center',1,0,new File(['png'],'qr.png',{type:'image/png'}))).rejects.toMatchObject({code:'GROUP_CODE_VERSION_CONFLICT'});
  });
  it('preserves the scanner failure code instead of calling it a network failure',async()=>{
    const {gateway}=harness({processing:true,scanFailure:true});
    await expect(gateway.uploadAssessmentGroupCode('batch','center',1,0,new File(['png'],'qr.png',{type:'image/png'}))).rejects.toMatchObject({code:'UPLOAD_CHECKSUM_MISMATCH'});
  });
  it('checks a saved task after a lost configuration read without uploading or binding again',async()=>{
    const {gateway,fetcher}=harness({lostConfig:true});let task;
    try {await gateway.uploadAssessmentGroupCode('batch','center',1,0,new File(['png'],'qr.png',{type:'image/png'}));}catch(cause){task=(cause as {task:import('../../app/services/recruitment/group-code-upload').GroupCodeUploadTask}).task;}
    expect(task?.uploadId).toBe('upload-1');
    await expect(gateway.resumeAssessmentGroupCode(task!)).resolves.toMatchObject({uploadId:'upload-1'});
    expect(vi.mocked(fetcher).mock.calls.filter(([,init])=>init?.method==='PUT')).toHaveLength(2); // one file PUT, one bind
  });
  it('ends a long processing wait as pending and keeps the original task',async()=>{
    vi.useFakeTimers();const {gateway}=harness({neverReady:true});
    const task={batchId:'batch',centerId:'center',round:1,expectedVersion:0,uploadId:'upload-1',uploadVersion:1,etag:'test'};
    const assertion=expect(gateway.resumeAssessmentGroupCode(task)).rejects.toMatchObject({code:'GROUP_CODE_SAVE_PENDING',task});
    await vi.advanceTimersByTimeAsync(61000);await assertion;
  });
  it('does not start an upload after component cancellation',async()=>{
    const {gateway,fetcher}=harness();const controller=new AbortController();controller.abort();
    await expect(gateway.uploadAssessmentGroupCode('batch','center',1,0,new File(['png'],'qr.png',{type:'image/png'}),{signal:controller.signal})).rejects.toBeDefined();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('calls the native browser fetch without a custom object receiver',async()=>{
    const {gateway}=harness({nativeReceiver:true});
    await expect(gateway.uploadAssessmentGroupCode('batch','center',1,0,new File(['png'],'qr.png',{type:'image/png'}))).resolves.toMatchObject({uploadId:'upload-1'});
  });
});
