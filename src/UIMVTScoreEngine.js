/*
  Copyright (c) 2026 Vladimir Kapustin. Licensed under AGPL-3.0.
  ServiceNow UI Migration Velocity Tracker (UIMVT)
  UIMVTScoreEngine.js — Velocity calculation and ETA prediction
*/

function UIMVTScoreEngine() {
  this.calculateVelocity = function(history) {
    // history: array of { dateISO: string, legacyCount: number }
    var now = new Date();
    var v1w = 0, v4w = 0, v12w = 0;

    if (!Array.isArray(history) || history.length === 0) {
      return { v1w: 0, v4w: 0, v12w: 0 };
    }

    function weeksAgo(n) {
      var d = new Date(now);
      d.setDate(d.getDate() - (n * 7));
      return d;
    }

    function countAtOrBefore(cutoff) {
      var candidate = null;
      for (var i = 0; i < history.length; i++) {
        var entryDate = new Date(history[i].dateISO);
        if (entryDate <= cutoff) {
          candidate = history[i];
        } else {
          break;
        }
      }
      return candidate ? candidate.legacyCount : (history[0] ? history[0].legacyCount : 0);
    }

    function countAtOrAfter(cutoff) {
      for (var i = history.length - 1; i >= 0; i--) {
        var entryDate = new Date(history[i].dateISO);
        if (entryDate >= cutoff) {
          return history[i].legacyCount;
        }
      }
      return history[history.length - 1] ? history[history.length - 1].legacyCount : 0;
    }

    var currentLegacy = countAtOrAfter(weeksAgo(52 * 10));
    var w1 = countAtOrBefore(weeksAgo(1));
    var w4 = countAtOrBefore(weeksAgo(4));
    var w12 = countAtOrBefore(weeksAgo(12));

    v1w = (w1 - currentLegacy) / 1.0;
    v4w = (w4 - currentLegacy) / 4.0;
    v12w = (w12 - currentLegacy) / 12.0;

    // Handle NaN / Infinity
    if (!isFinite(v1w)) v1w = 0;
    if (!isFinite(v4w)) v4w = 0;
    if (!isFinite(v12w)) v12w = 0;

    return { v1w: v1w, v4w: v4w, v12w: v12w };
  };

  this.predictETA = function(currentLegacy, velocity) {
    if (currentLegacy <= 0) {
      return { text: 'Migration complete', date: null };
    }
    var v = velocity && typeof velocity.v4w === 'number' ? velocity.v4w : 0;
    if (v === 0) {
      return { text: 'Stalled — velocity zero', date: null };
    }
    if (v < 0) {
      var weeksToDouble = Math.abs(currentLegacy / v);
      return {
        text: 'Regression — legacy count increasing (~' + Math.round(weeksToDouble) + ' weeks to double)',
        date: null
      };
    }
    var weeksRemaining = currentLegacy / v;
    var etaDate = new Date();
    etaDate.setDate(etaDate.getDate() + Math.round(weeksRemaining * 7));
    return {
      text: 'ETA ' + etaDate.toISOString().split('T')[0] + ' (' + Math.round(weeksRemaining) + ' weeks)',
      date: etaDate.toISOString()
    };
  };

  this.score = function(scanResult, history) {
    var legacy = scanResult.legacyTotal || 0;
    var modern = scanResult.modernTotal || 0;
    var total = legacy + modern;
    var velocity = this.calculateVelocity(history);
    var eta = this.predictETA(legacy, velocity);
    if (total === 0) {
      eta = { text: 'N/A — nothing to migrate', date: null };
    }
    var percentModern = total > 0 ? ((modern / total) * 100).toFixed(2) : '0.00';

    return {
      legacy: legacy,
      modern: modern,
      total: total,
      percentModern: parseFloat(percentModern),
      percentLegacy: parseFloat((100 - parseFloat(percentModern)).toFixed(2)),
      velocity: velocity,
      eta: eta,
      apps: scanResult.apps || {},
      timestamp: new Date().toISOString()
    };
  };
}

if (typeof exports !== 'undefined') {
  exports.UIMVTScoreEngine = UIMVTScoreEngine;
}
