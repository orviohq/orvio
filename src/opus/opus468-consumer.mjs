// PRIVATE, UNIMPORTED consumer contract preparation. No IO or runtime activation.
// A trusted build supplies policy and the two validators. Never use client data
// as policy, validator callbacks, a DO journal origin, or qualification evidence.
// Plans below are not durable persistence, shares, playback or authentication.
const H=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const plain=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
const exact=(o,keys)=>plain(o)&&Object.keys(o).length===keys.length&&keys.every(k=>own(o,k));
const copy=x=>structuredClone(x);
const freeze=o=>{if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o);}return o;};
const fail=s=>{throw Error(s);};
const ACTIONS=['persist','install','share','play'];
const POLICY_KEYS=['generatorVersion','producerSha256','recipeSha256','corpusSha256'];
const forbidden=g=>/test.?only|unqualified|^research-c3/i.test(g)||g.toLowerCase()==='orvio-current35-v1';
function policyRow(p){
 if(!exact(p,POLICY_KEYS)||typeof p.generatorVersion!=='string'||!p.generatorVersion||p.generatorVersion.length>128||forbidden(p.generatorVersion)||POLICY_KEYS.slice(1).some(k=>!H(p[k])))fail('consumer_policy');
 return freeze(copy(p));
}
function replayBinding(replay,song,charts){
 if(!exact(replay,['version','song','lanes','difficulty','options','ops','end'])&&!(plain(replay)&&Object.keys(replay).every(k=>['version','song','lanes','difficulty','options','ops','end','audioLeadIn','fever'].includes(k))))fail('consumer_replay_shape');
 if(replay.version!==1||replay.song!==song||![4,6,8].includes(replay.lanes)||!['low','mid','high','sc'].includes(replay.difficulty)||!Number.isFinite(replay.end)||replay.end<0||replay.end>600000||!Array.isArray(replay.ops)||replay.ops.length>12000)fail('consumer_replay_binding');
 const o=replay.options;if(!exact(o,['speed','fader','shuffle','seed'])||!Number.isFinite(o.speed)||o.speed<1||o.speed>9||!['off','in','in2','out','out2','blink','blink2','fog','pixel','pixel2','blind'].includes(o.fader)||!['off','mirror','random'].includes(o.shuffle)||!Number.isInteger(o.seed)||o.seed<0||o.seed>0xffffffff)fail('consumer_replay_options');
 if(own(replay,'audioLeadIn')&&(!Number.isFinite(replay.audioLeadIn)||replay.audioLeadIn<0||replay.audioLeadIn>10))fail('consumer_replay_leadin');
 if(own(replay,'fever')&&(!exact(replay.fever,['version','rulesId','auto'])||replay.fever.version!==1||!['legacy-off-v1','djmax-current-pending-v1','orvio-auto-v1'].includes(replay.fever.rulesId)||typeof replay.fever.auto!=='boolean'))fail('consumer_replay_fever');
 let prev=0;for(let i=0;i<replay.ops.length;i++){
  const op=replay.ops[i];if(!Array.isArray(op)||![0,1,2,3].includes(op[0])||!Number.isFinite(op[1])||op[1]<prev||op[1]>replay.end||!Number.isFinite(op[2])||op[2]<(replay.audioLeadIn===undefined?-2:-(replay.audioLeadIn+1))||op[2]>600&&!(op[0]===1&&op[2]===9999&&i===replay.ops.length-1))fail('consumer_replay_op');prev=op[1];
  if(op[0]===0&&(op.length!==5||!Number.isInteger(op[3])||op[3]<0||op[3]>=replay.lanes||![0,1].includes(op[4]))||op[0]===1&&op.length!==3||op[0]===2&&(op.length!==4||![0,1].includes(op[3]))||op[0]===3&&(op.length!==5||!Number.isFinite(op[3])||op[3]<1||op[3]>9||!['off','in','in2','out','out2','blink','blink2','fog','pixel','pixel2','blind'].includes(op[4])))fail('consumer_replay_op');
 }
 const chart=charts[`${replay.lanes}:${replay.difficulty}`];if(!chart?.notes)fail('consumer_chart_unavailable');return chart;
}
/** No qualified producer is shipped here. Policy=[] fails closed for all actions.
 * policyRows must be a separately reviewed build/corpus decision, not a field
 * from an imported record. Hash equality binds that decision, not code origin.
 * validateBinding is the accepted94 validator; verifyDerivedRecord is the
 * producer self-verifier including derived rating checks. Neither performs IO.
 */
export function createOpus468Consumer({policyRows=[],loadedProducerIdentity,validateBinding,verifyDerivedRecord}={}){
 if(!Array.isArray(policyRows))fail('consumer_policy');
 const policies=new Map();for(const row of policyRows){const p=policyRow(row);if(policies.has(p.generatorVersion))fail('consumer_policy_duplicate');policies.set(p.generatorVersion,p);}
 const loaded=loadedProducerIdentity===undefined?null:freeze(copy(loadedProducerIdentity));
 if(loaded!==null&&(!exact(loaded,['producerSha256','recipeSha256'])||!H(loaded.producerSha256)||!H(loaded.recipeSha256)))fail('consumer_loaded_identity');
 const tickets=new WeakMap(),installed=new Map();
 const allowed=e=>{const p=policies.get(e?.generatorVersion);if(!p||!loaded||loaded.producerSha256!==p.producerSha256||loaded.recipeSha256!==p.recipeSha256||forbidden(e.generatorVersion))fail('consumer_generator_unqualified');return p;};
 const get=t=>{const s=t&&typeof t==='object'?tickets.get(t):null;if(!s)fail('consumer_ticket');allowed(s.extension);return s;};
 const current=(s,raw)=>{if(typeof raw!=='string'||raw!==s.rawBase)fail('consumer_base_changed');};
 return Object.freeze({
  async prepare(input,{signal}={}){
   if(signal!==undefined&&!(signal instanceof AbortSignal))fail('consumer_signal');
   signal?.throwIfAborted();
   // Snapshot before awaiting validation; caller mutation cannot switch roots.
   const a=copy(input),policy=allowed(a?.extension);
   if(typeof validateBinding!=='function'||typeof verifyDerivedRecord!=='function')fail('consumer_validator_missing');
   const r=await validateBinding({...a,qualifiedGeneratorVersions:[policy.generatorVersion]});signal?.throwIfAborted();if(r?.ok!==true)fail('consumer_binding_'+(r?.error||'unavailable'));
   const base=JSON.parse(a.baseSourceRecordJson);
   if(await verifyDerivedRecord(a.extension,{baseRecordRaw:a.baseSourceRecordJson,baseRecord:base,descriptor:a.descriptor,descriptorSha256:a.extension.audioDescriptorSha256,signal})!==true)fail('consumer_derived_record');
   signal?.throwIfAborted();
   const e=freeze(copy(a.extension)),song=`yt-opus-${e.videoId}-${e.audioSha256}-c${e.baseChartSetSha256}-x${e.extensionSha256}`;
   const state={extension:e,rawBase:a.baseSourceRecordJson,policy,song,storedBytes:Uint8Array.from(r.storedBytes),storedBytesSha256:r.storedBytesSha256,playableKeys:freeze(copy(r.playableKeys))};
   const ticket=Object.freeze({});tickets.set(ticket,state);return ticket;
  },
  install(ticket,context={}){
   const {currentBaseSourceRecordJson}=copy(context);
   const s=get(ticket);current(s,currentBaseSourceRecordJson);
   const existing=installed.get(s.song);if(existing){if(existing.rawBase!==s.rawBase||existing.extension.extensionSha256!==s.extension.extensionSha256)fail('consumer_install_conflict');tickets.set(ticket,existing);return freeze({already:true,song:s.song});}
   // One synchronous Map mutation, after all validation. This proves only the
   // isolated in-memory registry. IDB adapters must supply their own transaction.
   installed.set(s.song,s);return freeze({already:false,song:s.song});
  },
  plan(ticket,action,context={}){
   const {currentBaseSourceRecordJson,replay}=copy(context);
   if(!ACTIONS.includes(action))fail('consumer_action');const s=get(ticket);current(s,currentBaseSourceRecordJson);
   if(installed.get(s.song)!==s)fail('consumer_not_installed');
   if(action==='install')return freeze({action,song:s.song,already:true});
   let chart;if(action==='play'||replay!==undefined)chart=replayBinding(replay,s.song,s.extension.charts);
   const out={action,song:s.song,policy:copy(s.policy),extension:copy(s.extension),baseSourceRecordJson:s.rawBase,extensionSha256:s.extension.extensionSha256,storedBytesSha256:s.storedBytesSha256,playableKeys:copy(s.playableKeys),...(replay?{replay:copy(replay)}:{}),...(chart?{frozenNotes:copy(chart.notes)}:{}),durable:false};
   // Bytes are a detached copy, never the registry's internal buffer.
   if(action==='persist')out.storedBytes=Uint8Array.from(s.storedBytes);
   return out;
  },
  size(){return installed.size;},
 });
}
