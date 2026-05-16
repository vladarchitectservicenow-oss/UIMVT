# The UI Migration Black Hole: How Australia Readiness Dies in the Dark

**Whitepaper — UI Migration Velocity Tracker (UIMVT)**  
**Date:** May 2026  
**Author:** ServiceNow Solution Architect Vladimir Kapustin

---

## 1. The Problem: "Are We Ready for Australia?"

ServiceNow Australia mandates **Next Experience** as the primary UI. Legacy UI11 / UI15 and Agent Workspace are deprecated. Every enterprise customer faces the same question:

> "How many of our 500 custom forms are still legacy? Which applications are blocking the upgrade? When will we be ready?"

The answer is usually:
- A manual spreadsheet, updated quarterly
- A "best guess" from the most senior dev
- Or silence until the upgrade team hits a hard stop

This is the **UI Migration Black Hole** — no visibility, no velocity metric, no prediction.

## 2. Impact: What Happens When You Cannot See?

| Risk | Consequence |
|------|-------------|
| Unknown legacy forms | Upgrade blocked mid-migration |
| No per-app accountability | "IT team" vs "HR team" blame game |
| No velocity tracking | "We started migrating in January and... we're not sure if we made progress" |
| No prediction | Australia upgrade date is a guess, not a plan |

**Real cost:** 2-4 weeks of manual audits per upgrade cycle, or a blocked upgrade worth $50K+ in consulting fees.

## 3. UIMVT: The Solution

UIMVT (`x_uimvt`) is a scoped app that turns the black hole into a real-time dashboard.

### 3.1 Scan Engine
Detects legacy UI references in:
- `sys_ui_form` (form layouts)
- `sys_ui_list` (list layouts)
- `sys_ui_macro` (Agent Workspace UI macros)
- `sys_ui_module` (legacy navigation modules)

### 3.2 Score Engine
```
Migration % = Migrated / Total * 100
Velocity = (Current % - Previous %) / Days * 7  // per week
Prediction = Today + (100 - Current %) / Velocity
```

### 3.3 Alert Engine
Fires when velocity < threshold. No surprise stalls.

## 4. ROI Calculation

| Input | Value |
|-------|-------|
| Manual audit (per upgrade) | 80 hours @ $150/hr = $12,000 |
| UIMVT installation | 4 hours @ $150/hr = $600 |
| Net savings per upgrade | $11,400 |
| Time to value | 1 sprint |

For 3 upgrades per year → $34,200 saved.

## 5. Architecture

See `src/architecture_plan.md` for full technical specification.

## 6. Conclusion

UIMVT replaces "we think we're ready" with "we know exactly which apps are at 67% migrated, which teams need help, and when the instance will be Australia-ready."

---

Vladimir Kapustin, ServiceNow Solution Architect  
vladarchitectservicenow-oss · AGPL-3.0-only
