# scripts
Utility scripts to speed up commands. Make sure that you satisfy the `Prerequisites` and followed the steps defined in the `Set Up` section from [`README.md`](../README.md) before running scripts.

## Scripts
- `update_infra.py` - Updates the cloud infrastructure (CRUD). For more information, use the `-h` command line argument.
- `test_infra.py` - Runs tests on the deployed cloud infrastructure. Make sure that the cloud infrastructure is deployed first before running this, by running the `update_infra` script.

## Testing
To perform an end-to-end test on the deployed infrastructure,
1. Ensure that the infrastructure is already deployed by running `python update_infra.py` with no arguments
2. Create a `secret.py` file in this directory with the following variables defined:
```
profile = "..." # profile configured in aws cli
region = "..." # region configured in aws cli
admincode = "..." # an admin code you defined in /cloud/variables.tfvars
```
3. Run the test code by running `python -m pytest`

Check out the [pytest documentation](https://docs.pytest.org/en/stable/how-to/usage.html) for additional ways to invoke tests.