# UIMVT Test Suite Standard Operating Procedure

## Copyright & License
Copyright (c) 2026 Vladimir Kapustin. Licensed under AGPL-3.0.

## Purpose
This document defines the complete test scenario specification for the ServiceNow UI Migration Velocity Tracker (UIMVT). All scenarios must PASS before code is considered production-ready.

---

## Scenario 1: Legacy UI Detection — Forms
**ID:** SOP-001  
**Objective:** Verify UIMVTScanner.js correctly identifies forms using legacy UI (e.g., UI16, non-Next UI forms).  
**Setup:** Mock instance with 5 forms: 3 legacy (form UI policy using client scripts, no Next Experience enabled) and 2 modern (Next UI Form Designer, Declarative Actions).  
**Expected Result:** Scanner returns `legacyCount=3`, `modernCount=2`, accuracy >= 100%.

---

## Scenario 2: Legacy UI Detection — Lists
**ID:** SOP-002  
**Objective:** Verify scanner detects legacy list layouts (e.g., non-Workspace list menus, legacy related lists).  
**Setup:** Mock instance with 4 lists: 2 legacy (list control with legacy filter, no unified list) and 2 modern (Workspace lists, unified filters).  
**Expected Result:** Scanner flags 2 legacy list components.

---

## Scenario 3: Legacy UI Detection — Macros
**ID:** SOP-003  
**Objective:** Verify scanner identifies deprecated UI macros (e.g., jelly macros, old homepage widgets).  
**Setup:** Mock instance with 6 macros: 4 legacy (jelly scripts, pre-Kingston widgets) and 2 modern (Agent Workspace components, custom web components).  
**Expected Result:** Scanner returns `legacyMacroCount=4`, `modernMacroCount=2`.

---

## Scenario 4: Legacy UI Detection — Modules
**ID:** SOP-004  
**Objective:** Verify scanner detects legacy application menu modules (e.g., URL-type modules pointing to legacy pages).  
**Setup:** Mock instance with 8 modules: 5 legacy (URL modules to legacy sys_ui_page, non-Workspace links) and 3 modern (Workspace navigation, App Engine modules).  
**Expected Result:** Scanner flags 5 legacy modules.

---

## Scenario 5: Velocity Calculation — Multi-Window
**ID:** SOP-005  
**Objective:** Verify UIMVTScoreEngine.js computes velocity over 1-week, 4-week, and 12-week windows correctly.  
**Setup:** Synthetic migration history: +5 forms migrated in week 1, +12 in weeks 1-4, +40 in weeks 1-12.  
**Expected Result:** v1w=5.0 forms/week, v4w=3.0 forms/week, v12w=3.33 forms/week (rounded).

---

## Scenario 6: Predicted ETA — Stalled (velocity=0)
**ID:** SOP-006  
**Objective:** When velocity is zero, ETA must report "Stalled" with no finite date.  
**Setup:** Instance has 50 legacy forms remaining, 0 forms migrated in last 4 weeks.  
**Expected Result:** ETA string equals `"Stalled — velocity zero"`, no Date object returned.

---

## Scenario 7: Predicted ETA — Regression (velocity<0)
**ID:** SOP-007  
**Objective:** When net migration is negative (reversion to legacy), ETA must report "Regression" and show rate of increase.  
**Setup:** Instance had 40 legacy forms 4 weeks ago; now has 45 legacy forms (5 modern forms reverted).  
**Expected Result:** ETA string contains `"Regression"`, velocity negative, legacy trend increasing.

---

## Scenario 7b: Dashboard Export Correctness — HTML
**ID:** SOP-008  
**Objective:** UIMVTDashboardRenderer.js must produce valid HTML with a summary table and velocity chart placeholders.  
**Setup:** Score object with 25 legacy, 75 modern, v4w=2.5.  
**Expected Result:** HTML contains `<table>`, `<thead>`, `<tbody>`, and `velocity-4w` class div. No `undefined` interpolated.

---

## Scenario 8: Dashboard Export Correctness — JSON
**ID:** SOP-009  
**Objective:** JSON export must match schema with all required fields and no circular references.  
**Setup:** Same score object as SOP-008.  
**Expected Result:** JSON parses successfully; root keys: `legacy`, `modern`, `total`, `velocity`, `eta`, `timestamp`.

---

## Scenario 9: Dashboard Export Correctness — CSV
**ID:** SOP-010  
**Objective:** CSV export must contain header row and data rows with comma-separated values, quoted fields where necessary.  
**Setup:** Score object with 10 legacy, 90 modern, v4w=5.0, eta="2026-08-01".  
**Expected Result:** First line is header; second line has correct counts; commas delimit; RFC-4180 compliant.

---

## Scenario 10: Alert Firing — Threshold Breach
**ID:** SOP-011  
**Objective:** UIMVTAlertEngine.js fires an alert when legacy percentage exceeds configured threshold.  
**Setup:** Threshold=30%. Instance legacy=40%, modern=60%.  
**Expected Result:** `shouldFire()` returns `true`; alert payload contains `severity=warning`, `message` includes "legacy threshold exceeded".

---

## Scenario 11: Empty Instance Handling
**ID:** SOP-012  
**Objective:** Scanner and ScoreEngine handle an instance with zero forms gracefully (no divide-by-zero).  
**Setup:** Mock instance with 0 forms, 0 lists, 0 macros, 0 modules.  
**Expected Result:** legacy=0, modern=0, total=0, velocity=0, eta="N/A — nothing to migrate", no exceptions.

---

## Scenario 12: 100% Migrated Instance
**ID:** SOP-013  
**Objective:** Perfectly modern instance reports success, zero ETA, and no alerts.  
**Setup:** Instance with 100 modern forms, 0 legacy forms.  
**Expected Result:** legacy=0, modern=100, percentModern=100, eta="Migration complete", alert shouldFire=false.

---

## Scenario 13: Mixed Scope — Some Apps Migrated, Others Not
**ID:** SOP-014  
**Objective:** Scanner supports per-application scope; score engine aggregates correctly when some apps are 100% modern and others 0%.  
**Setup:** App A: 20 forms all modern. App B: 30 forms all legacy.  
**Expected Result:** Overall legacy=30, modern=20, total=50. Per-app breakdown present in score. Velocity uses overall totals.

---

## Scenario 14: Invalid Alert Threshold Configuration
**ID:** SOP-015  
**Objective:** Alert engine rejects invalid threshold values (negative, >100, non-numeric, null).  
**Setup:** Thresholds: -5, 105, "abc", null, undefined.  
**Expected Result:** Engine throws `UIMVTAlertError` for each invalid input; valid thresholds (0, 50, 100) accepted.

---

## Success Criteria
- All 14 scenarios (SOP-001 through SOP-015) execute without unhandled exceptions.
- Assertions match Expected Results exactly.
- Execution logs written to `tests/execution_history/` with PASS/FAIL per scenario and a summary block.
- Quality Gate G0: This file exists with ≥10 scenarios. ✅
