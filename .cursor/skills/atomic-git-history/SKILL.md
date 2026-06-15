---
name: atomic-git-history
description: Builds readable, sequential Git commits where each commit is one coherent paragraph of intent. Use when committing code, shaping local history, or preparing multi-commit work for human review.
---

# Atomic Git History

## Purpose

Write code for machines to execute and Git history for humans to read. Each commit should teach one step of the change.

## Commit rules

- Use plain imperative commit titles.
- Prefer sentence case with no trailing period.
- Aim for 15–30 changed lines per commit when practical; cohesion matters more than the number.
- Keep tests in the same commit as the behavior they verify.
- Keep refactors separate from behavior changes when possible.
- Add only the minimal infrastructure needed by that commit.
- Do not introduce downstream architectural elements until the commit that consumes them.

## Avoid vague titles

Reject or rewrite titles that are only vague process notes, including:

- `WIP`
- `Fix`
- `Update`
- `Working`
- `Chore`
- `Address feedback`

Also avoid conventional prefixes for this style, such as `fix:` or `chore:`.

## Good titles

```text
Extract scheduler sampling calculation
Add telemetry fields for scheduler samples
Persist scheduler sample rollups
Expose scheduler sampling in admin
```

## Bad titles

```text
WIP
Fix tests
Update scheduler
Chore cleanup
Address feedback
```

## Building commits

1. Start from a clean understanding of the desired final shape.
2. Stage interactively when useful: `git add -p`.
3. Commit the smallest coherent step.
4. Run the narrowest verification that would catch mistakes for that step.
5. Repeat until the feature is complete.

Before pushing, run the history validation helper if available.
