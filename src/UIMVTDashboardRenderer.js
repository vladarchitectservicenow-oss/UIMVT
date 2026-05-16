/*
  Copyright (c) 2026 Vladimir Kapustin. Licensed under AGPL-3.0.
  ServiceNow UI Migration Velocity Tracker (UIMVT)
  UIMVTDashboardRenderer.js — HTML/JSON/CSV export
*/

function UIMVTDashboardRenderer() {
  this.escapeHtml = function(text) {
    if (text == null) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  this.toHTML = function(score) {
    var s = score || {};
    var html = '<!DOCTYPE html>\n<html>\n<head>\n';
    html += '  <meta charset="UTF-8">\n';
    html += '  <title>UIMVT Dashboard</title>\n';
    html += '</head>\n<body>\n';
    html += '  <h1>UI Migration Velocity Tracker</h1>\n';
    html += '  <div class="summary">\n';
    html += '    <table>\n';
    html += '      <thead>\n';
    html += '        <tr><th>Metric</th><th>Value</th></tr>\n';
    html += '      </thead>\n';
    html += '      <tbody>\n';
    html += '        <tr><td>Legacy Artifacts</td><td>' + this.escapeHtml(s.legacy) + '</td></tr>\n';
    html += '        <tr><td>Modern Artifacts</td><td>' + this.escapeHtml(s.modern) + '</td></tr>\n';
    html += '        <tr><td>Total</td><td>' + this.escapeHtml(s.total) + '</td></tr>\n';
    html += '        <tr><td>% Modern</td><td>' + this.escapeHtml(s.percentModern) + '%</td></tr>\n';
    html += '        <tr><td>1-Week Velocity</td><td>' + this.escapeHtml(s.velocity && s.velocity.v1w) + '</td></tr>\n';
    html += '        <tr><td>4-Week Velocity</td><td>' + this.escapeHtml(s.velocity && s.velocity.v4w) + '</td></tr>\n';
    html += '        <tr><td>12-Week Velocity</td><td>' + this.escapeHtml(s.velocity && s.velocity.v12w) + '</td></tr>\n';
    html += '        <tr><td>ETA</td><td>' + this.escapeHtml(s.eta && s.eta.text) + '</td></tr>\n';
    html += '      </tbody>\n';
    html += '    </table>\n';
    html += '  </div>\n';
    html += '  <div class="velocity-4w" data-value="' + this.escapeHtml(s.velocity && s.velocity.v4w) + '"></div>\n';
    html += '  <div class="timestamp">Generated ' + this.escapeHtml(s.timestamp) + '</div>\n';
    html += '</body>\n</html>\n';
    return html;
  };

  this.toJSON = function(score) {
    var s = JSON.parse(JSON.stringify(score));
    var out = {
      legacy: s.legacy,
      modern: s.modern,
      total: s.total,
      percentModern: s.percentModern,
      percentLegacy: s.percentLegacy,
      velocity: s.velocity,
      eta: s.eta,
      apps: s.apps,
      timestamp: s.timestamp
    };
    return JSON.stringify(out, null, 2);
  };

  this.toCSV = function(score) {
    var s = score || {};
    var rows = [];
    rows.push(['legacy','modern','total','percentModern','v1w','v4w','v12w','eta','timestamp']);
    rows.push([
      s.legacy,
      s.modern,
      s.total,
      s.percentModern,
      s.velocity ? s.velocity.v1w : '',
      s.velocity ? s.velocity.v4w : '',
      s.velocity ? s.velocity.v12w : '',
      s.eta ? s.eta.text : '',
      s.timestamp
    ]);

    function escapeCSV(val) {
      if (val == null) return '';
      var str = String(val);
      if (str.indexOf(',') !== -1 || str.indexOf('"') !== -1 || str.indexOf('\n') !== -1) {
        str = '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }

    return rows.map(function(r) { return r.map(escapeCSV).join(','); }).join('\n') + '\n';
  };
}

if (typeof exports !== 'undefined') {
  exports.UIMVTDashboardRenderer = UIMVTDashboardRenderer;
}
