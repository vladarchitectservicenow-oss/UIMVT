/**
 * test_uimvt_e2e.js
 * End-to-end test: Scanner → ScoreEngine → DashboardRenderer → AlertEngine
 */
require('./sn_mocks.js');
require('../src/UIMVTScanner.js');
require('../src/UIMVTScoreEngine.js');
require('../src/UIMVTDashboardRenderer.js');
require('../src/UIMVTAlertEngine.js');

var assert = require('assert');
var passed = 0;
var failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log('  PASS: ' + name);
    } catch(e) {
        failed++;
        console.log('  FAIL: ' + name + ' | ' + e.message);
    }
}

console.log('Running UIMVT E2E tests...\n');

test('Full pipeline produces score with metrics', function() {
    var scanner = new UIMVTScanner();
    var results = scanner.scanAll({limit: 100});
    var history = [
        {timestamp_ms: Date.now() - (2 * 24 * 60 * 60 * 1000), legacy_count: 5, modern_count: 7},
        {timestamp_ms: Date.now() - (1 * 24 * 60 * 60 * 1000), legacy_count: 4, modern_count: 8}
    ];
    var scoreEngine = new UIMVTScoreEngine({history: history});
    var score = scoreEngine.calculateMigrationScore(results, history);
    assert.ok(typeof score.percentComplete === 'number');
    assert.ok(typeof score.velocity === 'number');
    assert.ok(score.etaDays === null || typeof score.etaDays === 'number');
    assert.ok(typeof score.riskScore === 'number');
    assert.ok(score.legacyCount + score.modernCount + score.unknownCount === score.total);
});

test('DashboardRenderer outputs JSON', function() {
    var scanner = new UIMVTScanner();
    var results = scanner.scanAll({limit: 100});
    var scoreEngine = new UIMVTScoreEngine();
    var score = scoreEngine.calculateMigrationScore(results);
    var renderer = new UIMVTDashboardRenderer({title: 'Test Dashboard'});
    var jsonStr = renderer.render(score, 'json');
    var parsed = JSON.parse(jsonStr);
    assert.ok(typeof parsed.percentComplete === 'number');
});

test('DashboardRenderer outputs CSV', function() {
    var scanner = new UIMVTScanner();
    var results = scanner.scanAll({limit: 100});
    var scoreEngine = new UIMVTScoreEngine();
    var score = scoreEngine.calculateMigrationScore(results);
    var renderer = new UIMVTDashboardRenderer();
    var csv = renderer.render(score, 'csv');
    assert.ok(csv.indexOf('key,value') === 0);
    assert.ok(csv.indexOf('percentComplete') !== -1);
});

test('DashboardRenderer outputs HTML', function() {
    var scanner = new UIMVTScanner();
    var results = scanner.scanAll({limit: 100});
    var scoreEngine = new UIMVTScoreEngine();
    var score = scoreEngine.calculateMigrationScore(results);
    var renderer = new UIMVTDashboardRenderer({title: 'Migration Dashboard'});
    var html = renderer.render(score, 'html');
    assert.ok(html.indexOf('\u003c!DOCTYPE html\u003e') === 0 || html.indexOf('\u003chtml\u003e') !== -1);
    assert.ok(html.indexOf('Migration Dashboard') !== -1);
    assert.ok(html.indexOf('percentComplete') !== -1 || html.indexOf('PercentComplete') !== -1);
});

test('AlertEngine fires when risk exceeds threshold', function() {
    var alertEngine = new UIMVTAlertEngine({recipients: 'test@example.com'});
    var score = { percentComplete: 30, velocity: 2, riskScore: 85, timestamp: Date.now() };
    var result = alertEngine.evaluate(score, {maxRisk: 50});
    assert.strictEqual(result.alerted, true);
    assert.ok(result.eventsFired.length > 0);
    assert.ok(result.eventsFired[0].name === 'x_uimvt.risk_spike');
});

test('AlertEngine does not fire within thresholds', function() {
    var alertEngine = new UIMVTAlertEngine({recipients: 'test@example.com'});
    var score = { percentComplete: 70, velocity: 10, riskScore: 20, timestamp: Date.now() };
    var result = alertEngine.evaluate(score, {maxRisk: 80, minVelocity: 5});
    assert.strictEqual(result.alerted, false);
    assert.strictEqual(result.eventsFired.length, 0);
});

test('AlertEngine fires ETA slip when predicted exceeds target', function() {
    var alertEngine = new UIMVTAlertEngine({});
    var now = Date.now();
    var score = { percentComplete: 50, velocity: 10, riskScore: 20, etaDays: 30, timestamp: now };
    // target is 20 days from now; predicted is 30 days
    var targetDateMs = now + (20 * 24 * 60 * 60 * 1000);
    var result = alertEngine.evaluate(score, {targetDateMs: targetDateMs});
    assert.strictEqual(result.alerted, true);
    assert.ok(result.eventsFired.some(function(e) { return e.name === 'x_uimvt.eta_slip'; }));
});

test('AlertEngine logs event with payload', function() {
    var alertEngine = new UIMVTAlertEngine({});
    var score = { percentComplete: 0, velocity: 0, riskScore: 95, timestamp: Date.now() };
    var result = alertEngine.evaluate(score, {maxRisk: 80});
    assert.ok(result.eventsFired.length > 0);
    var evt = result.eventsFired[0];
    assert.ok(evt.sys_id);
    assert.ok(evt.message);
    assert.ok(evt.name);
});

test('ScoreEngine velocity uses history if available', function() {
    var history = [
        {timestamp_ms: Date.now() - (5 * 24 * 60 * 60 * 1000), legacy_count: 100, modern_count: 0},
        {timestamp_ms: Date.now() - (4 * 24 * 60 * 60 * 1000), legacy_count: 95, modern_count: 5},
        {timestamp_ms: Date.now() - (3 * 24 * 60 * 60 * 1000), legacy_count: 90, modern_count: 10},
        {timestamp_ms: Date.now() - (2 * 24 * 60 * 60 * 1000), legacy_count: 85, modern_count: 15},
        {timestamp_ms: Date.now() - (1 * 24 * 60 * 60 * 1000), legacy_count: 80, modern_count: 20}
    ];
    var scoreEngine = new UIMVTScoreEngine({history: history});
    var score = scoreEngine.calculateMigrationScore([], history);
    // Even with no current results, using history for regression returns some velocity
    assert.ok(typeof score.velocity === 'number');
    assert.ok(score.percentComplete === 0); // no current results
});

console.log('\n========================================');
console.log('E2E Tests: ' + passed + ' passed, ' + failed + ' failed');
console.log('========================================');
if (failed > 0) process.exit(1);
