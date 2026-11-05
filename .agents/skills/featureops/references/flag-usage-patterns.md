# Flag usage patterns

How flag checks look in code and how far each one reaches. The evaluate, find, wrap and remove steps of the FeatureOps skill (`SKILL.md`) read this file when they need to locate checks or tell what a check covers.

## Finding checks

Search for the literal flag name first. It finds direct checks, constants, config entries, test mocks and analytics tags alike. Also search the other spellings a codebase may use for it: `new-checkout` can appear as `new_checkout`, `newCheckout` or `NEW_CHECKOUT`.

To find a codebase's flag checks when you don't know a name, search for the SDK's check method:

| SDK | Check | Variant |
| --- | --- | --- |
| Node, browser JavaScript, Java, PHP, iOS, Android, Flutter | `isEnabled` | `getVariant` |
| Python, Rust | `is_enabled` | `get_variant` |
| Ruby | `is_enabled?` | `get_variant` |
| Go, .NET | `IsEnabled` | `GetVariant` |
| React, Vue, Svelte | `useFlag` | `useVariant` |

Most codebases wrap the SDK: a `featureFlags.isEnabled` helper, an injected flag service, a custom hook, a decorator, or a config object filled from flags at startup. Once one search shows the wrapper, search for the wrapper's name instead; raw SDK calls may only appear inside it.

## What a check covers

| Shape | Example | Covers |
| --- | --- | --- |
| If block | `if (flags.isEnabled('x')) { ... }` | The block, up to its closing brace; in Python, the lines indented deeper than the `if` |
| Guard clause | `if (!flags.isEnabled('x')) return;` | Everything after the guard, to the end of the function |
| Stored result | `const on = flags.isEnabled('x');` | Nothing by itself; each later `if (on)`, `if (!on)` or `on ? a : b` covers as its own shape does |
| Ternary | `flags.isEnabled('x') ? a() : b()` | `a()` only |
| Logical operator | `flags.isEnabled('x') && a()` | `a()` |
| Hook in rendering | `{enabled && <New />}`, `{enabled ? <New /> : <Old />}` | The rendered branch |
| Variant switch | `switch (getVariant('x').name)` | Each case, for its own variant |
| Wrapper or decorator | `withFeatureFlag('x', () => ...)`, `@FeatureFlag('x')` | The callback body, or the whole decorated function or class |
| Config gate | `if (config.features.newCheckout)` | Whatever the config value gates; trace every reader of it |

A check inside another condition covers only the code inside both. A flag evaluated once at startup and stored (in a constant, a module variable, a registered route) is not a runtime check: toggling the flag changes nothing until a restart. `wrap-change.md` explains why to avoid that shape.
