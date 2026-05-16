/**
 * Self-contained Node.js mocks for ServiceNow GlideRecord and related globals.
 * This file is loaded by the test scripts to simulate a ServiceNow server-side
 * environment without needing an actual instance.
 */

// Ensure global namespace exists
global.gs = {
    getProperty: function(key, def) { return def; }
};

global.GlideRecord = function(tableName) {
    this.tableName = tableName;
    this.records = [];
    this.index = -1;
    this.queries = [];
    this.limit = 10000;
    this.orderByField = null;
    this.orderDesc = false;
    this.validFields = new Set(['sys_id','name','script','macro','link_type','sys_scope','sys_updated_on','sys_updated_by','sys_created_on']);
    // Pre-populate a small set of mock records per table
    this._init(tableName);
};

// Static registry for test visibility
GlideRecord.registry = {};

GlideRecord.prototype._init = function(tableName) {
    // Seed data based on table
    var now = new Date();
    var iso = now.toISOString();
    var seeds = {
        sys_ui_form: [
            {sys_id:'form1',name:'legacy_form_incident',script:'// v1 dojo',sys_scope:'global',sys_updated_on:iso,sys_updated_by:'admin'},
            {sys_id:'form2',name:'next_experience_change',script:'',sys_scope:'global',sys_updated_on:iso,sys_updated_by:'admin'},
            {sys_id:'form3',name:'standard_incident',script:'// some script',sys_scope:'global',sys_updated_on:iso,sys_updated_by:'admin'}
        ],
        sys_ui_list: [
            {sys_id:'list1',name:'legacy_list_user',script:'ui16 dojo',sys_scope:'global',sys_updated_on:iso,sys_updated_by:'admin'},
            {sys_id:'list2',name:'workspace_list_task',script:'workspace',sys_scope:'global',sys_updated_on:iso,sys_updated_by:'admin'},
            {sys_id:'list3',name:'regular_task_list',script:'',sys_scope:'global',sys_updated_on:iso,sys_updated_by:'admin'}
        ],
        sys_ui_macro: [
            {sys_id:'macro1',name:'legacy_macro_nav',macro:'<div class="legacy">',sys_scope:'global',sys_updated_on:iso,sys_updated_by:'admin'},
            {sys_id:'macro2',name:'modern_macro_header',macro:'<now-experience-header>',sys_scope:'global',sys_updated_on:iso,sys_updated_by:'admin'},
            {sys_id:'macro3',name:'macro_simple',macro:'',sys_scope:'global',sys_updated_on:iso,sys_updated_by:'admin'}
        ],
        sys_app_module: [
            {sys_id:'mod1',name:'Legacy Reports',link_type:'url',sys_scope:'global',sys_updated_on:iso,sys_updated_by:'admin'},
            {sys_id:'mod2',name:'Workspace Dashboard',link_type:'new',sys_scope:'global',sys_updated_on:iso,sys_updated_by:'admin'},
            {sys_id:'mod3',name:'Settings',link_type:'LIST',sys_scope:'global',sys_updated_on:iso,sys_updated_by:'admin'}
        ]
    };
    this.records = seeds[tableName] || [];
    // Build registry
    if (!GlideRecord.registry[tableName]) GlideRecord.registry[tableName] = [];
    GlideRecord.registry[tableName] = this.records.slice();
};

GlideRecord.prototype.addQuery = function(field, op, val) {
    this.queries.push({field: field, op: op, val: val});
};

GlideRecord.prototype.orderByDesc = function(field) {
    this.orderByField = field;
    this.orderDesc = true;
};

GlideRecord.prototype.orderBy = function(field) {
    this.orderByField = field;
    this.orderDesc = false;
};

GlideRecord.prototype.setLimit = function(n) {
    this.limit = n;
};

GlideRecord.prototype.query = function() {
    this.index = -1;
    // Apply queries
    this.records = (GlideRecord.registry[this.tableName] || []).slice();
    for (var i = 0; i < this.queries.length; i++) {
        var q = this.queries[i];
        this.records = this.records.filter(function(r){
            var rv = String(r[q.field]||'');
            if (q.op ==='>=') return rv >= q.val;
            if (q.op ==='<=') return rv <= q.val;
            if (q.op ==='>') return rv > q.val;
            if (q.op ==='<') return rv < q.val;
            return rv === q.val;
        });
    }
    if (this.limit < this.records.length) {
        this.records = this.records.slice(0, this.limit);
    }
    return this;
};

GlideRecord.prototype.next = function() {
    this.index++;
    if (this.index < this.records.length) {
        // copy current record fields onto this
        var rec = this.records[this.index];
        for (var k in rec) {
            if (rec.hasOwnProperty(k)) this[k] = rec[k];
        }
        return true;
    }
    return false;
};

GlideRecord.prototype.getUniqueValue = function() {
    return this['sys_id'] || null;
};

GlideRecord.prototype.getValue = function(field) {
    return this[field] || '';
};

GlideRecord.prototype.getDisplayValue = function(field) {
    return this[field] || '';
};

GlideRecord.prototype.isValidField = function(field) {
    return this.validFields.has(field);
};

GlideRecord.prototype.initialize = function() {
    this._newRecord = {};
    for (var i = 0; i < arguments.length; i++) {
        var arg = arguments[i];
        if (typeof arg === 'object') {
            for (var k in arg) { if (arg.hasOwnProperty(k)) this[k] = arg[k]; }
        }
    }
};

GlideRecord.prototype.insert = function() {
    var sys_id = 'sys_' + Math.random().toString(36).slice(2);
    this._newRecord = {};
    this._newRecord.sys_id = sys_id;
    for (var k in this) {
        if (this.hasOwnProperty(k) && !/^(tableName|records|index|queries|limit|orderByField|orderDesc|validFields)$/.test(k)) {
            this._newRecord[k] = this[k];
        }
    }
    if (!GlideRecord.registry[this.tableName]) GlideRecord.registry[this.tableName] = [];
    GlideRecord.registry[this.tableName].push(this._newRecord);
    // Expose sys_id on the record object for getUniqueValue
    this.sys_id = sys_id;
    return sys_id;
};

// Minimal sn_ws mock
if (!global.sn_ws) {
    global.sn_ws = {};
}
var _RM = function(){ this.body = ''; };
_RM.prototype.setEndpoint = function(){};
_RM.prototype.setHttpMethod = function(){};
_RM.prototype.setRequestHeader = function(){};
_RM.prototype.setRequestBody = function(){};
_RM.prototype.execute = function(){ return { getStatusCode: function(){ return 200; } }; };
sn_ws.RESTMessageV2 = _RM;

// Minimal Class.create pattern used in ServiceNow
if (!global.Class) {
    global.Class = {
        create: function() {
            var F = function(){ this.initialize && this.initialize.apply(this, arguments); };
            for (var i = 0; i < arguments.length; i++) {
                var obj = arguments[i];
                for (var k in obj) { if (obj.hasOwnProperty(k)) F.prototype[k] = obj[k]; }
            }
            return F;
        }
    };
}

// Minimal JSON fallback
