---
name: qa-pr-review
description: Sends a PR review request message to the QA Slack channel (C07VARCCFRB). Use when asked to "send PR review", "request PR review", or similar.
argument-hint: 'summary=<text> pr=<url> clickup=<url|NA>'
---

# PR Review Slack Notifier

This skill sends a formatted PR review request to the QA Slack channel using the **Slack MCP server**.

## How to Invoke

Type any of the following in the Claude Code prompt:

```
/pr-review
```

```
/pr-review summary="Fix flaky redirection test" pr=https://github.com/<org>/<repo>/pull/404
```

```
/pr-review summary="Fix flaky test" pr=<url> clickup=<url>
```

If you omit any required fields, the skill will ask you for them before sending.

---

## When to Use This Skill

**Use this skill when:**

- Asked to "send PR review message"
- Asked to "request a PR review on Slack"
- Asked to "notify the team about a PR"

---

## IMPORTANT — How to ask questions

Ask each missing field as a **plain text message** and wait for the user's reply before asking the next. Do not use `AskUserQuestion` — these are free-text inputs that don't suit a multiple-choice widget.

---

## Step-by-Step

1. **Collect details from the user** — ask for each missing field **one at a time** as a plain text message, waiting for the user's reply before asking the next:

    | #   | Field     | Question to ask                              | Default      |
    | --- | --------- | -------------------------------------------- | ------------ |
    | 1   | `summary` | "What does this PR do? (brief summary)"      | _(required)_ |
    | 2   | `pr`      | "What is the GitHub PR URL?"                 | _(required)_ |
    | 3   | `clickup` | "ClickUp card URL? (or type NA to skip)"     | _(required)_ |
    | 4   | `notes`   | "Any additional notes? (or type NA to skip)" | _(required)_ |

    Skip asking for a field if it was already provided as an argument.

2. **Send the main message** — call `slack_send_message` with:
    - `channel_id`: `C07VARCCFRB`
    - `message`: filled-in template below
    - Store the returned `ts` (timestamp) as `{message_ts}`

3. **Send thread reply (if notes provided)** — if `notes` is not `NA`, call `slack_send_message` with:
    - `channel_id`: `C07VARCCFRB`
    - `thread_ts`: `{message_ts}`
    - `message`: `{notes}`

4. **Return the message link** to the user.

---

## Message Template

:wave: <!subteam^S0AP2400XLZ> could you please help with the review of my PR?

Summary:
`{summary}`

• PR: {pr}
• ClickUp Card: {clickup}

- If `clickup` is `NA`, omit that line entirely

---

## Channel & Mentions

| Setting              | Value                                           |
| -------------------- | ----------------------------------------------- |
| **Channel ID**       | `C07VARCCFRB`                                   |
| **Reviewer subteam** | `<!subteam^S0AP2400XLZ>` (playwright_reviewers) |
