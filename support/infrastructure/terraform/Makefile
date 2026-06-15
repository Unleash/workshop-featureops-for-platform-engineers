# Terraform project that provisions Unleash application tokens.
.PHONY: fmt lint build apply destroy

fmt:
	terraform fmt -recursive

lint: fmt
	terraform init -backend=false -input=false
	terraform validate

build: lint
	terraform plan -input=false

apply:
	terraform init -input=false
	terraform apply -auto-approve -input=false

destroy:
	terraform destroy -auto-approve -input=false
