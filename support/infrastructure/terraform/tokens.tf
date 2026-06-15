# The application SDK tokens, created as code and scoped to the team's project
# ONLY (no wildcard). `make unleash-create` reads the outputs and writes them
# into the app's .env so the browser and backend can authenticate to Unleash.
#
# One frontend + one client token PER environment, so a development and a production
# app instance can run side by side, each scoped to its own environment.

locals {
  # Environments we mint app tokens for. Both are enabled on every project (see main.tf).
  app_token_environments = ["development", "production"]

  # One token target per (user number, environment), keyed "NNN-environment".
  token_targets = {
    for pair in setproduct(local.numbers, local.app_token_environments) :
    "${pair[0]}-${pair[1]}" => { number = pair[0], environment = pair[1] }
  }
}

resource "unleash_api_token" "frontend" {
  for_each = local.token_targets

  token_name  = "project-${each.value.number}-web-${each.value.environment}"
  type        = "frontend"
  projects    = [unleash_project.team[each.value.number].id]
  environment = each.value.environment
}

resource "unleash_api_token" "backend" {
  for_each = local.token_targets

  token_name  = "project-${each.value.number}-api-${each.value.environment}"
  type        = "client"
  projects    = [unleash_project.team[each.value.number].id]
  environment = each.value.environment
}
