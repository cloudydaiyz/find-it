# find-it

Scavenger hunt game. This repository contains the frontend, backend, and infrastructure for the project.

## Prerequisites

- `terraform`
- `node` 20.x,
- `python` ^3.10, and the respective Python dependencies installed from `requirements.txt`
- `aws` CLI with [credentials configured](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)

## Set Up

1. Create a [MongoDB Organization](https://www.mongodb.com/docs/cloud-manager/tutorial/manage-organizations/#create-an-organization)
2. Retrieve your account ID from the organization (or the account ID you want as the project owner) using the [`Get All Organization Users`](https://www.mongodb.com/docs/cloud-manager/reference/api/organizations/organization-get-all-users/) request:

```
curl -i -u "<username>:<apiKey>" --digest \
  "https://cloud.mongodb.com/api/public/v1.0/orgs/<orgId>/users?pretty=true"
```

3. Create a `variables.tfvars` file in the `/cloud` directory, providing the corresponding definitions for the variables declared in [`/cloud/variables.tf`](/cloud/variables.tf). View [the docs](https://developer.hashicorp.com/terraform/language/values/variables#variable-definitions-tfvars-files) for more about `.tfvar` files.
4. `cd` into the `/scripts` directory, and run `python update_infra.py` to deploy the infrastructure for the backend.

## Debugging

Debugging configurations for VSCode is enabled for this project in `.vscode/launch.json`. View [Debugging in VSCode](https://code.visualstudio.com/docs/editor/debugging) for more about launch configurations.

- `test-library` starts the debugging tool for the tests in the `/library` folder
- `test-functions` starts the debugging tool for the tests in the `/functions` folder
