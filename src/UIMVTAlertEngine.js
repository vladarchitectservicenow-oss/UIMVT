/*
  Copyright (c) 2026 Vladimir Kapustin. Licensed under AGPL-3.0.
  ServiceNow UI Migration Velocity Tracker (UIMVT)
  UIMVTAlertEngine.js — Threshold checks and alert firing
*/

function UIMVTAlertError(message) {
  this.name = 'UIMVTAlertError';
  this.message = message || 'Invalid alert configuration';
  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(this, UIMVTAlertError);
  }
}
UIMVTAlertError.prototype = Object.create(Error.prototype);
UIMVTAlertError.prototype.constructor = UIMVTAlertError;

function UIMVTAlertEngine(config) {
  var self = this;
  self._validateThreshold = function(threshold) {
    if (threshold === null || threshold === undefined) {
      throw new UIMVTAlertError('Threshold is required');
    }
    var t = parseFloat(threshold);
    if (isNaN(t)) {
      throw new UIMVTAlertError('Threshold must be numeric (got "' + String(threshold) + '")');
    }
    if (t < 0 || t > 100) {
      throw new UIMVTAlertError('Threshold must be between 0 and 100 (got ' + t + ')');
    }
    return t;
  };

  self.threshold = self._validateThreshold((config && config.threshold !== undefined) ? config.threshold : 30);
  self.severity = (config && config.severity) ? config.severity : 'warning';

  this.shouldFire = function(score) {
    if (!score || typeof score.percentLegacy !== 'number') {
      return false;
    }
    return score.percentLegacy > this.threshold;
  };

  this.buildAlert = function(score) {
    var fire = this.shouldFire(score);
    if (!fire) {
      return { fired: false, payload: null };
    }
    var payload = {
      severity: this.severity,
      threshold: this.threshold,
      actualLegacyPercent: score.percentLegacy,
      message: 'legacy threshold exceeded: ' + score.percentLegacy + '% > ' + this.threshold + '%',
      timestamp: new Date().toISOString()
    };
    return { fired: true, payload: payload };
  };
}

if (typeof exports !== 'undefined') {
  exports.UIMVTAlertEngine = UIMVTAlertEngine;
  exports.UIMVTAlertError = UIMVTAlertError;
}
