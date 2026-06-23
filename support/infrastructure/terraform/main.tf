# Provisions the workshop's platform-engineering setup as code, ONE ISOLATED STACK PER USER:
#   - users read from a CSV (email,name,surname)
#   - per user: a project (project-NNN) with development + production environments enabled
#   - production guarded by change requests (1 approval), approved by the facilitator/admin
#     (the attendee can't approve their own — segregation of duties)
#   - per user: a single-member group (just the attendee) that owns that user's project and is
#     read-only everywhere else; the facilitator/admin approves via a direct role grant, not membership
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

# The workshop facilitator/admin, looked up by email (must already exist on the instance —
# it's the provisioning admin). Added to every team group so the group can approve each
# attendee's production change requests. Attendees cannot approve their OWN change request
# (Unleash blocks non-admin self-approval), so the facilitator is the effective approver —
# segregation of duties. Override the address via TF_VAR_facilitator_email.
data "unleash_user" "facilitator" {
  email = var.facilitator_email
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
# change-request permissions.
resource "unleash_role" "change_request_approver" {
  name        = "Change Request Approver"
  description = "Approve and apply change requests in the project's production environment."
  type        = "custom" # project-scoped custom role

  permissions = [
    { name = "APPROVE_CHANGE_REQUEST", environment = data.unleash_environment.production.name },
    { name = "APPLY_CHANGE_REQUEST", environment = data.unleash_environment.production.name },
  ]
}

# One group per user: read-only globally (Viewer root role). SINGLE member — the attendee.
# The shared facilitator/admin is intentionally NOT a group member; they get the Change Request
# Approver role granted directly to their user in project_access below, which is what lets them
# approve the attendee's production change requests (the attendee can't approve their own).
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

  # Force the group to be destroyed *before* the custom role. Otherwise destroy
  # tears the group and the role down concurrently, and the role's DELETE can
  # fire while a group still carries the role binding → Unleash 400 RoleInUseError.
  # This edge serializes teardown: project_access → group → role.
  depends_on = [unleash_role.change_request_approver]
}

# Grant the attendee's group Owner on its own project (via the group), plus the change-request
# approver role granted DIRECTLY to the facilitator/admin user. That direct grant — not group
# membership — is how the facilitator approves the production change requests the attendee raises,
# while the attendee cannot approve their OWN (segregation of duties).
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
      role   = tonumber(unleash_role.change_request_approver.id)
      users  = [tonumber(data.unleash_user.facilitator.id)]
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
