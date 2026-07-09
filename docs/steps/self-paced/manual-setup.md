# Manual setup

You land here when you told `make workshop-configure` **not** to create your project — or when your PAT can't create one and you need an Unleash admin to do it for you.

Create the following by hand in the Unleash UI. Then re-run `make workshop-configure`: it will find the project (you own it, and it's the one named in your `.env`), skip the creation prompt entirely, and fill in the URLs and SDK tokens.

## The minimum

### 1. A project

Create one, with any id you like — `featureops-workshop` is what the script would have used. Note the id: you'll need it.

> Avoid naming it `project-<number>` (e.g. `project-001`). That shape is reserved for the facilitated workshop's Terraform-provisioned projects, and it is what switches the `pNNN_` flag prefix **on**. If you use it, every flag below must be named `p001_rl_…` instead of `rl_…`.

Then **enable the `development` and `production` environments on it** (Project → Settings → Environments). This is easy to miss: those environments already exist instance-wide, but a freshly created project has **none of them enabled**, and every flag write into a disabled environment fails with a `404`.

Leave change requests **off**. You switch them on for `production` yourself, as the first task of [Step 8](../virtual-workshop/08-lifecycle-governance.md).

### 2. One feature flag

Name it exactly:

```
rl_checkout-page_payment-section_promo-code
```

Type `release`. Leave it disabled. Give it a 100% _Gradual rollout_ strategy in both environments so that toggling it on actually turns it fully on.

This is the one flag the workshop's later steps assume already exists. The app reads three more — `rl_checkout-page_basket-preview_product-images`, `kx_checkout-page_headline_link-to-real-unleash-store`, `ex_v_checkout-page_payment-section_free-shipping-nudge` — and an unknown flag simply evaluates to `false`, so the store still works without them. Add them the same way if you want the full demo.

### 3. Four API tokens

Project-scoped, one per (type, environment):

| Type       | Environment   | Lands in `.env` as                   |
| ---------- | ------------- | ------------------------------------ |
| `frontend` | `development` | `VITE_UNLEASH_CLIENT_KEY`            |
| `frontend` | `production`  | `VITE_UNLEASH_CLIENT_KEY_PRODUCTION` |
| `client`   | `development` | `UNLEASH_API_TOKEN`                  |
| `client`   | `production`  | `UNLEASH_API_TOKEN_PRODUCTION`       |

`make workshop-configure` reads these straight out of the API and writes them for you — you don't need to copy the secrets anywhere.

## Then

```bash
make workshop-configure   # finds your project, fills .env
make dev                  # in another terminal
make workshop-final-check
```

If `workshop-configure` still offers to create a project, it means it couldn't see yours as one you own. Check that your PAT belongs to the account that owns it.

## The nice-to-haves

The provisioner would also have created these. Nothing in the workshop breaks without them, but some steps get thinner:

- **Context fields** `region` and `email` (project-scoped) — [Step 6](../virtual-workshop/06-release-policy.md) targets a canary user with `email`.
- **A segment** `internal-users`, constrained to `email` ending with `@getunleash.io` — also Step 6.
- **A `Layer` tag type** and per-flag tags describing where each flag is evaluated.
- **The "Golden Release Rollout" release template** (instance-level) — [Step 6](../virtual-workshop/06-release-policy.md) applies it to a flag.

Rather than click all of that, you can let the provisioner do just this part against your already-created project:

```bash
UNLEASH_BASE_URL="https://<region>.app.unleash-hosted.com/<instance>" \
UNLEASH_ADMIN_TOKEN="<your-PAT>" \
UNLEASH_SELF_PACED=1 UNLEASH_PROJECTS="<your-project-id>" \
  pnpm --dir support/infrastructure/unleash-provisioner provision
```

It is idempotent: the project and flags you already made are reused, not duplicated.
