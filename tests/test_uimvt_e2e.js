// Copyright (c) 2026 Vladimir Kapustin
// SPDX-License-Identifier: AGPL-3.0-only
/**
 * test_uimvt_e2e.js
 * End-to-end: full scanner → score engine → renderer pipeline.
 */
const fs = require('fs');
const assert = require('assert');

global.Class = {
  create: function() {
    var cls = function() { if (this.initialize) this.initialize.apply(this, arguments); };
    return cls;
  }
};

function MockGR(table, rows) { this._rows = rows||[]; this._idx=-1; this._filters={}; this._limit=null; this._filtered=[]; }
MockGR.prototype.addQuery=function(f,v){ this._filters[f]=v; };
MockGR.prototype.setLimit=function(n){ this._limit=n; };
MockGR.prototype.query=function(){ this._idx=-1; this._filtered=this._rows.filter((r)=>{ for(var k in this._filters){ if(String(r[k]||'')!==String(this._filters[k])) return false; } return true; }); };
MockGR.prototype.next=function(){ this._idx++; if(this._limit&&this._idx>=this._limit) return false; return this._idx<this._filtered.length; };
MockGR.prototype.getValue=function(f){ if(this._idx>=0&&this._idx<this._filtered.length) return String(this._filtered[this._idx][f]||""); return ""; };
MockGR.prototype.getUniqueValue=function(){ if(this._idx>=0&&this._idx<this._filtered.length) return this._filtered[this._idx]["sys_id"]||"mock-id"; return "mock-id"; };

// Multi-scope data: 3 apps, mixed legacy/NE
var DB = {
  "sys_ui_form": [
    { view: "Default", sys_scope: "global" },
    { view: "UI15", sys_scope: "global" },
    { view: "UI15", sys_scope: "global" },
    { view: "Next Experience", sys_scope: "x_hr" },
    { view: "Next Experience", sys_scope: "x_hr" },
    { view: "Next Experience", sys_scope: "x_hr" },
    { view: "Default", sys_scope: "x_hr" },
    { view: "Default", sys_scope: "x_itil" },
    { view: "UISection", sys_scope: "x_itil" },
    { view: "UISection", sys_scope: "x_itil" },
    { view: "UISection", sys_scope: "x_itil" }
  ],
  "sys_ui_list": [
    { view: "Default", sys_scope: "global" },
    { view: "classic_ui", sys_scope: "global" },
    { view: "classic_ui", sys_scope: "global" },
    { view: "Default", sys_scope: "x_hr" },
    { view: "Default", sys_scope: "x_itil" }
  ],
  "sys_ui_macro": [
    { name: "awa_header", xml: "<div>AWA</div>", sys_scope: "global" },
    { name: "legacy_nav", xml: "<div>UI11</div>", sys_scope: "global" },
    { name: "modern_card", xml: "<uib-card></uib-card>", sys_scope: "x_hr" }
  ],
  "sys_ui_module": [
    { url: "nav_to.do?uri=ui11", sys_scope: "global" },
    { url: "nav_to.do?uri=workspace", sys_scope: "x_itil" }
  ]
};

global.GlideRecord = function(table){ if(DB[table]) return new MockGR(table, DB[table]); return new MockGR(table); };
global.GlideDateTime = function(v){ this._v=v||new Date().toISOString(); this.getDisplayValue=function(){return this._v;}; this.getDisplayValueInternal=function(){return this._v.replace(/[-:T.Z]/g,"");}; this.addDays=function(d){}; };
global.gs = { dateDiff:function(a,b,ms){ return 604800000; }, warn:function(m){ console.log("WARN:",m); } };

function stripHeader(code){ return code.replace(/^\/\*.*?\*\//s, ''); }
eval(stripHeader(fs.readFileSync('/home/crixus/agentic-loop/output/UIMVT/src/UIMVTScanner.js','utf8')));
eval(stripHeader(fs.readFileSync('/home/crixus/agentic-loop/output/UIMVT/src/UIMVTScoreEngine.js','utf8')));
eval(stripHeader(fs.readFileSync('/home/crixus/agentic-loop/output/UIMVT/src/UIMVTDashboardRenderer.js','utf8')));

var scanner = new UIMVTScanner();
var scan = scanner.runFullScan();

console.log("E2E SCAN RESULTS:");
console.log("  totalForms:", scan.totalForms);
console.log("  legacyForms:", scan.legacyForms);
console.log("  nextExperienceForms:", scan.nextExperienceForms);
console.log("  totalMacros:", scan.totalMacros);
console.log("  legacyMacros:", scan.legacyMacros);
console.log("  awRefs:", scan.awRefs);
console.log("  apps:", Object.keys(scan.perApp).join(", "));

// Assertions
assert.strictEqual(scan.totalForms, 16, "Expected 16 forms");
assert.ok(scan.legacyForms >= 4, "Expected >=4 legacy");
assert.ok(scan.nextExperienceForms >= 3, "Expected >=3 NE");
assert.strictEqual(scan.totalMacros, 3, "Expected 3 macros");
assert.strictEqual(scan.legacyMacros, 2, "Expected 2 legacy macros");

// Score engine
var se = new UIMVTScoreEngine();
var appScores = [];
for (var app in scan.perApp) {
  var s = se.calculateAppScore(scan.perApp[app], null);
  appScores.push(s);
}

console.log("\nE2E APP SCORES:");
for (var i = 0; i < appScores.length; i++) {
  var a = appScores[i];
  console.log("  " + a.app_scope + ": " + a.migration_pct + "% migrated, velocity=" + a.velocity_score + "/wk");
}

// Renderer
var rend = new UIMVTDashboardRenderer();
var snap = {
  instance_name: "dev362840",
  scan_date: "2026-05-16",
  total_forms: scan.totalForms,
  legacy_forms: scan.legacyForms,
  next_experience_forms: scan.nextExperienceForms,
  legacy_ui_macros: scan.legacyMacros,
  total_ui_macros: scan.totalMacros,
  agent_workspace_refs: scan.awRefs
};
var html = rend.generateHTML(snap, appScores);
var json = JSON.parse(rend.generateJSON(snap, appScores));
var csv = rend.generateCSV(appScores);

console.assert(html.includes("dev362840"), "HTML should contain instance");
console.assert(json.totals.total_forms === 16, "JSON total_forms mismatch");
console.assert(csv.includes("x_hr"), "CSV should contain x_hr");

console.log("\nE2E ALL ASSERTIONS PASSED");
