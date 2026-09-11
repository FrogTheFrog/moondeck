const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { BehaviorSubject } = require('rxjs');
const { isEqual } = require('lodash');
const AppType = {MoonDeck:0, GameStream:1, NonSteam:2};
let calls = [], terminated = [], response = async () => true;
class ReadonlySubject { constructor(subject) {this.subject = subject;} get value() {return this.subject.value;} }
const exports_ = {};
const mocks = {
  './steamutils': {AppType, setShortcutName:async()=>true, terminateApp:async id=>{terminated.push(id); return true;}},
  'rxjs': {BehaviorSubject}, './readonlysubject':{ReadonlySubject},
  '@decky/api':{call:async (...args)=>{calls.push(args);return response(...args);}},
  'lodash':{isEqual}, './logger':{logger:{critical(){},warn(){},log(){},toast(){}}}
};
const code=ts.transpileModule(fs.readFileSync('src/lib/moondeckapp.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
vm.runInNewContext(code,{exports:exports_,require:name=>{assert.ok(name in mocks,name);return mocks[name];}});
const make = (type=AppType.MoonDeck,id=728880)=>{
  calls=[]; terminated=[];response=async()=>true;
  const app=new exports_.MoonDeckAppProxy({closeSteam:async()=>{}});
  app.setApp(id,2168823603,'Test',type,{nameSetToAppId:false},{address:'192.0.2.1',buddyPort:59999,clientId:'test-client',gameId:'9315026445711441920',appId:String(id)});
  return app;
};
(async()=>{
  let app=make();
  assert.equal(app.shouldStopHost('9315026445711441920'),true);
  assert.equal(app.shouldStopHost('728880'),true);
  assert.equal(app.shouldStopHost('999'),false);
  await app.quitApp();
  assert.deepEqual(calls[0],['stop_steam_app','192.0.2.1',59999,'test-client','728880']);
  assert.deepEqual(terminated,[2168823603]);
  assert.equal(app.shouldStopHost('728880'),false,'internal cleanup bypasses host stop');
  app=make(); response=async()=>false;
  await app.quitApp(); assert.equal(terminated.length,0,'failed host stop retains stream');
  assert.equal(app.value.quittingHost,false);
  app=make(); let resolve;response=()=>new Promise(r=>resolve=r);
  const pending=app.quitApp(); await app.quitApp(); assert.equal(calls.length,1,'double click is deduplicated');
  app.setApp(123,456,'Next',AppType.MoonDeck,{nameSetToAppId:false},{address:'192.0.2.2',buddyPort:59999,clientId:'other',gameId:'789',appId:'123'});
  resolve(true);await pending;assert.equal(terminated.length,0,'old reply cannot terminate a new session');
  app=make(); await app.killApp(); assert.equal(calls.length,0,'internal cleanup never stops host game');
  app=make(AppType.NonSteam);assert.equal(app.shouldStopHost('728880'),false);
  app=make(AppType.GameStream);assert.equal(app.shouldStopHost('728880'),false);
  app=make();app.setApp(728880,2168823603,'Test',AppType.MoonDeck,{nameSetToAppId:false},null);assert.equal(app.shouldStopHost('728880'),false,'disabled option keeps normal behavior');
  console.log('PASS: explicit exit, unrelated game, failure, duplicate click, session change, internal cleanup, unsupported app');
})().catch(e=>{console.error(e);process.exitCode=1;});
