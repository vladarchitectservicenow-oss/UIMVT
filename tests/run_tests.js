/*
  Copyright (c) 2026 Vladimir Kapustin. Licensed under AGPL-3.0.
  ServiceNow UI Migration Velocity Tracker (UIMVT)
  tests/run_tests.js — Self-contained test runner (no external deps)
*/

var fs = require('fs');
var path = require('path');

// Load src modules
var srcPath = path.join(__dirname, '..', 'src');

function loadSrc(file) {
  var code = fs.readFileSync(path.join(srcPath, file), 'utf8');
  var wrapper = new Function('exports', 'require', 'module', '__filename', '__dirname', code);
  var mod = { exports: {} };
  wrapper(mod.exports, require, mod, path.join(srcPath, file), srcPath);
  return mod.exports;
}

var ScannerMod = loadSrc('UIMVTScanner.js');
var ScoreMod = loadSrc('UIMVTScoreEngine.js');
var RenderMod = loadSrc('UIMVTDashboardRenderer.js');
var AlertMod = loadSrc('UIMVTAlertEngine.js');

var UIMVTScanner = ScannerMod.UIMVTScanner;
var UIMVTScoreEngine = ScoreMod.UIMVTScoreEngine;
var UIMVTDashboardRenderer = RenderMod.UIMVTDashboardRenderer;
var UIMVTAlertEngine = AlertMod.UIMVTAlertEngine;
var UIMVTAlertError = AlertMod.UIMVTAlertError;

var results = [];
var passCount = 0;
var failCount = 0;

function log(msg) {
  console.log(msg);
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error((msg || 'Assertion failed') + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
}

function assertContains(haystack, needle, msg) {
  if (String(haystack).indexOf(needle) === -1) {
    throw new Error((msg || 'Contains assertion failed') + ': expected to contain "' + needle + '" in "' + haystack + '"');
  }
}

function runScenario(id, name, fn) {
  var status = 'PASS';
  var error = null;
  try {
    fn();
  } catch (e) {
    status = 'FAIL';
    error = e.stack || e.message;
  }
  results.push({ id: id, name: name, status: status, error: error });
  if (status === 'PASS') passCount++; else failCount++;
  log('[' + status + '] ' + id + ' — ' + name);
  if (error) log('  Error: ' + error.split('\n').slice(0,3).join(' | '));
}

// ---------- SOP-001: Legacy UI Detection — Forms ----------
runScenario('SOP-001', 'Legacy UI Detection — Forms', function() {
  var scanner = new UIMVTScanner();
  var instance = {
    forms: [
      { name: 'F1', legacy_client_scripts: ['cs1'], app: 'A' },
      { name: 'F2', legacy_client_scripts: ['cs2'], app: 'A' },
      { name: 'F3', legacy_client_scripts: ['cs3'], app: 'A' },
      { name: 'F4', next_experience: true, app: 'A' },
      { name: 'F5', hasDeclarativeActions: true, app: 'A' }
    ]
  };
  var res = scanner.scanInstance(instance);
  assertEq(res.forms.legacy, 3, 'legacy forms count');
  assertEq(res.forms.modern, 2, 'modern forms count');
});

// ---------- SOP-002: Legacy UI Detection — Lists ----------
runScenario('SOP-002', 'Legacy UI Detection — Lists', function() {
  var scanner = new UIMVTScanner();
  var instance = {
    lists: [
      { name: 'L1', legacy_related_list: true, app: 'A' },
      { name: 'L2', list_control: 'legacy', app: 'A' },
      { name: 'L3', unified_filters: true, app: 'A' },
      { name: 'L4', workspace_list: true, app: 'A' }
    ]
  };
  var res = scanner.scanInstance(instance);
  assertEq(res.lists.legacy, 2, 'legacy lists count');
  assertEq(res.lists.modern, 2, 'modern lists count');
});

// ---------- SOP-003: Legacy UI Detection — Macros ----------
runScenario('SOP-003', 'Legacy UI Detection — Macros', function() {
  var scanner = new UIMVTScanner();
  var instance = {
    macros: [
      { name: 'M1', jelly_script: true, app: 'A' },
      { name: 'M2', widget_type: 'legacy_homepage', app: 'A' },
      { name: 'M3', jelly_script: true, app: 'A' },
      { name: 'M4', type: 'web_component', app: 'A' },
      { name: 'M5', framework: 'now', app: 'A' },
      { name: 'M6', jelly_script: true, app: 'A' }
    ]
  };
  var res = scanner.scanInstance(instance);
  assertEq(res.macros.legacy, 4, 'legacy macros count');
  assertEq(res.macros.modern, 2, 'modern macros count');
});

// ---------- SOP-004: Legacy UI Detection — Modules ----------
runScenario('SOP-004', 'Legacy UI Detection — Modules', function() {
  var scanner = new UIMVTScanner();
  var instance = {
    modules: [
      { name: 'Mod1', url: 'sys_ui_page.do', workspace_mapped: false, app: 'A' },
      { name: 'Mod2', legacy_url: true, app: 'A' },
      { name: 'Mod3', url: 'sys_ui_page.do', workspace_mapped: false, app: 'A' },
      { name: 'Mod4', url: 'sys_ui_page.do', workspace_mapped: false, app: 'A' },
      { name: 'Mod5', url: 'sys_ui_page.do', workspace_mapped: false, app: 'A' },
      { name: 'Mod6', navigation_type: 'workspace', app: 'A' },
      { name: 'Mod7', app_engine: true, app: 'A' },
      { name: 'Mod8', module_type: 'workspace', app: 'A' }
    ]
  };
  var res = scanner.scanInstance(instance);
  assertEq(res.modules.legacy, 5, 'legacy modules count');
  assertEq(res.modules.modern, 3, 'modern modules count');
});

// ---------- SOP-005: Velocity Calculation — Multi-Window ----------
runScenario('SOP-005', 'Velocity Calculation — Multi-Window', function() {
  var engine = new UIMVTScoreEngine();
  var now = new Date();
  function d(daysAgo) {
    var dt = new Date(now);
    dt.setDate(dt.getDate() - daysAgo);
    return dt.toISOString();
  }
  var history = [
    { dateISO: d(84), legacyCount: 40 },
    { dateISO: d(28), legacyCount: 12 },
    { dateISO: d(7),  legacyCount: 5 },
    { dateISO: d(0),  legacyCount: 0 }
  ];
  var v = engine.calculateVelocity(history);
  assertEq(Math.round(v.v1w), 5, 'v1w');
  assertEq(Math.round(v.v4w), 3, 'v4w');
  // 40 / 12 ≈ 3.33
  assertEq(Math.round(v.v12w), 3, 'v12w');
});

// ---------- SOP-006: Predicted ETA — Stalled ----------
runScenario('SOP-006', 'Predicted ETA — Stalled', function() {
  var engine = new UIMVTScoreEngine();
  var eta = engine.predictETA(50, { v4w: 0 });
  assertEq(eta.text, 'Stalled — velocity zero', 'eta text stalled');
  assertEq(eta.date, null, 'eta date null');
});

// ---------- SOP-007: Predicted ETA — Regression ----------
runScenario('SOP-007', 'Predicted ETA — Regression', function() {
  var engine = new UIMVTScoreEngine();
  var eta = engine.predictETA(45, { v4w: -1.25 });
  assertContains(eta.text, 'Regression', 'eta text regression');
  assertEq(eta.date, null, 'eta date null on regression');
});

// ---------- SOP-008: Dashboard Export — HTML ----------
runScenario('SOP-008', 'Dashboard Export — HTML', function() {
  var scanner = new UIMVTScanner();
  var engine = new UIMVTScoreEngine();
  var renderer = new UIMVTDashboardRenderer();
  var instance = {
    forms: [
      { name: 'F1', legacy_client_scripts: ['cs'], app: 'A' },
      { name: 'F2', next_experience: true, app: 'A' },
      { name: 'F3', next_experience: true, app: 'A' },
      { name: 'F4', next_experience: true, app: 'A' }
    ]
  };
  var scan = scanner.scanInstance(instance);
  var score = engine.score(scan, []);
  var html = renderer.toHTML(score);
  assertContains(html, '<table>', 'has table');
  assertContains(html, '<thead>', 'has thead');
  assertContains(html, '<tbody>', 'has tbody');
  assertContains(html, 'velocity-4w', 'has velocity-4w div');
  if (html.indexOf('undefined') !== -1) {
    throw new Error('HTML contains "undefined" interpolation');
  }
});

// ---------- SOP-009: Dashboard Export — JSON ----------
runScenario('SOP-009', 'Dashboard Export — JSON', function() {
  var scanner = new UIMVTScanner();
  var engine = new UIMVTScoreEngine();
  var renderer = new UIMVTDashboardRenderer();
  var instance = {
    forms: [
      { name: 'F1', legacy_client_scripts: ['cs'], app: 'A' },
      { name: 'F2', next_experience: true, app: 'A' },
      { name: 'F3', next_experience: true, app: 'A' },
      { name: 'F4', next_experience: true, app: 'A' }
    ]
  };
  var scan = scanner.scanInstance(instance);
  var score = engine.score(scan, []);
  var json = renderer.toJSON(score);
  var obj = JSON.parse(json);
  assertEq(typeof obj.legacy, 'number', 'json legacy number');
  assertEq(typeof obj.modern, 'number', 'json modern number');
  assertEq(typeof obj.total, 'number', 'json total number');
  assertEq(typeof obj.velocity, 'object', 'json velocity object');
  assertEq(typeof obj.eta, 'object', 'json eta object');
  assertEq(typeof obj.timestamp, 'string', 'json timestamp string');
});

// ---------- SOP-010: Dashboard Export — CSV ----------
runScenario('SOP-010', 'Dashboard Export — CSV', function() {
  var renderer = new UIMVTDashboardRenderer();
  var score = {
    legacy: 10, modern: 90, total: 100,
    percentModern: 90.00, percentLegacy: 10.00,
    velocity: { v1w: 5.0, v4w: 5.0, v12w: 5.0 },
    eta: { text: '2026-08-01', date: '2026-08-01' },
    timestamp: '2026-05-01T00:00:00.000Z'
  };
  var csv = renderer.toCSV(score);
  var lines = csv.trim().split('\n');
  assertEq(lines.length, 2, 'csv line count');
  var header = lines[0];
  var data = lines[1];
  assertContains(header, 'legacy', 'csv header legacy');
  assertContains(data, '10', 'csv data legacy');
  assertContains(data, '2026-08-01', 'csv eta value');
  // RFC-4180 basic: commas delimit
  assertEq(data.split(',').length, header.split(',').length, 'csv column count consistency');
});

// ---------- SOP-011: Alert Firing — Threshold Breach ----------
runScenario('SOP-011', 'Alert Firing — Threshold Breach', function() {
  var engine = new UIMVTAlertEngine({ threshold: 30 });
  var score = { percentLegacy: 40 };
  assertEq(engine.shouldFire(score), true, 'shouldFire true');
  var alert = engine.buildAlert(score);
  assertEq(alert.fired, true, 'alert fired');
  assertEq(alert.payload.severity, 'warning', 'severity warning');
  assertContains(alert.payload.message, 'legacy threshold exceeded', 'message content');
});

// ---------- SOP-012: Empty Instance Handling ----------
runScenario('SOP-012', 'Empty Instance Handling', function() {
  var scanner = new UIMVTScanner();
  var engine = new UIMVTScoreEngine();
  var res = scanner.scanInstance({});
  assertEq(res.grandTotal, 0, 'grandTotal zero');
  var score = engine.score(res, []);
  assertEq(score.legacy, 0, 'score legacy zero');
  assertEq(score.modern, 0, 'score modern zero');
  assertEq(score.total, 0, 'score total zero');
  assertContains(score.eta.text, 'N/A', 'eta text empty');
});

// ---------- SOP-013: 100% Migrated Instance ----------
runScenario('SOP-013', '100% Migrated Instance', function() {
  var scanner = new UIMVTScanner();
  var engine = new UIMVTScoreEngine();
  var alertEngine = new UIMVTAlertEngine({ threshold: 30 });
  var instance = {
    forms: [
      { name: 'F1', next_experience: true, app: 'A' },
      { name: 'F2', next_experience: true, app: 'A' }
    ]
  };
  var res = scanner.scanInstance(instance);
  var score = engine.score(res, []);
  assertEq(score.legacy, 0, 'legacy 0');
  assertEq(score.modern, 2, 'modern 2');
  assertEq(score.percentModern, 100, 'percentModern 100');
  assertContains(score.eta.text, 'Migration complete', 'eta complete');
  assertEq(alertEngine.shouldFire(score), false, 'no alert on 100% modern');
});

// ---------- SOP-014: Mixed Scope ----------
runScenario('SOP-014', 'Mixed Scope — Some Apps Migrated, Others Not', function() {
  var scanner = new UIMVTScanner();
  var engine = new UIMVTScoreEngine();
  var instance = {
    forms: [
      { name: 'A1', next_experience: true, app: 'AppA' },
      { name: 'A2', next_experience: true, app: 'AppA' },
      { name: 'B1', legacy_client_scripts: ['cs'], app: 'AppB' },
      { name: 'B2', legacy_client_scripts: ['cs'], app: 'AppB' },
      { name: 'B3', legacy_client_scripts: ['cs'], app: 'AppB' }
    ]
  };
  var res = scanner.scanInstance(instance);
  var score = engine.score(res, []);
  assertEq(score.legacy, 3, 'overall legacy');
  assertEq(score.modern, 2, 'overall modern');
  assertEq(score.total, 5, 'overall total');
  assertEq(typeof score.apps, 'object', 'per-app breakdown exists');
  assertEq(score.apps['AppA'].modern, 2, 'AppA modern');
  assertEq(score.apps['AppB'].legacy, 3, 'AppB legacy');
});

// ---------- SOP-015: Invalid Alert Threshold Configuration ----------
runScenario('SOP-015', 'Invalid Alert Threshold Configuration', function() {
  function tryCreate(cfg) {
    return function() { new UIMVTAlertEngine(cfg); };
  }
  var threw = false;
  try { tryCreate({ threshold: -5 })(); } catch (e) { threw = true; assertEq(e.name, 'UIMVTAlertError', 'error name negative'); }
  assertEq(threw, true, 'negative threshold throws');

  threw = false;
  try { tryCreate({ threshold: 105 })(); } catch (e) { threw = true; assertEq(e.name, 'UIMVTAlertError', 'error name >100'); }
  assertEq(threw, true, '>100 threshold throws');

  threw = false;
  try { tryCreate({ threshold: 'abc' })(); } catch (e) { threw = true; assertEq(e.name, 'UIMVTAlertError', 'error name nan'); }
  assertEq(threw, true, 'non-numeric threshold throws');

  threw = false;
  try { tryCreate({ threshold: null })(); } catch (e) { threw = true; assertEq(e.name, 'UIMVTAlertError', 'error name null'); }
  assertEq(threw, true, 'null threshold throws');

  // Valid thresholds should not throw
  var e1 = new UIMVTAlertEngine({ threshold: 0 });
  assertEq(e1.threshold, 0, 'valid 0 accepted');
  var e2 = new UIMVTAlertEngine({ threshold: 50 });
  assertEq(e2.threshold, 50, 'valid 50 accepted');
  var e3 = new UIMVTAlertEngine({ threshold: 100 });
  assertEq(e3.threshold, 100, 'valid 100 accepted');
});

// ---------- Write execution log ----------
var logDir = path.join(__dirname, 'execution_history');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
var logFile = path.join(logDir, 'run_' + new Date().toISOString().replace(/[:.]/g, '-') + '.log');

var logLines = [];
logLines.push('UIMVT Test Execution Log');
logLines.push('Timestamp: ' + new Date().toISOString());
logLines.push('Scenarios defined: 14');
logLines.push('Passed: ' + passCount);
logLines.push('Failed: ' + failCount);
logLines.push('');
results.forEach(function(r) {
  logLines.push(r.status + ' | ' + r.id + ' | ' + r.name);
  if (r.error) logLines.push('  ERROR: ' + r.error.split('\n').slice(0,3).join(' | '));
});
logLines.push('');
logLines.push(passCount === 14 ? 'RESULT: ALL PASS' : 'RESULT: SOME FAILURES');

fs.writeFileSync(logFile, logLines.join('\n') + '\n', 'utf8');

log('');
log('Summary: ' + passCount + ' passed, ' + failCount + ' failed out of 14 scenarios.');
log('Log written to: ' + logFile);
if (failCount > 0) process.exit(1);
