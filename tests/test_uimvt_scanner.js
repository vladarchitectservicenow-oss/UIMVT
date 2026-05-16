/**
 * test_uimvt_scanner.js
 * Self-contained unit tests for UIMVTScanner using Node.js mocks.
 */
require('./sn_mocks.js');
require('../src/UIMVTScanner.js');

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

console.log('Running UIMVTScanner tests...\n');

test('Scanner initializes with defaults', function() {
    var s = new UIMVTScanner();
    assert.ok(Array.isArray(s.legacyIndicators));
    assert.ok(Array.isArray(s.modernIndicators));
    assert.ok(Array.isArray(s.tablesToScan));
    assert.strictEqual(s.results.length, 0);
});

test('Scanner.scan returns array for sys_ui_form', function() {
    var s = new UIMVTScanner();
    var res = s.scan('sys_ui_form', {limit: 10});
    assert.ok(Array.isArray(res));
    assert.ok(res.length > 0);
    res.forEach(function(r) {
        assert.ok(r.sys_id);
        assert.strictEqual(r.table, 'sys_ui_form');
        assert.ok(['legacy','modern','unknown'].indexOf(r.classification) !== -1);
        assert.ok(typeof r.confidence === 'number');
    });
});

test('Scanner classifies legacy form correctly', function() {
    var s = new UIMVTScanner();
    var res = s.scan('sys_ui_form', {limit: 10});
    var legacy = res.filter(function(r) { return r.classification === 'legacy'; });
    assert.ok(legacy.length >= 1);
    var found = legacy.some(function(r) { return r.name === 'legacy_form_incident'; });
    assert.ok(found, 'Expected legacy_form_incident to be classified legacy');
});

test('Scanner classifies modern workspace form', function() {
    var s = new UIMVTScanner();
    var res = s.scan('sys_ui_form', {limit: 10});
    var modern = res.filter(function(r) { return r.classification === 'modern'; });
    assert.ok(modern.length >= 1);
    var found = modern.some(function(r) { return r.name === 'next_experience_change'; });
    assert.ok(found, 'Expected next_experience_change to be classified modern');
});

test('Scanner.scanAll returns combined results', function() {
    var s = new UIMVTScanner();
    var res = s.scanAll({limit: 10});
    assert.ok(res.length > 0);
    var tables = {};
    res.forEach(function(r) { tables[r.table] = true; });
    assert.ok(Object.keys(tables).length >= 2, 'Expected multiple tables');
});

test('Scanner.getCounts matches result totals', function() {
    var s = new UIMVTScanner();
    s.scanAll({limit: 10});
    var counts = s.getCounts();
    assert.strictEqual(counts.legacy + counts.modern + counts.unknown, counts.total);
    assert.ok(typeof counts.legacy === 'number');
});

test('Scanner respects limit option', function() {
    var s = new UIMVTScanner();
    var res = s.scan('sys_ui_form', {limit: 1});
    assert.strictEqual(res.length, 1);
});

console.log('\n========================================');
console.log('Scanner Tests: ' + passed + ' passed, ' + failed + ' failed');
console.log('========================================');
if (failed > 0) process.exit(1);
