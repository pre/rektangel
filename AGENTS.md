# Rektangel

- Rektangel moves and resizes windows with keyboard shortcuts. It is a GNOME Shell extension now, and KDE and Windows can come later. `README.md` gives the repository layout.
- The window calculations belong in `core/`, which is shared by all platforms. The platform directories, for example `gnome/`, stay thin.
- `core/` has no runtime dependencies and does not use GJS, Gio, Node.js or the DOM, so the same bundle runs in GJS and in QJSEngine.
- The `execute` function in `core/README.md` is the contract between the core and the platform code. Change it only on purpose, and update the two sides in the same commit.
- Keep `README.md`, the READMEs of the directories and `docs/` accurate when the behaviour or the commands change.
- Run tasks with the npm scripts of `package.json` (`npm run` lists them), not with the commands behind them. When you do a task more than one time and it has no script, add a script.
- Run `npm run format` before each commit. The CI runs `npm run lint`, `npm run build` and `npm test`, and fails on files that are not formatted.
- Use conventional commits, because the release notes come from them. Types: `feat`, `fix`, `docs`, `chore`. After the type, start with a capitalized verb in present tense (`feat: Remove X from Y`, `fix: Prevent X from doing Y`). Title at most 72 characters, body lines at most 80. A commit that changes only tests is `chore`. For a breaking change, use `feat!` or `fix!` and start the body with `BREAKING CHANGE: <what breaks and why>`.

## Architecture decision records

`docs/adr/` records the decisions that later agents must know, with the reason for each. Read the ADRs before you change the architecture.

Write an ADR only when the decision has all three properties:

1. It is hard to reverse.
2. A reader of the code finds it surprising without the context.
3. It is the result of a real trade-off between alternatives.

A decision that a later change can easily reverse does not get an ADR.

### Format

File name: `docs/adr/NNNN-slug.md`. `NNNN` is the highest number in `docs/adr/` plus one.

```md
# Short title of the decision

Status: accepted.

One to three sentences: the context, the decision and the reason.
```

Add these sections only when they give the reader information that the code does not give:

- `## Decision`: a list, when the decision has several parts.
- `## Considered Options`: the rejected alternatives and the reason for each rejection.
- `## Consequences`: effects of the decision that are not obvious.

### Change a decision

Write a new ADR. Do not change the decision text of the old ADR. Write the relation in the `Status` line of the two ADRs:

- New ADR: `Status: accepted. Supersedes ADR-0009 for the storage form.` Use `Extends` or `Changes` when the old decision stays partly true.
- Old ADR: `Status: superseded by ADR-0013 for the storage form.` Or, when the old decision stays true: `Status: accepted. ADR 0019 moves the cycle sizes to gsettings.`

When a README or code comment depends on a decision, refer to it as `ADR NNNN`.
