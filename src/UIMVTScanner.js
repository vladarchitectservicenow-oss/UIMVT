/*
  Copyright (c) 2026 Vladimir Kapustin. Licensed under AGPL-3.0.
  ServiceNow UI Migration Velocity Tracker (UIMVT)
  UIMVTScanner.js — Detect legacy vs modern UI artifacts
*/

function UIMVTScanner() {
  this.detectForm = function(form) {
    if (!form) return null;
    var isModern = false;
    if (form.next_experience === true || form.ui_type === 'next_experience' || form.hasDeclarativeActions === true) {
      isModern = true;
    }
    if (form.legacy_client_scripts && form.legacy_client_scripts.length > 0) {
      isModern = false;
    }
    return isModern ? 'modern' : 'legacy';
  };

  this.detectList = function(list) {
    if (!list) return null;
    var isModern = false;
    if (list.unified_filters === true || list.workspace_list === true || list.list_type === 'workspace') {
      isModern = true;
    }
    if (list.legacy_related_list === true || list.list_control === 'legacy') {
      isModern = false;
    }
    return isModern ? 'modern' : 'legacy';
  };

  this.detectMacro = function(macro) {
    if (!macro) return null;
    var isModern = false;
    if (macro.type === 'web_component' || macro.type === 'agent_workspace_component' || macro.framework === 'now') {
      isModern = true;
    }
    if (macro.jelly_script === true || macro.widget_type === 'legacy_homepage') {
      isModern = false;
    }
    return isModern ? 'modern' : 'legacy';
  };

  this.detectModule = function(mod) {
    if (!mod) return null;
    var isModern = false;
    if (mod.navigation_type === 'workspace' || mod.app_engine === true || mod.module_type === 'workspace') {
      isModern = true;
    }
    if (mod.url && mod.url.indexOf('sys_ui_page') !== -1 && !mod.workspace_mapped) {
      isModern = false;
    }
    if (mod.legacy_url === true) {
      isModern = false;
    }
    return isModern ? 'modern' : 'legacy';
  };

  this.scanInstance = function(instance) {
    var result = {
      forms: { legacy: 0, modern: 0, total: 0, items: [] },
      lists: { legacy: 0, modern: 0, total: 0, items: [] },
      macros: { legacy: 0, modern: 0, total: 0, items: [] },
      modules: { legacy: 0, modern: 0, total: 0, items: [] },
      apps: {},
      timestamp: new Date().toISOString()
    };

    var self = this;
    var apps = {};

    function incApp(appName, kind, type) {
      if (!appName) appName = 'global';
      if (!apps[appName]) {
        apps[appName] = { legacy: 0, modern: 0, total: 0 };
      }
      apps[appName][kind]++;
      apps[appName].total++;
    }

    if (instance && Array.isArray(instance.forms)) {
      instance.forms.forEach(function(f) {
        var kind = self.detectForm(f);
        if (!kind) return;
        result.forms[kind]++;
        result.forms.total++;
        result.forms.items.push({ name: f.name || 'unknown', kind: kind });
        incApp(f.app, kind, 'form');
      });
    }

    if (instance && Array.isArray(instance.lists)) {
      instance.lists.forEach(function(l) {
        var kind = self.detectList(l);
        if (!kind) return;
        result.lists[kind]++;
        result.lists.total++;
        result.lists.items.push({ name: l.name || 'unknown', kind: kind });
        incApp(l.app, kind, 'list');
      });
    }

    if (instance && Array.isArray(instance.macros)) {
      instance.macros.forEach(function(m) {
        var kind = self.detectMacro(m);
        if (!kind) return;
        result.macros[kind]++;
        result.macros.total++;
        result.macros.items.push({ name: m.name || 'unknown', kind: kind });
        incApp(m.app, kind, 'macro');
      });
    }

    if (instance && Array.isArray(instance.modules)) {
      instance.modules.forEach(function(mod) {
        var kind = self.detectModule(mod);
        if (!kind) return;
        result.modules[kind]++;
        result.modules.total++;
        result.modules.items.push({ name: mod.name || 'unknown', kind: kind });
        incApp(mod.app, kind, 'module');
      });
    }

    result.legacyTotal = result.forms.legacy + result.lists.legacy + result.macros.legacy + result.modules.legacy;
    result.modernTotal = result.forms.modern + result.lists.modern + result.macros.modern + result.modules.modern;
    result.grandTotal = result.legacyTotal + result.modernTotal;
    result.apps = apps;
    return result;
  };
}

if (typeof exports !== 'undefined') {
  exports.UIMVTScanner = UIMVTScanner;
}
