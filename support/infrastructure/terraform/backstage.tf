# Authenticated entity for the isolated Backstage example
# (`other-examples/backstage-with-unleash`). The GlobalLogic Unleash plugin reads flags through
# the Unleash Admin API, so it needs a SERVICE ACCOUNT token — not an SDK token.
#
# The Viewer root role keeps the account READ-ONLY across the instance: Backstage can list
# projects and display their flags, but cannot toggle anything (flag state stays enforced
# server-side, as everywhere else in this repo). To narrow which projects Backstage sees, swap
# the Viewer root role for a custom root role with explicit project access.

resource "unleash_service_account" "backstage" {
  name      = "Backstage Unleash plugin"
  username  = "backstage-unleash-plugin"
  root_role = data.unleash_role.viewer.id # read-only across the instance
}

resource "unleash_service_account_token" "backstage" {
  description        = "Token for the Backstage Unleash plugin (other-examples/backstage-with-unleash)"
  expires_at         = "2027-01-01T00:00:00Z"
  service_account_id = unleash_service_account.backstage.id
}
