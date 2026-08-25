---
name: DTrader Tag Post-Release Sanity Checklist
about: QA post-release sanity checklist for Derivatives Trader (DTrader) release
title: '[POST-RELEASE] DTrader Production - production_<DATE>_<N>'
labels: ''
assignees: ''
---

## Post-Release Sanity Checklist

> **Objective:** Ensure DTrader is functioning as expected in the production environment after the release.
>
> **Scope:**
>
> - Verify that DTrader loads properly
> - Ensure Playwright smoke tests pass without critical failures
> - Ensure features/tasks from the tag are deployed to production without error
> - Ensure DTrader critical path is not broken

---

- [ ] After release announcement: Confirm the correct release tag version is announced in the Slack release channel.
- [ ] Check at least one of the related features from the release.
- [ ] Verify Playwright smoke results _(AKO triggers the run — do not dispatch it manually)_
    - [ ] Wait for AKO to trigger Production E2E smoke and paste the GitHub Actions run link here: _(add CI run link)_
    - [ ] After AKO posts pass or fail, open the workflow and review the result.
- [ ] Check redirection from Home to DTrader
    - [ ] Verify redirection from home.deriv.com → dtrader.deriv.com
- [ ] Check feed for DTrader
    - [ ] Check the feed for all trade types
- [ ] Sanity check on DTrader chart to make sure the chart is loading and streaming fine.
    - [ ] Check Chart types
    - [ ] Check Drawing tools
    - [ ] Check Indicator
    - [ ] Check Downloads
- [ ] Ensure No New Console Errors Logged
    - [ ] Go to https://dtrader.deriv.com
    - [ ] Right-click anywhere on the page and select Inspect.
    - [ ] Navigate to the Console tab in the developer tools.
    - [ ] Visit Trade, Positions, Reports, and Automate, refresh each, and observe for any console errors.
- [ ] Ensure No New TrackJS Errors Logged
    - [ ] Go to TrackJS
    - [ ] From the APPLICATION dropdown, select Derivatives Trader
    - [ ] From the TIMER dropdown, select 1 hour
    - [ ] In the left-hand menu, click on Error
    - [ ] Review the most recent console errors
    - [ ] Pay attention to Last Seen and History timestamps — these indicate whether the error occurred after the release
- [ ] Post Release Concluded — confirm all checks above are done and the release is stable.
