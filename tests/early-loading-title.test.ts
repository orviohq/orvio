import { it, expect, vi, afterEach } from 'vitest';
import { BackgroundImports } from '../src/background-imports';
vi.mock('../src/early-youtube-metadata',()=>({earlyYoutubeMetadata:vi.fn(async()=>null)}));
vi.mock('../src/external-import',()=>({importYoutube:vi.fn(),youtubeId:(s:string)=>/^[A-Za-z0-9_-]{11}$/.test(s)?s:null}));
afterEach(()=>vi.unstubAllGlobals());
function harness(){
 vi.stubGlobal('requestAnimationFrame',(f:()=>void)=>setTimeout(f,0));
 const m=new Map<string,string>();const callbacks=new Map<string,any>();const complete=vi.fn(async()=>{});const changed=vi.fn();
 const pending=new BackgroundImports(changed,complete,{getItem:k=>m.get(k)??null,setItem:(k,v)=>{m.set(k,v)}},async(id,_signal,options)=>{callbacks.set(id,options);return new Promise<{title?:string}>(()=>{});});
 return{pending,callbacks,complete,changed,m};
}
it('actual pending row receives real title before unresolved audio/import completes and persists it',async()=>{const h=harness();h.pending.enqueue('AAAAAAAAAAA');await vi.waitFor(()=>expect(h.callbacks.has('AAAAAAAAAAA')).toBe(true));h.callbacks.get('AAAAAAAAAAA').onMetadata({title:'Actual title'});expect(h.pending.rows.get('AAAAAAAAAAA')?.title).toBe('Actual title');expect(h.pending.rows.get('AAAAAAAAAAA')?.state).toBe('loading');expect(h.complete).not.toHaveBeenCalled();expect(JSON.parse(h.m.get('orvio.pending-imports.v1')!)[0].title).toBe('Actual title');});
it('rapid adds retain metadata per row without changing other rows',async()=>{const h=harness();for(const id of ['AAAAAAAAAAA','BBBBBBBBBBB'])h.pending.enqueue(id);await vi.waitFor(()=>expect(h.callbacks.size).toBe(2));h.callbacks.get('BBBBBBBBBBB').onMetadata({title:'B title'});h.callbacks.get('AAAAAAAAAAA').onMetadata({title:'A title'});expect([...h.pending.rows.values()].map(x=>x.title)).toEqual(['A title','B title']);});
it('late removed/replaced/error rows cannot be updated by old metadata',async()=>{const h=harness();h.pending.enqueue('AAAAAAAAAAA');await vi.waitFor(()=>expect(h.callbacks.size).toBe(1));const cb=h.callbacks.get('AAAAAAAAAAA').onMetadata;const old=h.pending.rows.get('AAAAAAAAAAA')!;h.pending.rows.delete('AAAAAAAAAAA');cb({title:'late'});expect(old.title).toBeUndefined();h.pending.rows.set('AAAAAAAAAAA',{...old,state:'error'});cb({title:'stale'});expect(h.pending.rows.get('AAAAAAAAAAA')?.title).toBeUndefined();});
it('empty/control metadata does not create fake title or complete import',async()=>{const h=harness();h.pending.enqueue('AAAAAAAAAAA');await vi.waitFor(()=>expect(h.callbacks.size).toBe(1));for(const title of ['', ' ', 'bad\u0000title'])h.callbacks.get('AAAAAAAAAAA').onMetadata({title});expect(h.pending.rows.get('AAAAAAAAAAA')?.title).toBeUndefined();expect(h.complete).not.toHaveBeenCalled();});
