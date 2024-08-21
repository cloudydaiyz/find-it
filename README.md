# vulture
Scavenger hunt game. This repository contains the frontend, backend, and infrastructure.

## Prerequisites
- `terraform`
- `node` 20.x, 
- `python` ^3.10, and the respective Python dependencies installed from `requirements.txt`
- `aws` CLI with [credentials configured](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)

## Set Up
1. Create a MongoDB Atlas Organization
2. Retrieve your account ID from the organization (or the account ID you want as the project owner) using the `Get All Organization Users` request:
```
curl -i -u "username:apiKey" --digest \
  "https://cloud.mongodb.com/api/public/v1.0/orgs/59db8d1d87d9d6420df0613f/users?pretty=true"
```
For more information, look at [the docs](https://www.mongodb.com/docs/cloud-manager/reference/api/organizations/organization-get-all-users/).
3. Create a `variables.tfvars` file in the `/cloud` directory, providing the corresponding definitions for the variables declared in [`/cloud/variables.tf`](/cloud/variables.tf). For more information, look at [the docs](https://developer.hashicorp.com/terraform/language/values/variables#variable-definitions-tfvars-files).
4. `cd` into the `/scripts` directory, and run `python update_infra.py` to deploy the infrastructure for the backend.