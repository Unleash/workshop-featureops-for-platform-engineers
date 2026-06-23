terraform {
  required_version = ">= 1.6"

  required_providers {
    unleash = {
      source  = "Unleash/unleash"
      version = "~> 3.0"
    }
  }
}

# Authenticates against the CLOUD Unleash instance. Both values are supplied
# externally (e.g. `export TF_VAR_unleash_base_url=…` / `TF_VAR_unleash_token=…`);
# the token is a Service Account token or PAT with admin rights — never committed.
provider "unleash" {
  base_url      = var.unleash_base_url
  authorization = var.unleash_token

  # Cap in-flight admin API calls. The provider has NO retry/backoff for HTTP 429, so a single
  # rate-limit response aborts the whole apply. Serializing requests (default 1) keeps large runs
  # (e.g. provisioning 400 users) under the hosted instance's request-rate window. Raise toward the
  # provider default of 2 to trade safety for speed.
  max_concurrent_requests = var.unleash_max_concurrent_requests
}
