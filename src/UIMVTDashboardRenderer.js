/**
 * UIMVTDashboardRenderer.js
 * HTML, JSON, and CSV export renderer for migration score data.
 */
var UIMVTDashboardRenderer = Class.create();
UIMVTDashboardRenderer.prototype = {
    initialize: function(options) {
        this.options = options || {};
        this.title = this.options.title || 'UIMVT Migration Dashboard';
    },

    /**
     * Render data in the requested format.
     * @param {Object} data
     * @param {String} format - 'html' | 'json' | 'csv'
     * @return {String}
     */
    render: function(data, format) {
        if (!data) return '';
        switch (String(format).toLowerCase()) {
            case 'html': return this._toHtml(data);
            case 'json': return this._toJson(data);
            case 'csv': return this._toCsv(data);
            default: return this._toJson(data);
        }
    },

    _toHtml: function(data) {
        var rows = '';
        for (var key in data) {
            if (!data.hasOwnProperty(key)) continue;
            var val = data[key];
            if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
            rows += '  \u003ctr\u003e\u003ctd\u003e' + this._esc(String(key)) + '\u003c/td\u003e\u003ctd\u003e' + this._esc(String(val)) + '\u003c/td\u003e\u003c/tr\u003e\n';
        }
        var eta = (data.etaDays !== null) ? data.etaDays + ' days' : 'N/A';
        var bar = this._progressBar(data.percentComplete || 0);

        // Build a standalone widget HTML
        var html = '' +
            '\u003c!DOCTYPE html\u003e\n' +
            '\u003chtml\u003e\u003chead\u003e\u003cmeta charset="utf-8"\u003e\u003ctitle\u003e' + this._esc(this.title) + '\u003c/title\u003e\n' +
            '\u003cstyle\u003e' +
            'body{font-family:Arial,sans-serif;margin:20px;background:#f7f8fa}\n' +
            '.card{background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);padding:20px}\n' +
            'h2{margin-top:0;color:#1d1d1d}\n' +
            'table{border-collapse:collapse;width:100%;margin-top:12px}\n' +
            'td{border-bottom:1px solid #eaeaea;padding:10px}\n' +
            'td:first-child{font-weight:600;color:#555;width:40%}\n' +
            '.bar{background:#e9ecef;border-radius:4px;height:20px;overflow:hidden;margin-top:8px}\n' +
            '.bar-inner{background:linear-gradient(90deg,#4caf50,#8bc34a);height:100%;width:' + (data.percentComplete || 0) + '%}\n' +
            '\u003c/style\u003e\n' +
            '\u003c/head\u003e\u003cbody\u003e\n' +
            '\u003cdiv class="card"\u003e\n' +
            '  \u003ch2\u003e' + this._esc(this.title) + '\u003c/h2\u003e\n' +
            '  \u003cdiv class="bar"\u003e\u003cdiv class="bar-inner"\u003e\u003c/div\u003e\u003c/div\u003e\n' +
            '  \u003cdiv style="color:#666;font-size:12px;margin-top:4px"\u003eMigration: ' + (data.percentComplete || 0) + '% complete | ETA: ' + this._esc(eta) + ' | Velocity: ' + (data.velocity || 0) + '/day\u003c/div\u003e\n' +
            '  \u003ctable\u003e\n' + rows + '\u003c/table\u003e\n' +
            '\u003c/div\u003e\n' +
            '\u003c/body\u003e\u003c/html\u003e';
        return html;
    },

    _toJson: function(data) {
        return JSON.stringify(data, null, 2);
    },

    _toCsv: function(data) {
        var lines = [];
        lines.push('key,value');
        for (var key in data) {
            if (!data.hasOwnProperty(key)) continue;
            var val = data[key];
            if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
            lines.push(this._csvEsc(String(key)) + ',' + this._csvEsc(String(val)));
        }
        return lines.join('\n');
    },

    _esc: function(s) {
        return s.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
    },

    _csvEsc: function(s) {
        if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    },

    _progressBar: function(pct) {
        return pct + '%';
    },

    type: 'UIMVTDashboardRenderer'
};

if (typeof global !== 'undefined' && global) global.UIMVTDashboardRenderer = UIMVTDashboardRenderer;
