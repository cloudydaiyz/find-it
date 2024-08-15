# cloud
AWS cloud infrastructure. This contains 4 lambda functions, `auth`, `game`, `players`, and `tasks`, which provides the backend for the project. Additionally produces an `endpoints.js` file that can be used on the frontend to connect to the backend. 

## Main commands
While `terraform plan`, `terraform apply`, and `terraform destroy` work fine here, it's recommending to update the infrastructure via the scripts in the `/scripts` folder. For more information, look at the folder [here](../scripts/).