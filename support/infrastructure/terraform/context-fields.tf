# Context fields are intentionally NOT managed here anymore.
#
# This workshop wants `region` (and a new `email` field) to be PROJECT-SCOPED, so they
# only show up in this project's strategy/segment editors. The official Unleash Terraform
# provider's `unleash_context_field` has no `project` argument — it can only create
# instance-global fields. So both fields are created project-scoped by the TypeScript
# provisioner instead (the provisioner's setup/context-fields.ts),
# which POSTs /api/admin/context with the `project` field the Admin API supports.
#
# `region` used to live here as a global field; removing it lets `terraform apply` drop the
# global copy so the provisioner can recreate it project-scoped (a context-field name can't
# be both global and project-scoped at once).
