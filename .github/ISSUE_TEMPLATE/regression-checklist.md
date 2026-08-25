---
name: DTrader Tag Regression Checklist
about: QA regression checklist for Derivatives Trader (DTrader) release
title: '[TAG] DTrader Production - production_<DATE>_<N>'
labels: ''
assignees: ''
---

## DTrader Regression Checklist

- [ ] Move issues in **Staged** status to **Ready for Release**
- [ ] Verify Playwright regression results _(AKO triggers the run — do not dispatch it manually)_
    - [ ] Wait for AKO to trigger Staging E2E regression and paste the GitHub Actions run link here: _(add CI run link)_
    - [ ] After AKO posts pass or fail, then open the workflow and review the result.
    - [ ] For failed tests, distinguish between:
        - [ ] Product bugs — raise them as sub-issue.
        - [ ] Expected UI/behaviour change — update the test through a PR.
- [ ] Check the redirection from Home to DTrader and ensure it's working properly.
- [ ] Sanity check on DTrader chart to make sure the chart is loading and streaming fine.
    - [ ] Check Chart types
    - [ ] Check Drawing tools
    - [ ] Check Indicator
    - [ ] Check Downloads
- [ ] Check both desktop and mobile viewports for the tag's changed surfaces.
