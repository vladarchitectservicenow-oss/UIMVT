/**
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * UIMVT Architecture Plan — UI Migration Velocity Tracker
 * Scope: x_uimvt
 * Focus: Zurich (2025) → Australia (2026) UI migration readiness
 */

# UIMVT (UI Migration Velocity Tracker) — Architecture Plan

## 1. Problem Statement

Australia release mandates **Next Experience** as the primary UI path.
Legacy UI11 / UI15 and **Agent Workspace** are deprecated.
Platform teams face:

1. **No visibility** — "Which of our 200 forms are still legacy?"
2. **No velocity metric** — "Are we moving toward Next Experience, or stalling?"
3. **No prediction** — "When will our instance be Australia-ready?"
4. **No team accountability** — "Who is responsible for the 47 legacy forms in our HR app?"

**Impact:** Australia upgrade blocked because UI migration is a "black box."

## 2. Product Definition

UIMVT is a scoped ServiceNow app (`x_uimvt`) that:
- Scans all forms, lists, UI macros, and modules for legacy UI references (UI11, UI15, Agent Workspace)
- Identifies Next Experience ready forms (UI Builder components present)
- Calculates a **migration velocity score** per application
- Stores historical snapshots → velocity trend analysis
- Predicts Australia-ready date per app
- Triggers thresholds + email alerts when a team's velocity drops

## 3. Data Model

### Tables

| Table | Purpose |
|-------|---------|
| x_uimvt_snapshot | Per-scan snapshot of instance UI state |
| x_uimvt_app_score | Per-application migration percentage + velocity |
| x_uimvt_velocity_log | Time-series for trend prediction |

### x_uimvt_snapshot fields
- instance_name (String)
- scan_date (GlideDateTime)
- total_forms (Integer)
- legacy_forms (Integer)
- next_experience_forms (Integer)
- legacy_ui_macros (Integer)
- total_ui_macros (Integer)
- agent_workspace_refs (Integer)

### x_uimvt_app_score fields
- app_scope (String)
- app_name (String)
- total_forms (Integer)
- migrated_forms (Integer)
- migration_pct (Float, 0.0-100.0)
- last_scan_date (GlideDateTime)
- velocity_score (Float, forms/week)
- predicted_ready_date (GlideDate)
- alert_threshold (Float)

### x_uimvt_velocity_log fields
- app_scope (String)
- scan_date (GlideDateTime)
- migration_pct (Float)
- velocity_weekly (Float)

## 4. Runtime Architecture

### Script Includes

| Script Include | Responsibility | Reuses from AASL? |
|---------------|---------------|-------------------|
| UIMVTScanner | Detect legacy UI refs in forms, lists, macros, modules | Pattern only |
| UIMVTScoreEngine | Calculate %, velocity, predicted date | Scoring pattern |
| UIMVTDashboardRenderer | Build HTML/JSON dashboards | ReportGenerator pattern |
| UIMVTAlertEngine | Threshold check + notifications | N/A |

### Scheduled Jobs

| Job | Frequency |
|-----|-----------|
| Weekly Full Migration Snapshot | Every Monday 6 AM |
| Daily Incremental | Every day 2 AM |

## 5. Scan Engine Logic

### Legacy UI Detection (UIMVTScanner)

```
LEGACY_INDICATORS = ["UI11", "UI15", "ui11", "ui15"]
AGENT_WORKSPACE_INDICATORS = ["Agent Workspace", "agent_workspace", "awa"]
NEXT_EXPERIENCE_INDICATORS = ["UISection", "UI Builder", "uib"]
```

1. Query `sys_ui_form` — check for legacy form layouts
2. Query `sys_ui_list` — check for legacy list layouts
3. Query `sys_ui_macro` — search for Agent Workspace references
4. Query `sys_ui_module` — check legacy UI module references
5. For each table: classify as "legacy", "next_experience", or "hybrid"

### Score Calculation (UIMVTScoreEngine)

```
migration_pct = migrated_forms / total_forms * 100
```

Velocity:
```
velocity = (current_pct - previous_pct) / days_since_last * 7  // per week
```

Prediction:
```
remaining = 100 - current_pct
weeks_remaining = remaining / velocity (if velocity > 0)
predicted_date = today + weeks_remaining
```

Alert:
```
if velocity < alert_threshold AND current_pct < 100:
  trigger_alert(app_scope)
```

## 6. Security Model

- All Script Includes execute as `system`
- No external API calls
- Alerts sent via `gs.eventQueue` (standard SN notification)

## 7. Build Order

1. Table definitions + sys_app.xml
2. UIMVTScanner
3. UIMVTScoreEngine
4. UIMVTDashboardRenderer
5. UIMVTAlertEngine
6. Business Rules + Scheduled Jobs
7. Unit tests (Node.js mocks, reuse AASL MockGR)
8. E2E tests
9. PDI smoke test
10. Marketing package
11. Git push

## 8. File Map

```
/home/crixus/agentic-loop/output/UIMVT/
├── README.md
├── src/
│   ├── sys_app.xml
│   ├── tables.xml
│   ├── UIMVTScanner.js
│   ├── UIMVTScoreEngine.js
│   ├── UIMVTDashboardRenderer.js
│   └── UIMVTAlertEngine.js
├── tests/
│   ├── test_uimvt_scanner.js
│   └── test_uimvt_score_engine.js
└── marketing/
    ├── WHITEPAPER.md
    └── LINKEDIN_POST.md
```

---

*Lock: Zurich → Australia. No Washington DC, Xanadu, Yokohama.*
