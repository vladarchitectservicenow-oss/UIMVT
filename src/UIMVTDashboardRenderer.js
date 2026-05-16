/**
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * UIMVTDashboardRenderer — HTML / JSON / CSV exports for migration velocity.
 * Scope: x_uimvt
 */
var UIMVTDashboardRenderer = Class.create();
UIMVTDashboardRenderer.prototype = {
    initialize: function() {
        this.version = "1.0.0";
    },

    generateHTML: function(snapshot, appScores) {
        var sb = [];
        sb.push("<h1>UI Migration Velocity Tracker — Australia Readiness</h1>");
        sb.push("<p><strong>Instance:</strong> " + snapshot.instance_name + " | <strong>Scan:</strong> " + snapshot.scan_date + "</p>");
        sb.push("<p><strong>Total Forms:</strong> " + snapshot.total_forms + " | <strong>Legacy:</strong> " + snapshot.legacy_forms + " | <strong>Next Experience:</strong> " + snapshot.next_experience_forms + "</p>");
        sb.push("<hr><h2>Per-Application Migration Status</h2><table border='1' cellpadding='6'>");
        sb.push("<th>App</th><th>Total</th><th>Migrated</th><th>%</th><th>Velocity/wk</th><th>Ready Date</th><th>Alert</th>");
        for (var i = 0; i < appScores.length; i++) {
            var a = appScores[i];
            var color = a.migration_pct >= 100 ? "green" : (a.migration_pct >= 50 ? "orange" : "red");
            var alertTxt = a.alert ? "⚠️" : "✅";
            sb.push("<tr><td>" + a.app_name + "</td><td>" + a.total_forms + "</td><td>" + a.migrated_forms + "</td><td style='color:" + color + "'>" + a.migration_pct + "%</td><td>" + a.velocity_score + "%</td><td>" + (a.predicted_ready_date || "N/A") + "</td><td>" + alertTxt + "</td></tr>");
        }
        sb.push("</table>");
        return sb.join("");
    },

    generateJSON: function(snapshot, appScores) {
        return JSON.stringify({
            version: this.version,
            instance: snapshot.instance_name,
            scan_date: snapshot.scan_date,
            totals: {
                total_forms: snapshot.total_forms,
                legacy_forms: snapshot.legacy_forms,
                next_experience_forms: snapshot.next_experience_forms,
                legacy_macros: snapshot.legacy_ui_macros,
                total_macros: snapshot.total_ui_macros,
                agent_workspace_refs: snapshot.agent_workspace_refs
            },
            apps: appScores
        });
    },

    generateCSV: function(appScores) {
        var lines = ["App,TotalForms,MigratedForms,MigrationPct,VelocityWeekly,PredictedReadyDate,Alert"];
        for (var i = 0; i < appScores.length; i++) {
            var a = appScores[i];
            lines.push([a.app_name, a.total_forms, a.migrated_forms, a.migration_pct, a.velocity_score, a.predicted_ready_date || "N/A", a.alert ? "YES" : "NO"].join(","));
        }
        return lines.join("\n");
    },

    type: "UIMVTDashboardRenderer"
};
