/**
 * UIMVTScanner.js
 * Detects legacy vs modern UI assets in ServiceNow.
 * Scans forms, lists, UI macros, and application modules.
 */
var UIMVTScanner = Class.create();
UIMVTScanner.prototype = {
    initialize: function(options) {
        this.options = options || {};
        this.legacyIndicators = this.options.legacyIndicators || [
            'legacy_form', 'legacy_list', 'v1', 'dojo', 'ui16'
        ];
        this.modernIndicators = this.options.modernIndicators || [
            'workspace', 'next_experience', 'now_experience', 'polaris', 'uitab'
        ];
        this.tablesToScan = [
            'sys_ui_form',
            'sys_ui_list',
            'sys_ui_macro',
            'sys_app_module'
        ];
        this.results = [];
    },

    /**
     * Scans a specific table for legacy/modern UI assets.
     * @param {String} tableName - The table to scan
     * @param {Object} opts - query options: scope, dateFilter, limit
     * @return {Array} asset records with classification
     */
    scan: function(tableName, opts) {
        opts = opts || {};
        var gr = new GlideRecord(tableName);
        var limit = opts.limit || 10000;
        if (opts.scope) {
            gr.addQuery('sys_scope', opts.scope);
        }
        if (opts.dateFilter) {
            gr.addQuery('sys_updated_on', '>=', opts.dateFilter);
        }
        // Order by sys_updated_on descending for recency
        gr.orderByDesc('sys_updated_on');
        gr.setLimit(limit);
        gr.query();

        var assets = [];
        while (gr.next()) {
            var classification = this._classifyRecord(tableName, gr);
            var confidence = classification.confidence;
            assets.push({
                sys_id: gr.getUniqueValue(),
                table: tableName,
                name: gr.getDisplayValue('name') || gr.getValue('name') || '(unnamed)',
                type: this._resolveType(tableName, gr),
                classification: classification.type,
                confidence: confidence,
                updated_on: gr.getValue('sys_updated_on'),
                updated_by: gr.getValue('sys_updated_by')
            });
        }
        return assets;
    },

    /**
     * Scans all configured tables.
     * @param {Object} opts - query options
     * @return {Array} combined results
     */
    scanAll: function(opts) {
        opts = opts || {};
        var all = [];
        for (var i = 0; i < this.tablesToScan.length; i++) {
            var tableName = this.tablesToScan[i];
            var tableResults = this.scan(tableName, opts);
            all = all.concat(tableResults);
        }
        this.results = all;
        return all;
    },

    /**
     * Count legacy and modern assets from current results.
     * @return {Object} counts
     */
    getCounts: function() {
        var legacy = 0, modern = 0, unknown = 0;
        for (var i = 0; i < this.results.length; i++) {
            var r = this.results[i];
            if (r.classification === 'legacy') legacy++;
            else if (r.classification === 'modern') modern++;
            else unknown++;
        }
        return {
            legacy: legacy,
            modern: modern,
            unknown: unknown,
            total: this.results.length
        };
    },

    _resolveType: function(tableName, gr) {
        if (tableName === 'sys_ui_form') return 'form';
        if (tableName === 'sys_ui_list') return 'list';
        if (tableName === 'sys_ui_macro') return 'macro';
        if (tableName === 'sys_app_module') return 'module';
        return 'unknown';
    },

    _classifyRecord: function(tableName, gr) {
        var scoreLegacy = 0;
        var scoreModern = 0;
        var totalChecks = 0;

        // Check name field
        var name = (gr.getValue('name') || '').toLowerCase();
        for (var i = 0; i < this.legacyIndicators.length; i++) {
            if (name.indexOf(this.legacyIndicators[i]) !== -1) scoreLegacy++;
            totalChecks++;
        }
        for (var j = 0; j < this.modernIndicators.length; j++) {
            if (name.indexOf(this.modernIndicators[j]) !== -1) scoreModern++;
            totalChecks++;
        }

        // Check script/macros for legacy patterns
        var script = '';
        if (gr.isValidField('script')) {
            script = (gr.getValue('script') || '').toLowerCase();
        } else if (gr.isValidField('macro')) {
            script = (gr.getValue('macro') || '').toLowerCase();
        }
        for (var k = 0; k < this.legacyIndicators.length; k++) {
            if (script.indexOf(this.legacyIndicators[k]) !== -1) scoreLegacy += 2; // script weight
            totalChecks++;
        }
        for (var m = 0; m < this.modernIndicators.length; m++) {
            if (script.indexOf(this.modernIndicators[m]) !== -1) scoreModern += 2;
            totalChecks++;
        }

        // Check args / link for module-level hints
        var link = '';
        if (gr.isValidField('link_type')) {
            link = (gr.getValue('link_type') || '').toLowerCase();
            if (link === 'url' || link === 'direct') {
                // These may be legacy external links
                scoreLegacy++;
                totalChecks++;
            }
            if (link === 'new') {
                scoreModern++;
                totalChecks++;
            }
        }

        var diff = scoreModern - scoreLegacy;
        var confidence = totalChecks === 0 ? 0 : (Math.abs(diff) / totalChecks);
        // clamp confidence 0-1
        if (confidence > 1) confidence = 1;
        if (confidence < 0) confidence = 0;

        if (scoreModern > scoreLegacy) {
            return {type: 'modern', confidence: confidence};
        } else if (scoreLegacy > scoreModern) {
            return {type: 'legacy', confidence: confidence};
        }
        return {type: 'unknown', confidence: 0};
    },

    type: 'UIMVTScanner'
};

if (typeof global !== 'undefined' && global) global.UIMVTScanner = UIMVTScanner;
