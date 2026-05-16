/**
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * UIMVTScoreEngine — Calculates migration %, velocity, predicted date.
 * Scope: x_uimvt
 */
var UIMVTScoreEngine = Class.create();
UIMVTScoreEngine.prototype = {
    initialize: function() {
        this.DEFAULT_ALERT_THRESHOLD = 2.0; // 2% per week
    },

    /**
     * Calculate score per app from scan data.
     * @param {Object} appData — per-app raw counts from UIMVTScanner
     * @param {Object} previous — previous scan record (for velocity)
     * @return {Object} enriched app score
     */
    calculateAppScore: function(appData, previous) {
        var total = appData.totalForms + appData.totalMacros;
        var legacy = appData.legacyForms + appData.legacyMacros + appData.awRefs;
        var migrated = total - legacy;
        var pct = total > 0 ? (migrated / total * 100) : 0;
        pct = Math.max(0, Math.min(100, pct));

        var velocity = 0;
        var daysSince = 7;
        if (previous) {
            var nowGS = new GlideDateTime();
            var prevGS = new GlideDateTime(previous.last_scan_date || nowGS);
            daysSince = gs.dateDiff(prevGS.getDisplayValue(), nowGS.getDisplayValue(), true) / 86400000;
            if (daysSince < 1) daysSince = 1;
            var prevPct = parseFloat(previous.migration_pct) || 0;
            velocity = ((pct - prevPct) / daysSince) * 7; // per week
        }

        var weeksRemaining = velocity > 0 ? (100 - pct) / velocity : 999;
        var predictedDate = null;
        if (velocity > 0 && weeksRemaining < 999) {
            var gdt = new GlideDateTime();
            gdt.addDays(Math.ceil(weeksRemaining * 7));
            predictedDate = gdt.getDisplayValueInternal().substring(0, 10);
        }

        return {
            app_scope: appData.app,
            app_name: appData.app,
            total_forms: appData.totalForms,
            migrated_forms: Math.max(0, migrated),
            migration_pct: parseFloat(pct.toFixed(2)),
            velocity_score: parseFloat(velocity.toFixed(2)),
            predicted_ready_date: predictedDate,
            alert_threshold: this.DEFAULT_ALERT_THRESHOLD,
            last_scan_date: new GlideDateTime().getDisplayValueInternal()
        };
    },

    /**
     * Check if velocity dropped below threshold.
     * @param {Object} score — current app score
     * @return {Object} { alert: boolean, reason: string }
     */
    checkAlert: function(score) {
        if (score.migration_pct >= 100) return { alert: false, reason: "Fully migrated." };
        if (score.velocity_score < score.alert_threshold) {
            return {
                alert: true,
                reason: "Velocity " + score.velocity_score + "%/wk below threshold " + score.alert_threshold + "%/wk."
            };
        }
        return { alert: false, reason: "Velocity acceptable." };
    },

    type: "UIMVTScoreEngine"
};
