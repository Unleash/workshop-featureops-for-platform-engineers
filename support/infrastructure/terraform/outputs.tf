# SELF-PACED outputs — the FIRST user's tokens + project number. `make unleash-create` reads
# these to write `.env` for the single self-paced attendee. Guided-workshop attendees configure
# their own tokens + project number manually (no Terraform), so these are intentionally
# self-paced-only.

output "selfpaced_frontend_client_key" {
  description = "First user's development frontend API token (VITE_UNLEASH_CLIENT_KEY)."
  value       = unleash_api_token.frontend["${local.first_number}-development"].secret
  sensitive   = true
}

output "selfpaced_backend_api_token" {
  description = "First user's development client API token for the backend SDK (UNLEASH_API_TOKEN)."
  value       = unleash_api_token.backend["${local.first_number}-development"].secret
  sensitive   = true
}

output "selfpaced_frontend_client_key_production" {
  description = "First user's production frontend API token (VITE_UNLEASH_CLIENT_KEY_PRODUCTION)."
  value       = unleash_api_token.frontend["${local.first_number}-production"].secret
  sensitive   = true
}

output "selfpaced_backend_api_token_production" {
  description = "First user's production client API token for the backend SDK (UNLEASH_API_TOKEN_PRODUCTION)."
  value       = unleash_api_token.backend["${local.first_number}-production"].secret
  sensitive   = true
}

output "selfpaced_project_number" {
  description = "First user's project number (UNLEASH_PROJECT_NUMBER / VITE_UNLEASH_PROJECT_NUMBER)."
  value       = local.first_number
}

# ALL project ids, semicolon-separated, for the unleash-provisioner to loop over.
output "project_ids" {
  description = "Semicolon-separated list of every provisioned project id (consumed by the unleash-provisioner)."
  value       = join(";", [for n in local.numbers : unleash_project.team[n].id])
}

# App-facing Unleash endpoints, derived from the admin base URL so the apps and the
# provisioning share a single source of truth. The backend SDK talks to the Client
# API (<base>/api); the browser talks to the Frontend API (<base>/api/frontend).
output "unleash_backend_url" {
  description = "Client API URL for the backend SDK (UNLEASH_URL)."
  value       = "${trimsuffix(var.unleash_base_url, "/")}/api"
}

output "unleash_frontend_url" {
  description = "Frontend API URL for the browser app (VITE_UNLEASH_URL)."
  value       = "${trimsuffix(var.unleash_base_url, "/")}/api/frontend"
}
