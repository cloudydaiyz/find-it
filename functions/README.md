# functions
Backend API containing AWS Lambda function definitions.

## Main Commands
Make sure you have at least `npm` v20.x installed.
- Testing: `npm test`
- Building: `npm run build`
- Preparing package to be deployed to AWS: `npm run prod`

## Scripts
- `rename-js-to-mjs.js` - Renames `.js` files to `.mjs` in the `/handlers` folder. Called by `npm run build` to ensure the produced files can run properly in AWS