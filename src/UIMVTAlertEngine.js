/**
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * UIMVTAlertEngine — Threshold checks and event notifications.
 * Scope: x_uimvt
 */
var UIMVTAlertEngine = Class.create();
UIMVTAlertEngine.prototype = {
    initialize: function() {
        this.ALERT_EVENT_NAME = "x_uimvt.velocity_alert";
    },

    /**
     * Process all app scores and fire events for alerting apps.
     * @param {Array} appScores
     * @return {Array} alerts fired
     */
    processAlerts: function(appScores) {
        var fired = [];
        for (var i = 0; i < appScores.length; i++) {
            var score = appScores[i];
            var engine = new UIMVTScoreEngine();
            var check = engine.checkAlert(score);
            if (check.alert) {
                this._fireEvent(score, check.reason);
                fired.push({ app: score.app_scope, reason: check.reason });
            }
        }
        return fired;
    },

    _fireEvent: function(score, reason) {
        var p = {
            app_scope: score.app_scope,
            app_name: score.app_name,
            migration_pct: score.migration_pct,
            velocity_score: score.velocity_score,
            reason: reason
        };
        try {
            gs.eventQueue(this.ALERT_EVENT_NAME, null, JSON.stringify(p));
        } catch (e) {
            gs.warn("UIMVTAlertEngine: eventQueue failed — " + e.message);
        }
    },

    type: "UIMVTAlertEngine"
};
