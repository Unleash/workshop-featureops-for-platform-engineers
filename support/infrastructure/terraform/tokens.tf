# The application SDK tokens (one frontend + one client token per environment, per project) are
# deliberately not managed here.
#
# Since Unleash 8.2, API tokens are "secure": a token's secret is returned only by the call that
# creates it — every list, in the API and the UI alike, shows a short id instead, which the SDK
# endpoints reject with 401. A token Terraform creates ahead of time is therefore one the attendee
# can never read, let alone copy into their .env.
#
# Instead, `make workshop-configure` creates the four tokens as the attendee (Owner of their
# project, so it holds CREATE_PROJECT_API_TOKEN) and writes each secret straight from the create
# response into .env. `make unleash-destroy` deletes them again (unleash-provisioner, destroy),
# before `terraform destroy` removes the project.
