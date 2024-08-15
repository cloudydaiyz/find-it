# scripts
Utility scripts to speed up commands. 

## Scripts
Make sure you have `terraform`, at least `node` version 20, at least `python` version 3.10, and the respective Python dependencies installed from `requirements.txt` before running the scripts.
- `update_infra.py` - Updates the cloud infrastructure (CRUD). For more information, use the `-h` command line argument.
- `test_infra.py` - Runs tests on the deployed cloud infrastructure. Make sure that the cloud infrastructure is deployed first before running this, by running the `update_infra` script.