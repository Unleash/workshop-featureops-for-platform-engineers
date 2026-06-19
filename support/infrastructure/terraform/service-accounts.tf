# The "master kill switch": a single signal disables the SWAG-store-link kill switch in EVERY
# project's development + production environments at once (see support/master-kill-switch and the
# unleash-provisioner's signal/action modules). Unleash Actions run under a service account's
# identity, so we provision that account here, in Terraform, alongside the custom role that grants
# it just enough to flip the flag off — including bypassing production's change-request guard so the
# kill is instant, not queued.
#
# Signals and Actions themselves cannot be expressed by the Terraform provider; the
# unleash-provisioner creates them over the admin API and resolves THIS account by username for the
# action's `actorId`.

# The actor every master-kill-switch action runs as. Its root role is read-only (Viewer); the real
# grants come from the project-scoped custom role below, bound per project. No service-account TOKEN
# is created: nothing authenticates AS this account (the action engine uses its identity
# server-side, and the sender uses the signal endpoint's own token), so a token would be unused.
resource "unleash_service_account" "master_kill_switch" {
  name      = "Master Kill Switch Actor"
  username  = "master-kill-switch-actor"
  root_role = data.unleash_role.viewer.id
}

# A custom project role granting exactly what a master-kill-switch action needs: turn a flag off in
# development and production, and SKIP the production change-request flow so the kill applies
# immediately (emergency semantics) instead of waiting for an approval. Custom project roles are
# global definitions assignable in any project, so one role is shared across every project_access.
resource "unleash_role" "master_kill_switch_toggler" {
  name        = "Master Kill Switch Toggler"
  description = "Disable the SWAG-store-link kill switch in development and production, bypassing production change requests."
  type        = "custom" # project-scoped custom role

  permissions = [
    { name = "UPDATE_FEATURE_ENVIRONMENT", environment = data.unleash_environment.development.name },
    { name = "UPDATE_FEATURE_ENVIRONMENT", environment = data.unleash_environment.production.name },
    { name = "SKIP_CHANGE_REQUEST", environment = data.unleash_environment.production.name },
  ]
}
