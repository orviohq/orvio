// PRIVATE exact regenerated extension verification, not a producer-admission decision.
import {generatePrivateNmGuardExtension} from './opus468-private-nmguard-generate.mjs';
export async function verifyPrivateNmGuardInOwnedWorker(args){
 const {record,signal,...input}=args;signal?.throwIfAborted();
 const expected=structuredClone(record);
 const made=await generatePrivateNmGuardExtension({...input,signal});signal?.throwIfAborted();
 if(made?.kind!=='orvio-private-nmguard-v1-generated-extension'||made.qualified!==false||made.admission!=='DENY'||
 made.loadedBuild?.workerSha256!=='a647d0e0910d1889f026fc7e8c39ec950404367b8c74b168e0f303b3ca93cb35'||
 made.loadedBuild?.buildRootSha256!=='f07b226346becdef2d12eda7b37c0278011f9bd35b3c348acb97412a50a6cddf'||
 made.proof?.ok!==true||made.proof?.recipeSha256!=='d850ee9203824ebe54bda81370a61a636677a18159a79bf89fdb693da948e0b2'||
 made.proof?.sourceCount!==14||made.proof?.regenerationLevel!==2||made.proof?.canonicalRecordMatch!==true||made.proof?.extensionSha256Match!==true||
 made.extension?.extensionSha256!==expected?.extensionSha256||JSON.stringify(made.extension)!==JSON.stringify(expected))return {ok:false};
 return {ok:true,steps:{regeneration:{level:2,extensionSha256Match:true,canonicalRecordMatch:true}}};
}
