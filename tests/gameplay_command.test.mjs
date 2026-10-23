import test from "node:test";
import assert from "node:assert/strict";
import { decideGameplayCommand as decide } from "../app/domain/gameplay-command.mjs";

const id = (kind, n) => kind + ":" + n.toString(16).padStart(24, "0");
const actor = id("actor", 1), contact = id("actor", 2), object = id("object", 1);
const world = id("world", 1), request = id("req", 1);
function state() {
  return {
    world_id: world, ruleset_version: "1.0.0", sequence: 3,
    current_sector: "sector-null", active_actor_id: actor,
    actors: [
      { id: actor, sector: "sector-null", dialogue_options: [] },
      { id: contact, sector: "sector-null", dialogue_options: ["dialogue-ask".replace("-", ":")] },
    ],
    objects: [{ id: object, sector: "sector-null", inspectable: true, portable: true, used: false }],
    routes: [{ from: "sector-null", to: "sector-entry", unlocked: true }],
    inventory: [], inventory_capacity: 1, processed_request_ids: [],
  };
}
function cmd(action = "inspect", target_id = object) {
  const c = { world_id: world, actor_id: actor, action, target_id,
    expected_sequence: 3, ruleset_version: "1.0.0", request_id: request };
  if (action === "talk") c.option_id = "dialogue:ask";
  return c;
}
function fails(c, s, code) { assert.deepEqual(decide(c, s), { ok: false, code }); }

test("GAME-01 inspect creates deterministic proposal, never an I06 event", () => {
  const s = state(), c = cmd(), before = JSON.stringify([s,c]);
  const result = decide(c,s);
  assert.equal(result.ok,true);
  assert.equal(result.proposal.event_type,"game.object_inspected");
  assert.equal(result.proposal.payload.object_id,object);
  assert.equal(result.proposal.command_id,request);
  assert.equal(Object.hasOwn(result.proposal,"event_id"),false);
  assert.equal(JSON.stringify([s,c]),before);
  assert.deepEqual(decide(c,s),result);
});
test("GAME-02 talk requires explicit allowed dialogue option", () => {
  assert.equal(decide(cmd("talk",contact),state()).proposal.event_type,"game.dialogue_selected");
  const c=cmd("talk",contact);c.option_id="dialogue:missing";
  fails(c,state(),"INVALID_DIALOGUE_OPTION");
});
test("GAME-03 take checks capacity and ownership", () => {
  assert.equal(decide(cmd("take"),state()).proposal.event_type,"game.object_taken");
  const s=state();s.inventory_capacity=0;fails(cmd("take"),s,"INVENTORY_FULL");
  const owned=state();owned.inventory=[object];fails(cmd("take"),owned,"NOT_ALLOWED");
});
test("GAME-04 move requires existing unlocked route", () => {
  assert.equal(decide(cmd("move","sector-entry"),state()).proposal.event_type,"game.sector_entered");
  fails(cmd("move","sector-unknown"),state(),"UNKNOWN_ROUTE");
  const s=state();s.routes[0].unlocked=false;fails(cmd("move","sector-entry"),s,"LOCKED_ROUTE");
});
test("unknown action and missing/extra fields rejected", () => {
  const c=cmd();c.action="delete";fails(c,state(),"INVALID_COMMAND");
  const missing=cmd();delete missing.request_id;fails(missing,state(),"INVALID_COMMAND");
  fails({...cmd(), injected:true},state(),"INVALID_COMMAND");
  fails({...cmd(),option_id:"dialogue:ask"},state(),"INVALID_COMMAND");
});
test("invalid command types fail closed without throwing", () => {
  for(const c of [null,[],1,"text",{...cmd(),expected_sequence:NaN},
    {...cmd(),expected_sequence:1.5},{...cmd(),target_id:{}},
    {...cmd(),request_id:"req:../escape"}]) fails(c,state(),"INVALID_COMMAND");
});
test("world, ruleset, sequence and active actor protected", () => {
  fails({...cmd(),world_id:id("world",2)},state(),"WRONG_WORLD_OR_RULESET");
  fails({...cmd(),ruleset_version:"2.0.0"},state(),"WRONG_WORLD_OR_RULESET");
  fails({...cmd(),expected_sequence:2},state(),"STALE_SEQUENCE");
  fails({...cmd(),actor_id:contact},state(),"UNAUTHORIZED_ACTOR");
});
test("replayed request id is rejected before proposal", () => {
  const s=state();s.processed_request_ids=[request];fails(cmd(),s,"DUPLICATE_REQUEST");
});
test("invalid snapshot, ambiguous IDs and malformed collections rejected", () => {
  for(const s of [null,{}, {...state(),inventory:"bad"},
    {...state(),sequence:-1}, {...state(),inventory_capacity:-1},
    {...state(),objects:[...state().objects,...state().objects]},
    {...state(),routes:[...state().routes,...state().routes]},
    {...state(),processed_request_ids:[request,request]}]) fails(cmd(),s,"INVALID_SNAPSHOT");
});
test("unreachable objects, actors, nonportable and used objects rejected", () => {
  const s=state();s.objects[0].sector="sector-entry";fails(cmd(),s,"NOT_REACHABLE");
  const t=state();t.actors[1].sector="sector-entry";fails(cmd("talk",contact),t,"NOT_REACHABLE");
  const u=state();u.objects[0].portable=false;fails(cmd("take"),u,"NOT_ALLOWED");
  const v=state();v.objects[0].used=true;fails(cmd("take"),v,"NOT_ALLOWED");
  fails(cmd("inspect",id("object",99)),state(),"UNKNOWN_TARGET");
});
test("unknown actor and dialogue option cannot emit proposal", () => {
  fails(cmd("talk",id("actor",99)),state(),"UNKNOWN_TARGET");
  const c=cmd("talk",contact);delete c.option_id;fails(c,state(),"INVALID_COMMAND");
});
test("1000 preflights deterministic and leave snapshot untouched", () => {
  const s=state(), c=cmd(), before=JSON.stringify(s);
  for(let n=0;n<1000;n++) assert.equal(decide(c,s).proposal.event_type,"game.object_inspected");
  assert.equal(JSON.stringify(s),before);
});
