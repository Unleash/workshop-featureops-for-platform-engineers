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
}
