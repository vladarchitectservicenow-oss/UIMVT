// Copyright (c) 2026 Vladimir Kapustin
// SPDX-License-Identifier: AGPL-3.0-only
/**
 * test_uimvt_scanner.js
 * Unit tests for UIMVTScanner + UIMVTScoreEngine.
 * Self-contained mocks — does NOT require AASL test file.
 */

const fs = require('fs');
const assert = require('assert');

// === Mock ServiceNow Runtime (reused from AASL test pattern) ===
global.Class = {
  create: function() {
    var cls = function() { if (this.initialize) this.initialize.apply(this, arguments); };
    return cls;
  }
};

function MockGR(table, rows) {
  this.table = table;
  this._rows = rows || [];
  this._idx = -1;
  this._filters = {};
  this._limit = null;
  this._inserted = [];
  this._filtered = [];
}
MockGR.prototype.addQuery = function(field, val) { this._filters[field] = val; };
MockGR.prototype.setLimit = function(n) { this._limit = n; };
MockGR.prototype.query = function() {
  this._idx = -1;
  this._filtered = this._rows.filter((r) => {
    for (var k in this._filters) { if (String(r[k] || "") !== String(this._filters[k])) return false; }
    return true;
  });
};
MockGR.prototype.next = function() {
  this._idx++;
  if (this._limit && this._idx >= this._limit) return false;
  return this._idx < this._filtered.length;
};
MockGR.prototype.getValue = function(field) {
  if (this._idx >= 0 && this._idx < this._filtered.length) return String(this._filtered[this._idx][field] || "");
  return "";
};
MockGR.prototype.getUniqueValue = function() {
  if (this._idx >= 0 && this._idx < this._filtered.length) return this._filtered[this._idx]["sys_id"] || "mock-id";
  return "mock-id";
};

global.GlideRecord = function(table) { return new MockGR(table); };
global.GlideDateTime = function(v) {
  this._v = v || new Date().toISOString();
  this.getDisplayValue = function() { return this._v; };
  this.getDisplayValueInternal = function() { return this._v.replace(/[-:T.Z]/g,""); };
  this.addDays = function(d) {};
};
global.gs = {
  dateDiff: function(a,b,ms) { return 604800000; }, // 7 days
  warn: function(m) { console.log("WARN:", m); }
};

function stripHeader(code) { return code.replace(/^\/\*.*?\*\//s, ''); }
eval(stripHeader(fs.readFileSync('/home/crixus/agentic-loop/output/UIMVT/src/UIMVTScanner.js', 'utf8')));
eval(stripHeader(fs.readFileSync('/home/crixus/agentic-loop/output/UIMVT/src/UIMVTScoreEngine.js', 'utf8')));
eval(stripHeader(fs.readFileSync('/home/crixus/agentic-loop/output/UIMVT/src/UIMVTDashboardRenderer.js', 'utf8')));

function overrideGR(rowsMap) {
  global.GlideRecord = function(table) {
    if (rowsMap[table]) return new MockGR(table, rowsMap[table]);
    return new MockGR(table);
  };
}

// ============================================================================
// TESTS
// ============================================================================

function testScannerDetectsLegacy() {
  overrideGR({
    "sys_ui_form": [
      { view: "Default", sys_scope: "global" },
      { view: "UI15", sys_scope: "global" },
      { view: "Next Experience", sys_scope: "x_custom" },
      { view: "UISection", sys_scope: "x_custom" }
    ],
    "sys_ui_list": [
      { view: "Default", sys_scope: "global" },
      { view: "classic_ui", sys_scope: "x_custom" }
    ],
    "sys_ui_macro": [
      { name: "awa_header", xml: "<div>AWA</div>", sys_scope: "global" },
      { name: "modern_card", xml: "<uib-card></uib-card>", sys_scope: "x_custom" }
    ],
    "sys_ui_module": []
  });
  var scanner = new UIMVTScanner();
  var result = scanner.runFullScan();
  // 4 forms + 2 lists = 6 forms
  assert.strictEqual(result.totalForms, 6, "Expected 6 forms, got " + result.totalForms);
  assert(result.legacyForms >= 2, "Expected >=2 legacy forms");
  assert(result.nextExperienceForms >= 1, "Expected >=1 NE forms");
  assert.strictEqual(result.totalMacros, 2);
  assert.strictEqual(result.legacyMacros, 1); // awa_header
  console.log("  testScannerDetectsLegacy PASSED");
}

function testScoreEngineCalculatesPct() {
  var appData = { app: "x_custom", totalForms: 10, legacyForms: 3, nextExperienceForms: 5, legacyMacros: 1, totalMacros: 2, awRefs: 0 };
  var engine = new UIMVTScoreEngine();
  var score = engine.calculateAppScore(appData, null);
  // total = 10+2=12, legacy = 3+1=4, migrated = 8, pct = 8/12*100 = 66.67
  assert(score.migration_pct > 60 && score.migration_pct < 70, "Expected ~66.67%, got " + score.migration_pct);
  assert.strictEqual(score.velocity_score, 0, "First scan has no previous → velocity 0");
  assert.strictEqual(score.predicted_ready_date, null, "No velocity → no prediction");
  console.log("  testScoreEngineCalculatesPct PASSED (pct=" + score.migration_pct + ")");
}

function testVelocityCalculation() {
  var appData = { app: "x_custom", totalForms: 100, legacyForms: 10, nextExperienceForms: 80, legacyMacros: 0, totalMacros: 0, awRefs: 0 };
  var previous = {
    migration_pct: 70.0,
    last_scan_date: new GlideDateTime("20260509000000")
  };
  var engine = new UIMVTScoreEngine();
  var score = engine.calculateAppScore(appData, previous);
  // migrated = 90/100 = 90%, delta = 20% over 7 days → velocity = 20 per week
  assert(score.velocity_score > 15, "Expected velocity >15, got " + score.velocity_score);
  assert(score.predicted_ready_date !== null, "Should predict ready date");
  console.log("  testVelocityCalculation PASSED (velocity=" + score.velocity_score + ")");
}

function testAlertTriggered() {
  var score = {
    migration_pct: 45,
    velocity_score: 0.5,
    alert_threshold: 2.0
  };
  var engine = new UIMVTScoreEngine();
  var alert = engine.checkAlert(score);
  assert.strictEqual(alert.alert, true, "Velocity 0.5 should trigger alert");
  console.log("  testAlertTriggered PASSED");
}

function testAlertNotTriggered() {
  var score = {
    migration_pct: 45,
    velocity_score: 5.0,
    alert_threshold: 2.0
  };
  var engine = new UIMVTScoreEngine();
  var alert = engine.checkAlert(score);
  assert.strictEqual(alert.alert, false, "Velocity 5.0 should not trigger alert");
  console.log("  testAlertNotTriggered PASSED");
}

function testDashboardHTML() {
  var renderer = new UIMVTDashboardRenderer();
  var snapshot = { instance_name: "dev362840", scan_date: "2026-05-16", total_forms: 100, legacy_forms: 20, next_experience_forms: 70, legacy_ui_macros: 5, total_ui_macros: 10, agent_workspace_refs: 0 };
  var scores = [{ app_name: "global", total_forms: 50, migrated_forms: 40, migration_pct: 80, velocity_score: 5, predicted_ready_date: "2026-06-01", alert: false }];
  var html = renderer.generateHTML(snapshot, scores);
  assert(html.includes("Australia Readiness"), "HTML should contain product name");
  assert(html.includes("global"), "HTML should contain app name");
  console.log("  testDashboardHTML PASSED");
}

function testDashboardJSON() {
  var renderer = new UIMVTDashboardRenderer();
  var snapshot = { instance_name: "dev362840", scan_date: "2026-05-16", total_forms: 100, legacy_forms: 20, next_experience_forms: 70, legacy_ui_macros: 5, total_ui_macros: 10, agent_workspace_refs: 0 };
  var scores = [{ app_name: "global", total_forms: 50, migrated_forms: 40, migration_pct: 80, velocity_score: 5, predicted_ready_date: "2026-06-01", alert: false }];
  var jsonStr = renderer.generateJSON(snapshot, scores);
  var data = JSON.parse(jsonStr);
  assert.strictEqual(data.version, "1.0.0");
  assert.strictEqual(data.instance, "dev362840");
  console.log("  testDashboardJSON PASSED");
}

function testDashboardCSV() {
  var renderer = new UIMVTDashboardRenderer();
  var scores = [{ app_name: "global", total_forms: 50, migrated_forms: 40, migration_pct: 80, velocity_score: 5, predicted_ready_date: "2026-06-01", alert: false }];
  var csv = renderer.generateCSV(scores);
  assert(csv.includes("App,TotalForms"), "CSV should have header");
  assert(csv.includes("global,50,40,80,5,2026-06-01,NO"), "CSV should have row");
  console.log("  testDashboardCSV PASSED");
}

// === RUN ALL ===
console.log("Running UIMVT unit tests...\n");
testScannerDetectsLegacy();
testScoreEngineCalculatesPct();
testVelocityCalculation();
testAlertTriggered();
testAlertNotTriggered();
testDashboardHTML();
testDashboardJSON();
testDashboardCSV();
console.log("\nAll 8 unit tests PASSED");
