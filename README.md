# UI Migration Velocity Tracker (UIMVT)

**Visibility, velocity, and predictability for your Australia UI migration.**

Author: ServiceNow Solution Architect Vladimir Kapustin  
License: AGPL-3.0-only  
Compatibility: ServiceNow Zurich (2025) → Australia (2026)

---

## What is UIMVT?

Australia release mandates **Next Experience** as the primary UI path. Legacy **UI11 / UI15** and **Agent Workspace** are deprecated.

UIMVT is a scoped ServiceNow app (`x_uimvt`) that:
- **Scans** all forms, lists, UI macros, and modules for legacy UI references
- **Quantifies** migration readiness as a percentage per application
- **Predicts** when each app will be Australia-ready based on historical velocity
- **Alerts** when a team's migration velocity drops below threshold

## Architecture

```
┌───────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ UIMVTScanner  │────>│ UIMVTScoreEngine│────>│UIMVTDashboardRenderer│
│   (detect)    │     │  (calculate %)  │     │  (HTML/JSON/CSV) │
└───────────────┘     └─────────────────┘     └──────────────────┘
        │                      │
        ▼                      ▼
   sys_ui_form            x_uimvt_app_score
   sys_ui_list            x_uimvt_velocity_log
   sys_ui_macro
   sys_ui_module
```

## Core Modules

| Module | File | Purpose |
|--------|------|---------|
| Scanner | `UIMVTScanner.js` | Detects legacy UI references across tables |
| Score Engine | `UIMVTScoreEngine.js` | Calculates migration %, velocity, predicted date |
| Dashboard | `UIMVTDashboardRenderer.js` | HTML/JSON/CSV export |
| Alert Engine | `UIMVTAlertEngine.js` | Threshold checks + event notifications |

## Data Model

| Table | Purpose |
|-------|---------|
| `x_uimvt_snapshot` | Per-scan instance snapshot |
| `x_uimvt_app_score` | Per-application score + prediction |
| `x_uimvt_velocity_log` | Time-series for velocity trend analysis |

## Test Results

```
Unit tests : 8/8 PASS
E2E tests  : 4/4 PASS
```

## Installation

1. Import `src/sys_app.xml` and `src/tables.xml` via Studio → Import.
2. Create Script Includes in `src/`.
3. Configure Scheduled Job for weekly snapshots.
4. Add `x_uimvt.user` role to team leads.

## Security

- All Script Includes execute as `system`
- No external API calls
- Alerts via `gs.eventQueue` (standard SN notification)

## ROI

| Metric | Value |
|--------|-------|
| Manual audit time saved | 2-4 weeks |
| Migration visibility | Real-time per app |
| Cost of blocked upgrade | Avoided |

---

Vladimir Kapustin · vladarchitectservicenow-oss · AGPL-3.0-only
