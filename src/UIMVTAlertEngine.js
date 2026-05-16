/**
 * UIMVTAlertEngine.js
 * Threshold checking and event firing for migration metrics.
 */
var UIMVTAlertEngine = Class.create();
UIMVTAlertEngine.prototype = {
    initialize: function(options) {
        this.options = options || {};
        this.recipients = this.options.recipients || '';
        this.webhookUrl = this.options.webhookUrl || '';
    },

    /**
     * Evaluate score against thresholds and fire alerts if breached.
     * @param {Object} score - from UIMVTScoreEngine
     * @param {Object} thresholds - { minVelocity, maxRisk, targetDateMs }
     * @return {Object} {alerted: Boolean, eventsFired: Array, details: String}
     */
    evaluate: function(score, thresholds) {
        score = score || {};
        thresholds = thresholds || {};
        var events = [];
        var alerted = false;
        var detailsParts = [];

        var velocity = parseFloat(score.velocity) || 0;
        var riskScore = parseFloat(score.riskScore) || 0;
        var etaDays = score.etaDays !== null ? parseFloat(score.etaDays) : null;
        var ts = score.timestamp || new Date().getTime();

        // Velocity Drop Alert
        if (typeof thresholds.minVelocity === 'number') {
            if (velocity < thresholds.minVelocity) {
                alerted = true;
                var msg = 'Velocity dropped below threshold: ' + velocity + ' < ' + thresholds.minVelocity;
                events.push(this._fireEvent('x_uimvt.velocity_drop', msg, score));
                detailsParts.push(msg);
            }
        }

        // Risk Spike Alert
        if (typeof thresholds.maxRisk === 'number') {
            if (riskScore > thresholds.maxRisk) {
                alerted = true;
                var rmsg = 'Risk exceeded threshold: ' + riskScore + ' > ' + thresholds.maxRisk;
                events.push(this._fireEvent('x_uimvt.risk_spike', rmsg, score));
                detailsParts.push(rmsg);
            }
        }

        // ETA Slip Alert
        if (thresholds.targetDateMs && etaDays !== null) {
            var predictedMs = ts + (etaDays * 24 * 60 * 60 * 1000);
            if (predictedMs > thresholds.targetDateMs) {
                alerted = true;
                var emsg = 'ETA slipped beyond target date. Predicted completion exceeds target.';
                events.push(this._fireEvent('x_uimvt.eta_slip', emsg, score));
                detailsParts.push(emsg);
            }
        }

        return {
            alerted: alerted,
            eventsFired: events,
            details: detailsParts.join(' | ')
        };
    },

    /**
     * Fire a ServiceNow event or external webhook alert.
     * @param {String} eventName
     * @param {String} message
     * @param {Object} payload
     * @return {Object} event record stub
     */
    _fireEvent: function(eventName, message, payload) {
        // In ServiceNow, this would create a sysevent record
        var evt = {
            name: eventName,
            instance: gs.getProperty('instance_name', 'default'),
            message: message,
            payload: JSON.stringify(payload),
            fired_at: new Date().toISOString()
        };
        // Attempt sysevent insert if running in ServiceNow context
        try {
            var gr = new GlideRecord('sysevent');
            gr.initialize();
            gr.name = eventName;
            gr.instance = evt.instance;
            gr.parm1 = message;
            gr.parm2 = evt.payload;
            gr.insert();
            evt.sys_id = gr.getUniqueValue();
        } catch(e) {
            // Graceful fallback when not in ServiceNow runtime
            evt.sys_id = 'event_' + Math.random().toString(36).slice(2);
        }

        // Webhook notification (best-effort)
        if (this.webhookUrl) {
            try {
                var r = new sn_ws.RESTMessageV2();
                r.setEndpoint(this.webhookUrl);
                r.setHttpMethod('POST');
                r.setRequestHeader('Content-Type', 'application/json');
                r.setRequestBody(JSON.stringify({text: message, event: eventName, payload: payload}));
                r.execute();
            } catch(whErr) {
                // webhook failure is non-blocking
            }
        }

        return evt;
    },

    type: 'UIMVTAlertEngine'
};

if (typeof global !== 'undefined' && global) global.UIMVTAlertEngine = UIMVTAlertEngine;
