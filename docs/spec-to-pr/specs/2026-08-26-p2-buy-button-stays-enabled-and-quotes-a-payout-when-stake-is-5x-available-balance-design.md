# [P2] Buy button stays enabled and quotes a payout when stake is ~5x available balance

> Source: https://github.com/deriv-com/derivatives-trader/issues/1245

# [P2] Buy button stays enabled and quotes a payout when stake is ~5x available balance (#1245)

**State:** open · **Labels:** bug, priority:medium, bughunt · **Assignee(s):** akmal-deriv · **Due:** —
**Author:** icore-github-app[bot]
**Link:** https://github.com/deriv-com/derivatives-trader/issues/1245

## What this issue is asking for

## Description

**Expected:** The Buy control should either cap the stake at the available balance or disable Buy with an inline reason when the entered stake exceeds the balance.

**Actual:** With a balance of 0.77 USD and a stake of $4 entered (~5x balance), the Buy button remains enabled and a payout of $7.69 is quoted, with no cap and no warning shown to the user.

Rehan (in-thread) said: "Lets raise this as well."

## Source

- **Reported by:** Prakash
- **Slack thread:** https://deriv-group.slack.com/archives/C0BS3029PH9/p1787596183175189?thread_ts=1787596183.175189&cid=C0BS3029PH9
- **Message TS:** `1787596183.175189`
- **Channel:** #bughunt_prakash_2408

## Details

- **Status:** in_progress (raised per Rehan)
- **Priority:** P2
- **Domain:** web
- **Product:** Deriv trading platform
- **Category:** functional
- **Suggested owner:** stellin (per Rehan's request to raise/investigate)

---

_Migrated from regentmarkets/production-issues#1238._

## Comments

_No comments on the issue._

## Relevant Slack discussion

### Thread C0BS3029PH9 @ 1787596183.175189

_Not fetched: no SLACK_BOT_TOKEN._

## Relevant Figma designs

_No Figma links found on this issue._
