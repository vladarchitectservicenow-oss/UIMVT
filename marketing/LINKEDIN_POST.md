# LinkedIn / X Sales Thread — UIMVT (UI Migration Velocity Tracker)

**Author:** ServiceNow Solution Architect Vladimir Kapustin  
**Product:** UIMVT  
**Target:** CTOs, Platform Owners, ServiceNow Alliance Partners  
**Hook:** "Are you flying blind into the Australia upgrade?"

---

## Post #1 — The Hook

🚨 47 days until your Australia upgrade deadline.

Your team:
- "We migrated SOME forms to Next Experience"
- "Not sure which HR apps are still legacy"
- "Agent Workspace references? Uhhh..."

This is the UI Migration Black Hole.

Most enterprises lose 2-4 weeks to manual audits.
Then another week to arguments about "whose app is blocking the upgrade."

We built something better:

👇 Thread 🧵

## Post #2 — The Product

**UIMVT (UI Migration Velocity Tracker)**

One scoped app. One scan. Real-time answers:

✅ Which forms are still UI11 / UI15?
✅ Which apps are Next Experience ready?
✅ What is the migration velocity per application?
✅ When will each app be Australia-ready?
✅ Alerts when a team's velocity stalls

No spreadsheets. No guessing. Full visibility.

## Post #3 — Technical Depth

How it works:

1. Scan `sys_ui_form`, `sys_ui_list`, `sys_ui_macro`, `sys_ui_module`
2. Classify every item as legacy / next_experience / unknown
3. Calculate migration % per application
4. Track velocity over time → predict ready date
5. Alert threshold = configurable % per week

Runs as standard scheduled job. No external calls. AGPL-3.0.

Code: github.com/vladarchitectservicenow-oss/UIMVT

## Post #4 — ROI

Manual UI audit:
- 80 hours
- $150/hr
- $12,000 per upgrade

UIMVT:
- 4 hours to install
- Real-time forever
- $600

Net savings per upgrade: $11,400.
For 3 upgrades/year: $34,200.

Upgrade readiness should not be a black hole.

## Post #5 — CTA

If you are a ServiceNow platform owner or alliance partner:

→ Clone the repo
→ Run the scan
→ Show your C-suite the exact % per application

Link: github.com/vladarchitectservicenow-oss/UIMVT

Built by Vladimir Kapustin · ServiceNow Solution Architect  
AGPL-3.0 · No proprietary lock-in

---

**Author:** ServiceNow Solution Architect Vladimir Kapustin  
**Copyright (c) 2026 Vladimir Kapustin — SPDX-License-Identifier: AGPL-3.0-only**
