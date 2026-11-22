import assert from 'node:assert/strict';
import test from 'node:test';
import { appendDecision, journalRestorePlan, labRisk, PRACTICE_KEY, readAttempt, upgradeJournalBackup } from '../assets/ict-practice-state.mjs';

function memory() {
  return {getItem(key) { return this[key] ?? null; }, setItem(key, value) { this[key] = value; }};
}

test('replay writes cursor and evidence together and resumes the same attempt', () => {
  const store = memory(), key = 'replay', dataset = 'EDU-NQ-REPLAY-01';
  const start = readAttempt(null, dataset, () => 'attempt-one');
  const known = [{kind:'low', bar:3, price:19980, knownAt:'2026-06-02T13:50:00.000Z'}];
  const decision = appendDecision(store,key,null,start,dataset,'Wait','Confirm the fifth close',known,12);
  assert.equal(decision.nextCursor,5);
  assert.equal(decision.barClose,'2026-06-02T13:50:00.000Z');
  assert.deepEqual(decision.knownLevels,known);
  const stored = store.getItem(key);
  const next = readAttempt(stored,dataset,()=>'another-id');
  assert.equal(next.id,'attempt-one');
  assert.equal(next.cursor,5);
  assert.equal(next.revision,1);
  assert.throws(()=>appendDecision(store,key,null,start,dataset,'Skip','Stale tab',[],12),/another tab/);
  store.setItem = () => { throw Error('Storage quota'); };
  assert.throws(()=>appendDecision(store,key,stored,next,dataset,'Skip','Write fails',[],12),/Storage quota/);
  assert.equal(store.getItem(key),stored);
  assert.equal(readAttempt('[{"bar":4,"action":"Wait"}]',dataset,()=>'legacy').cursor,5);
});

test('Lab risk uses the selected registry tick, loss cap and fixed-point costs', () => {
  const spec={tickSize:'0.25',tickValue:'0.5'};
  const fields={side:'Long',entry:'20000',stop:'19999',budget:'100',remaining:'3.99',fees:'1',spread:'1',slip:'1',max:'10'};
  const out=labRisk(fields,spec);
  assert.equal(out.allInRiskPerContractMicros,'4000000');
  assert.equal(out.quantity,0);
  assert.equal(labRisk({...fields,remaining:'8'},spec).quantity,2);
  assert.equal(labRisk({...fields,remaining:'8',max:'1'},spec).quantity,1);
  assert.equal(labRisk({...fields,budget:'0'},spec).quantity,0);
  assert.throws(()=>labRisk({...fields,entry:'20000.01'},spec),/align/);
  assert.throws(()=>labRisk({...fields,budget:'-1'},spec),/non-negative/);
  assert.throws(()=>labRisk({...fields,stop:''},spec),/decimal/);
  assert.throws(()=>labRisk({...fields,side:'Short'},spec),/loss side/);
});

test('journal restore previews, preserves conflicts and deduplicates version 1 exports', async () => {
  const store=memory(), playbooks=['P01 ICT 2022 Mentorship setup'];
  const record={date:'2026-06-02',symbol:'ES',action:'No trade',plan:'Wait',actual:'Skip',quality:'Sound',
    adherence:'Followed',emotion:'Calm',review:'No trigger',tags:['C40'],primary:null,outcome:null,
    charts:{before:'data:image/png;base64,AA==',after:null}};
  const backup={schemaVersion:2,entries:[{origin:'origin-1',record}]};
  const [preview]=journalRestorePlan(backup,store,playbooks);
  assert.equal(preview.state,'Ready');
  assert.equal(store.getItem(preview.key),null);
  store.setItem(preview.key,JSON.stringify(preview.record));
  assert.equal(journalRestorePlan(backup,store,playbooks)[0].state,'Already present');
  const conflict={...backup,entries:[{origin:'origin-1',record:{...record,review:'Changed'}}]};
  assert.match(journalRestorePlan(conflict,store,playbooks)[0].state,/Conflict/);
  assert.match(store.getItem(PRACTICE_KEY+'journal.origin-1'),/No trigger/);
  const v1=await upgradeJournalBackup({schemaVersion:1,entries:[record]},playbooks);
  assert.equal(journalRestorePlan(v1,store,playbooks)[0].state,'Already present');
  const bad={...backup,entries:[{origin:'origin-2',record:{...record,charts:{before:'data:image/svg+xml;base64,AA=='}}}]};
  assert.match(journalRestorePlan(bad,store,playbooks)[0].state,/Invalid/);
});
