# Provisions the workshop's platform-engineering setup as code, ONE ISOLATED STACK PER USER:
#   - users read from a CSV (email,name,surname)
#   - per user: a project (project-NNN) with development + production environments enabled
#   - production guarded by change requests (1 approval), approved by a facilitator/admin; the
#     attendee can't approve their own but applies it once approved — segregation of duties
#   - per user: a single-member group (just the attendee) that owns that user's project and is
#     read-only everywhere else; the facilitators/admins approve via a direct role grant, not membership
#
# The per-user number (NNN) is derived from the CSV row index, so the CSV needs no extra column.
# Groups are kept single-member on purpose: the provider stores group members as an ordered list
# but the Unleash API returns them in an undefined order, so a multi-member group can come back
# reordered and trip the provider's "inconsistent result after apply" bug.

locals {
  users = csvdecode(file("${path.module}/${var.users_csv}"))
  # Key every per-user resource by a zero-padded number derived from row order: "001", "002", …
  users_by_number = { for i, u in local.users : format("%03d", i + 1) => u }
  numbers         = sort(keys(local.users_by_number))
}

# Standard roles, looked up by name so we don't hard-code numeric ids.
data "unleash_role" "viewer" {
  name = "Viewer" # root role: read-only across the rest of Unleash
}

data "unleash_role" "owner" {
  name = "Owner" # project role: full control of the team's project
}

# The workshop facilitators/admins, looked up by email (each must already exist on the instance —
# they're the provisioning admins). The Change Request Approver role is granted directly to each
# of these users on every team project (NOT via group membership) so they can approve every
# attendee's production change requests. Attendees cannot approve their OWN change request
# (Unleash blocks non-admin self-approval), so a facilitator is the effective approver —
# segregation of duties. Override the addresses via TF_VAR_facilitator_emails.
data "unleash_user" "facilitators" {
  for_each = toset(split(";", var.facilitator_emails))

  email = each.value
}

# Reference the instance's default environments (must already exist). Using data
# sources — not resources — so `terraform destroy` never deletes these shared,
# instance-level environments.
data "unleash_environment" "development" {
  name = "development"
  type = "development"
}

data "unleash_environment" "production" {
  name = "production"
  type = "production"
}

# One Unleash user per CSV row, keyed by the per-user number.
resource "unleash_user" "users" {
  for_each = local.users_by_number

  email      = each.value.email
  name       = "${each.value.name} ${each.value.surname}"
  root_role  = data.unleash_role.viewer.id
  send_email = var.send_invite_emails
}

# One project per user.
resource "unleash_project" "team" {
  for_each = local.users_by_number

  id   = "project-${each.key}"
  name = "Project ${each.key}"

  # Enforce the workshop's flag naming convention on every flag created in this project.
  #   p<NNN>_<rl|ex|op|kx|pm>_[v_]<domain>_<component>_<slug>
  #   type:  rl=release ex=experiment op=operational kx=kill-switch pm=permission
  #   v_:    optional marker, present only when the flag carries variants (orthogonal to type)
  # e.g. p001_kx_checkout-page_headline_link-to-real-unleash-store. Unleash anchors the
  # pattern itself, so it is supplied without ^…$ delimiters.
  feature_naming = {
    pattern     = "p\\d{3}_(rl|ex|op|kx|pm)_(v_)?[a-z][a-z0-9-]*_[a-z][a-z0-9-]*_[a-z][a-z0-9-]*"
    example     = "p001_kx_checkout-page_headline_link-to-real-unleash-store"
    description = "p<NNN>_<rl|ex|op|kx|pm>_[v_]<domain>_<component>_<slug> — e.g. p001_kx_checkout-page_headline_link-to-real-unleash-store"
  }

  # Fixed reference links surfaced on the project. Static URLs (no {{project}}/{{feature}}
  # placeholders) render as plain links.
  link_templates = [
    { title = "Source", url_template = "https://github.com/unleash/workshop-featureops-for-platform-engineers" },
    { title = "Checkout Page (DEV)", url_template = "http://localhost:8080" },
    { title = "Checkout Page (PROD)", url_template = "http://localhost:8090" },
  ]

  # Destroy projects (and the project_access grants they carry — the facilitators'
  # change-request-approver grants, the group's applier grant, and the master-kill-switch SA's grant)
  # BEFORE the shared custom roles. The facilitators are unmanaged data-source users, so their grants
  # are only cleared when the project is torn down; without this edge the role DELETE races that
  # teardown → 400 RoleInUseError.
  depends_on = [
    unleash_role.change_request_approver,
    unleash_role.change_request_applier,
    unleash_role.master_kill_switch_toggler,
  ]
}

# Enable both environments on every project (a fresh project has none enabled, which
# is why provisioning flags into "development" 404s until this runs).
resource "unleash_project_environment" "development" {
  for_each = local.users_by_number

  project_id       = unleash_project.team[each.key].id
  environment_name = data.unleash_environment.development.name
}

# Production is guarded by change requests: one approval required before any change
# to a flag in this environment is applied.
resource "unleash_project_environment" "production" {
  for_each = local.users_by_number

  project_id              = unleash_project.team[each.key].id
  environment_name        = data.unleash_environment.production.name
  change_requests_enabled = true
  required_approvals      = 1
}

# A single custom project role that can approve and apply change requests in production.
# Custom project roles are global definitions assignable in any project, so one role is
# shared across every user's project_access. No predefined role (not even Owner) carries
# change-request permissions. Granted to the facilitators (see project_access below).
resource "unleash_role" "change_request_approver" {
  name        = "Change Request Approver"
  description = "Approve and apply change requests in the project's production environment."
  type        = "custom" # project-scoped custom role

  permissions = [
    { name = "APPROVE_CHANGE_REQUEST", environment = data.unleash_environment.production.name },
    { name = "APPLY_CHANGE_REQUEST", environment = data.unleash_environment.production.name },
  ]
}

# A custom project role that can ONLY apply (not approve) production change requests. Granted to
# the attendee's group so the author can apply their OWN change request once a facilitator has
# approved it — but never approve it themselves (Unleash blocks non-admin self-approval, and this
# role deliberately omits APPROVE_CHANGE_REQUEST). Segregation of duties: facilitator approves,
# author applies.
resource "unleash_role" "change_request_applier" {
  name        = "Change Request Applier"
  description = "Apply (but not approve) change requests in the project's production environment."
  type        = "custom" # project-scoped custom role

  permissions = [
    { name = "APPLY_CHANGE_REQUEST", environment = data.unleash_environment.production.name },
  ]
}

# One group per user: read-only globally (Viewer root role). SINGLE member — the attendee.
# The shared facilitators/admins are intentionally NOT group members; they get the Change Request
# Approver role granted directly to their user in project_access below, which is what lets them
# approve the attendee's production change requests (the attendee can't approve their own). The
# group itself carries the Change Request Applier role so the author can apply their own approved
# change request.
# Keeping the group single-member sidesteps the provider's "inconsistent result after apply"
# bug: the provider stores `users` as an ordered list but the Unleash API returns group members
# in an undefined order, so any multi-member group can come back reordered and fail the apply.
resource "unleash_group" "team" {
  for_each = local.users_by_number

  name      = "Team ${each.key}"
  root_role = data.unleash_role.viewer.id
  users = [
    tonumber(unleash_user.users[each.key].id),
  ]

  # Force the group to be destroyed *before* the custom roles it carries. Otherwise destroy
  # tears the group and the roles down concurrently, and a role's DELETE can
  # fire while a group still carries the role binding → Unleash 400 RoleInUseError.
  # This edge serializes teardown: project_access → group → role.
  depends_on = [
    unleash_role.change_request_approver,
    unleash_role.change_request_applier,
  ]
}

# Grant the attendee's group Owner on its own project (via the group) and the apply-only
# change-request role (so the author can apply their own approved change request), plus the
# change-request approver role granted DIRECTLY to each facilitator/admin user. Those direct grants —
# not group membership — are how a facilitator approves the production change requests the attendee
# raises, while the attendee cannot approve their OWN (segregation of duties): the author applies,
# a facilitator approves.
resource "unleash_project_access" "team" {
  for_each = local.users_by_number

  project = unleash_project.team[each.key].id

  roles = [
    {
      role   = data.unleash_role.owner.id
      users  = []
      groups = [tonumber(unleash_group.team[each.key].id)]
    },
    {
      role   = tonumber(unleash_role.change_request_applier.id)
      users  = []
      groups = [tonumber(unleash_group.team[each.key].id)]
    },
    # Several facilitators can share this grant. Unlike unleash_group.users (a TypeList, which is
    # why team groups are kept single-member), project_access roles' `users` is a TypeSet — the
    # provider compares it order-insensitively, so a multi-element list here does NOT trip the
    # "inconsistent result after apply" reorder bug. Granting facilitators directly here (a set),
    # rather than via group membership (a list), is what keeps the multi-facilitator case safe.
    {
      role   = tonumber(unleash_role.change_request_approver.id)
      users  = [for f in data.unleash_user.facilitators : tonumber(f.id)]
      groups = []
    },
    # The master-kill-switch service account, so its Actions can flip this project's kill switch off
    # in dev + prod (and skip prod change requests). See service-accounts.tf.
    {
      role   = tonumber(unleash_role.master_kill_switch_toggler.id)
      users  = [tonumber(unleash_service_account.master_kill_switch.id)]
      groups = []
    },
  ]

  # Env-scoped change-request permissions only take effect once production is
  # enabled on the project.
  depends_on = [unleash_project_environment.production]
}
