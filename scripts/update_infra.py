desc = \
"""
Utility program that updates the infrastructure for the app. 
Note that you must have a variable.tfvars file defined in the /infra directory.
"""

from pathlib import Path
import subprocess
import shutil
import argparse
import json

def main(args):
    functions_dir = (Path(__file__).parent / ".." / "functions").resolve()
    infra_dir = (Path(__file__).parent / ".." / "cloud").resolve()

    if(args['plan']):
        # `npm run build`
        subprocess.run(["npm", "run", "build"], cwd=str(functions_dir))

        # `terraform plan -var-file="variables.tfvars"`
        subprocess.run(["terraform", "plan", "-var-file=variables.tfvars"], cwd=str(infra_dir))
        return
    
    if(args['output']):
        # `terraform output -json`
        out = subprocess.run(["terraform", "output", "-json"], cwd=str(infra_dir), capture_output=True, text=True)
        # print(out.args)
        # print(out.returncode)

        return json.loads(out.stdout)
    
    if(not args['no_prod'] and not args['destroy']):
        # `mkdir -p stage/zip stage/layer/nodejs`
        stage_zip_dir = infra_dir / "stage" / "zip"
        stage_zip_dir.mkdir(parents=True, exist_ok=True)

        stage_nodejs_dir = infra_dir / "stage" / "layer" / "nodejs"
        stage_nodejs_dir.mkdir(parents=True, exist_ok=True)

        # `cd ../functions && npm run prod && cd ../infra`
        subprocess.run(["npm", "run", "prod"], cwd=str(functions_dir))

        # `cp -r ../functions/node_modules ./stage/layer/nodejs/node_modules`
        shutil.copytree(functions_dir / "node_modules", stage_nodejs_dir / "node_modules", dirs_exist_ok=True)

    if(args['destroy']):
        # `terraform destroy -var-file="variables.tfvars" --auto-approve`
        subprocess.run(["terraform", "destroy", "-var-file=variables.tfvars", "--auto-approve"], cwd=str(infra_dir))
    else:
        # `terraform apply -var-file="variables.tfvars" --auto-approve`
        subprocess.run(["terraform", "apply", "-var-file=variables.tfvars", "--auto-approve"], cwd=str(infra_dir))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=desc)
    parser.add_argument("--plan", action="store_true", help="Include if you only want a plan of the TF configuration")
    parser.add_argument("--output", action="store_true", help="Include if you only want the output of the current TF configuration")
    parser.add_argument("--no-prod", action="store_true", help="Include if you don't want to run `npm run prod`")
    parser.add_argument("--destroy", action="store_true", help="Include if you want to destroy the current TF configuration")
    args = vars(parser.parse_args())

    main(args)