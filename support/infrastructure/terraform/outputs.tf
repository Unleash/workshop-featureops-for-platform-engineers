# ALL project ids, semicolon-separated, for the unleash-provisioner to loop over.
output "project_ids" {
  description = "Semicolon-separated list of every provisioned project id (consumed by the unleash-provisioner)."
  value       = join(";", [for n in local.numbers : unleash_project.team[n].id])
}

# Service-account token for the isolated Backstage example
# (other-examples/backstage-with-unleash → UNLEASH_API_TOKEN).
output "backstage_unleash_token" {
  description = "Service-account token (Viewer, read-only) for the Backstage Unleash plugin (UNLEASH_API_TOKEN)."
  value       = unleash_service_account_token.backstage.secret
  sensitive   = true
}
