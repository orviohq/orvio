import { normalizeFaultOccurrence } from './fault-alert-policy';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export interface FaultDeliveryDraft { occurrenceId:string; detectedAt:number; content:string; allowed_mentions:{parse:never[]}; }
/** No transport, token, destination, scheduler or side effect. Expected relay only
 * receives sanitized coarse categories, not raw errors/song/account/location. */
export function prepareFaultDelivery(raw:unknown,now:number):FaultDeliveryDraft|null{
 if(!raw||typeof raw!=='object'||Object.keys(raw).some(k=>!['area','reasonCode','observedAt','occurrenceId'].includes(k)))return null;
 const fact=normalizeFaultOccurrence(raw);
 if(!fact||!UUID.test(fact.occurrenceId)||!Number.isSafeInteger(now)||fact.observedAt>now||now-fact.observedAt>10000)return null;
 const area={access:'Game access',playback:'Song playback','youtube-add':'YouTube song add'}[fact.area];
 return Object.freeze({occurrenceId:fact.occurrenceId,detectedAt:fact.observedAt,content:`Orvio fault detected: ${area} (${fact.reasonCode}).`,allowed_mentions:Object.freeze({parse:Object.freeze([])})}) as unknown as FaultDeliveryDraft;
}
/** Retained by an eventual authorized host; no delivery is implied by claiming.
 * A failed attempt is not an acknowledgement and may be retried before expiry. */
export function createFaultDeliveryLedger(){
 const pending=new Set<string>(),delivered=new Set<string>();
 return {
  claim(draft:FaultDeliveryDraft,now:number){if(now<draft.detectedAt||now-draft.detectedAt>10000||pending.has(draft.occurrenceId)||delivered.has(draft.occurrenceId))return false;pending.add(draft.occurrenceId);return true;},
  settle(id:string,acknowledged:boolean){if(!pending.delete(id))return false;if(acknowledged){delivered.add(id);if(delivered.size>256)delivered.delete(delivered.values().next().value!);}return true;},
 };
}
