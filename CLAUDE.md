# M5 Retail BI

Portfolio project on the Walmart M5 data: dbt + DuckDB models (`models/`), a static web dashboard (`web/`), and a Power BI project (`powerbi/M5RetailBI.pbip`, PBIR report + TMDL semantic model).

These rules override the defaults of any skill.

## Working rules

- Commit before and after each round of changes. Never `git push` without Guilherme's OK; run `git pull --rebase` before a push.
- Before any Power BI Desktop reload, run `powerbi-desktop status`. If `hasUnsavedChanges` is true, stop and ask Guilherme to press Ctrl+S in Desktop.
- Semantic model (tables, measures, relationships): use the `semantic-model-authoring` skill / powerbi-modeling-mcp. Report pages and visuals: use the `powerbi-report-cli` skill.
- Before saying a report change is done, run `validate-report` and check the page with `powerbi-desktop screenshot`.
- Report content is in English. Talk to Guilherme in Portuguese.
- When Guilherme has to do something, give the exact command ready to paste into PowerShell.

## Report theme "M5 Retail"

- Page background `#F5F6F4`; visuals on white `#FFFFFF` cards with border `#D6DBD9`
- Text `#16202A`, secondary text `#5A6670`, gridlines `#E6E9E8`
- dataColors, in order: `#2A78D6`, `#EB6834`, `#1BAF7A`, `#B45309`, `#5A6670`
- Sequential blue `#CDE2FB` → `#256ABF`; highlight/alert `#B45309`
- Font Segoe UI; visual titles 12pt semibold. No shadows, no 3D.
- Pages 1280 × 720, 16 px margins and gutters, slicers synced across pages.
