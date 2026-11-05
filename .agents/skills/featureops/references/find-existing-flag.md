# Find an existing flag

Look for a flag that already covers the feature before creating one. Each duplicate is one more flag to roll out, watch and remove. Turning on a feature in Unleash creates the flag when it doesn't exist, so a guessed or misspelt name quietly creates a duplicate instead of failing. Naming comes from the **active policy** (see `SKILL.md`).

## 1. Search the code

Search the files being changed and their directory for flag checks (`flag-usage-patterns.md`). A flag checked in the same file or module, about the same feature, is the strongest candidate; if it already encloses the code being changed, the change is covered (see `evaluate-change.md`). Then search the whole repository for flag names built from the feature's words: for "Stripe checkout", names containing `stripe` or `checkout`.

A follow-up change often belongs to a flag added for the same work a few weeks earlier. To list recent flag checks:

```bash
git log -p -S "<check method or wrapper name>" --since="3 months ago"
```

## 2. Search Unleash

Search flags for two to four short words a name for this feature would contain, one search per word: for "Stripe checkout", search `stripe` and `checkout`. Flag search matches names and tags, not descriptions, so search the words, not a sentence. Search every project; prefer a match in the project the code belongs to. Archived flags only come back when the search asks for the `archived` stage; run that search too.

Inspect a promising match to read its description, type, lifecycle stage and where it is enabled before judging it. An archived match can be revived, but it comes back off in every environment. A stale one is due for removal and is rarely the right home for new work.

## 3. Decide

| Finding | Action |
| --- | --- |
| A flag clearly controls this feature | Reuse it |
| One or more flags might, but it isn't clear | Ask the user, listing each candidate with where you found it and why it might fit |
| Nothing relevant | Create a new flag, named and typed per the active policy, with a description of what it controls |

Reusing a flag that controls something else couples two features: turning one off turns both off. When unsure, ask.
