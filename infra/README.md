Run:
`mkdir -p stage/zip stage/layer/nodejs`

`cd ../functions && npm run prod && cd ../infra`

`cp -r ../functions/node_modules ./stage/layer/nodejs/node_modules`

`terraform apply --auto-approve`