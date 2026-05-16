/**
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * UIMVTScanner — Detects legacy UI references in forms, lists, macros, modules.
 * Scope: x_uimvt
 */
var UIMVTScanner = Class.create();
UIMVTScanner.prototype = {
    initialize: function() {
        this.LEGACY_INDICATORS = ["UI11", "UI15", "ui11", "ui15", "classic ui", "classic_ui"];
        this.AW_INDICATORS     = ["Agent Workspace", "agent_workspace", "awa", "awa_"];
        this.NE_INDICATORS     = ["UISection", "UI Builder", "uib", "next_experience", "workspace", "next experience"];
    },

    /**
     * Run full UI migration scan across the instance.
     * @return {Object} { totalForms, legacyForms, nextExperienceForms, legacyMacros, totalMacros, awRefs, perApp: {} }
     */
    runFullScan: function() {
        var perApp = {};
        var totals = {
            totalForms: 0,
            legacyForms: 0,
            nextExperienceForms: 0,
            legacyMacros: 0,
            totalMacros: 0,
            awRefs: 0,
            perApp: perApp
        };

        // Scan sys_ui_form
        this._scanTable("sys_ui_form", "view", perApp, totals, function(raw) {
            return this._classify(raw);
        }.bind(this));

        // Scan sys_ui_list
        this._scanTable("sys_ui_list", "view", perApp, totals, function(raw) {
            return this._classify(raw);
        }.bind(this));

        // Scan sys_ui_macro
        try {
            var mc = new GlideRecord("sys_ui_macro");
            mc.query();
            while (mc.next()) {
                totals.totalMacros++;
                var name = mc.getValue("name") || "";
                var xml = mc.getValue("xml") || "";
                var txt = (name + " " + xml).toLowerCase();
                if (this._containsAny(txt, this.AW_INDICATORS) || this._containsAny(txt, this.LEGACY_INDICATORS)) {
                    totals.legacyMacros++;
                }
                var app = mc.getValue("sys_scope") || "global";
                if (!perApp[app]) this._initApp(perApp, app);
                perApp[app].totalMacros++;
                if (this._containsAny(txt, this.AW_INDICATORS) || this._containsAny(txt, this.LEGACY_INDICATORS)) {
                    perApp[app].legacyMacros++;
                }
            }
        } catch (e) {}

        // Scan sys_ui_module for legacy module references
        try {
            var md = new GlideRecord("sys_ui_module");
            md.query();
            while (md.next()) {
                var url = (md.getValue("url") || "").toLowerCase();
                if (this._containsAny(url, ["ui11", "ui15", "classic"])) {
                    totals.awRefs++; // counting legacy UI navigation as AW-like
                }
            }
        } catch (e) {}

        return totals;
    },

    _scanTable: function(table, viewField, perApp, totals, classifierFn) {
        try {
            var gr = new GlideRecord(table);
            gr.query();
            while (gr.next()) {
                totals.totalForms++;
                var app = gr.getValue("sys_scope") || "global";
                if (!perApp[app]) this._initApp(perApp, app);
                perApp[app].totalForms++;

                var view = gr.getValue(viewField) || "";
                var cls = classifierFn(view);
                if (cls === "legacy") {
                    totals.legacyForms++;
                    perApp[app].legacyForms++;
                } else if (cls === "next_experience") {
                    totals.nextExperienceForms++;
                    perApp[app].nextExperienceForms++;
                }
            }
        } catch (e) {}
    },

    _initApp: function(perApp, app) {
        perApp[app] = {
            app: app,
            totalForms: 0,
            legacyForms: 0,
            nextExperienceForms: 0,
            legacyMacros: 0,
            totalMacros: 0,
            awRefs: 0
        };
    },

    _classify: function(viewName) {
        var v = (viewName || "").toLowerCase();
        if (this._containsAny(v, this.NE_INDICATORS)) return "next_experience";
        if (this._containsAny(v, this.LEGACY_INDICATORS) || this._containsAny(v, this.AW_INDICATORS)) return "legacy";
        return "unknown";
    },

    _containsAny: function(text, arr) {
        for (var i = 0; i < arr.length; i++) {
            if (text.indexOf(arr[i].toLowerCase()) >= 0) return true;
        }
        return false;
    },

    type: "UIMVTScanner"
};
