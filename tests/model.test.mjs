import test from "node:test";
import assert from "node:assert/strict";
import {summarize,comparison,ranked,percent,share,topShare,previousDate,preset,indexNames,recordPath} from "../web/model.mjs";
const ed={countries:[["Canada","a",2,12,10],["Canada","b",8,7,0],["France","a",4,40,30]]};
test("country and software counts preserve the proper denominator",()=>{
  assert.deepEqual(summarize(ed,"country","Canada").totals,{servers:10,users:19,active:10});
  assert.equal(comparison(ed,"Canada","a").serverShare,20);
  assert.equal(comparison(ed,"Canada","a").activeShare,100);
  assert.deepEqual(ranked(summarize(ed,"software","a"),"active").map(r=>r.name),["France","Canada"]);
});
test("absent pairs, reported zero, and no measurable denominator are distinct",()=>{
  assert.equal(comparison(ed,"France","b").row,null);
  assert.equal(comparison(ed,"Canada","b").activeShare,0);
  assert.equal(percent(share(0,0)),"—");
  assert.equal(topShare({top:[["example.test",6]],active:8}),75);
});
test("historical labels and deep selections are retained before or after presence",()=>{
  const archive={editions:{a:ed,b:{countries:[["Réunion","new",1,0,0]]}}};
  assert.deepEqual(indexNames(archive,"country"),["Canada","France","Réunion"]);
  assert.equal(recordPath("countries","Réunion"),"records/countries/reunion/");
  assert.equal(previousDate(["a","b"],"a"),null);
  assert.equal(new URLSearchParams(preset("a","Réunion","The Netherlands","new")).get("other"),"The Netherlands");
});
