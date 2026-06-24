# Cloud connection — no defaults; supply via TF_VAR_unleash_base_url / TF_VAR_unleash_token.
variable "unleash_base_url" {
  description = "Cloud Unleash base URL (everything before /api)."
  type        = string
}

variable "unleash_token" {
  description = "Admin Service Account token or PAT used to provision Unleash. Never commit."
  type        = string
  sensitive   = true
}

variable "users_csv" {
  description = "CSV file (email,name,surname) listing the workshop users to create. Each row gets its own project/group/permissions/tokens; the per-user number comes from the row order."
  type        = string
  default     = "users.csv"
}

variable "unleash_max_concurrent_requests" {
  description = "Max concurrent admin API requests the Unleash provider may have in flight. The provider has no 429 retry, so 1 (fully serial) keeps large runs under the hosted rate-limit window; the provider's own default is 2 (faster, burstier). Also settable via UNLEASH_MAX_CONCURRENT_REQUESTS."
  type        = number
  default     = 2
}

variable "send_invite_emails" {
  description = "Whether to send Unleash welcome/invite emails when creating users. Set to false (e.g. when load-testing provisioning of many users) to suppress invite emails."
  type        = bool
  default     = true
}

variable "facilitator_email" {
  description = "Email of the workshop facilitator/admin added to every team group to approve attendees' production change requests (attendees cannot approve their own — segregation of duties). Override via TF_VAR_facilitator_email."
  type        = string
  default     = "wojtek.gawronski@getunleash.io"
}
