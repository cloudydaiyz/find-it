# scripts
Utility scripts to speed up commands. 

## Scripts
Make sure you have `terraform`, at least `node` v20.x, at least `python` v3.10, and the respective Python dependencies installed from `requirements.txt` before running the scripts.
- `update_infra.py` - Updates the cloud infrastructure (CRUD). For more information, use the `-h` command line argument.
- `test_infra.py` - Runs tests on the deployed cloud infrastructure. Make sure that the cloud infrastructure is deployed first before running this, by running the `update_infra` script.

## Testing
To perform an end-to-end test on the deployed infrastructure,
1. Ensure that the infrastructure is already deployed by running `python update_infra.py` with no arguments
2. Run the test code by running `python -m pytest`

Check out the [pytest documentation](https://docs.pytest.org/en/stable/how-to/usage.html) for additional ways to invoke tests.