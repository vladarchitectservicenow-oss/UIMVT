/**
 * UIMVTScoreEngine.js
 * Calculates migration percentage, velocity, and predicted ETA.
 */
var UIMVTScoreEngine = Class.create();
UIMVTScoreEngine.prototype = {
    initialize: function(options) {
        this.options = options || {};
        this.history = this.options.history || [];
    },

    /**
     * Calculate migration score from scan results and optional history.
     * @param {Array} scanResults - results from UIMVTScanner
     * @param {Array} history - prior snapshots [ { timestamp_ms, legacy_count, modern_count } ]
     * @return {Object} score with percentComplete, velocity, eta, riskScore
     */
    calculateMigrationScore: function(scanResults, history) {
        if (!scanResults || scanResults.length === 0) {
            return {
                percentComplete: 0,
                velocity: 0,
                etaDays: null,
                riskScore: 0,
                legacyCount: 0,
                modernCount: 0,
                total: 0
            };
        }

        // Counts
        var legacyCount = 0;
        var modernCount = 0;
        var unknownCount = 0;
        for (var i = 0; i < scanResults.length; i++) {
            var r = scanResults[i];
            if (r.classification === 'legacy') legacyCount++;
            else if (r.classification === 'modern') modernCount++;
            else unknownCount++;
        }
        var total = scanResults.length;
        var percentComplete = total === 0 ? 0 : ((modernCount / total) * 100);

        // Velocity (assets migrated per day) using linear regression over history
        var velocity = this._calculateVelocity(history, legacyCount, modernCount);

        // ETA in days: remainingLegacy / velocity
        var remainingLegacy = legacyCount;
        var etaDays = null;
        if (velocity > 0 && remainingLegacy > 0) {
            etaDays = remainingLegacy / velocity;
        } else if (remainingLegacy === 0) {
            etaDays = 0;
        }

        // Risk score: concentration of legacy in critical tables (forms + lists)
        var criticalLegacy = 0;
        var criticalTotal = 0;
        for (var j = 0; j < scanResults.length; j++) {
            var s = scanResults[j];
            if (s.type === 'form' || s.type === 'list') {
                criticalTotal++;
                if (s.classification === 'legacy') criticalLegacy++;
            }
        }
        var riskScore = criticalTotal === 0 ? 0 : ((criticalLegacy / criticalTotal) * 100);

        return {
            percentComplete: parseFloat(percentComplete.toFixed(2)),
            velocity: parseFloat(velocity.toFixed(2)),
            etaDays: etaDays !== null ? parseFloat(etaDays.toFixed(2)) : null,
            riskScore: parseFloat(riskScore.toFixed(2)),
            legacyCount: legacyCount,
            modernCount: modernCount,
            unknownCount: unknownCount,
            total: total,
            timestamp: new Date().getTime()
        };
    },

    _calculateVelocity: function(history, currentLegacy, currentModern) {
        if (!history || history.length < 2) {
            // Fallback: estimate 1 legacy/day minimal default
            return 0;
        }

        // Append current point implicitly by using the latest history point as baseline
        // Actually use history array directly for regression
        var n = history.length;
        var sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (var i = 0; i < n; i++) {
            var h = history[i];
            // x = time in days from first snapshot
            var x = (h.timestamp_ms - history[0].timestamp_ms) / (1000 * 60 * 60 * 24); // days
            var total = h.legacy_count + h.modern_count;
            // y = percent modern
            var y = total === 0 ? 0 : (h.modern_count / total * 100);
            sumX += x;
            sumY += y;
            sumXY += (x * y);
            sumXX += (x * x);
        }

        var denominator = (n * sumXX) - (sumX * sumX);
        if (denominator === 0) return 0;

        var slope = ((n * sumXY) - (sumX * sumY)) / denominator; // percent change per day

        // Convert slope to assets migrated per day
        // Estimate total assets using last history total to avoid depending on current
        var last = history[n - 1];
        var estimatedTotal = last.legacy_count + last.modern_count;
        var assetsPerDay = (slope / 100) * estimatedTotal;

        return isFinite(assetsPerDay) ? assetsPerDay : 0;
    },

    type: 'UIMVTScoreEngine'
};

if (typeof global !== 'undefined' && global) global.UIMVTScoreEngine = UIMVTScoreEngine;
