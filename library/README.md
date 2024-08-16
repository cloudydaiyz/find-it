# vulture-lib
Official NPM package for the `vulture` project. This is a backend library that contains utility functions for interacting with various games via MongoDB Atlas database.

In order for the functions to run correctly, you must have these environment variables set:
- `MONGODB_CONNECTION_STRING` - URL for MongoDB Atlas database
- `ACCESS_TOKEN_KEY` - string for your access token key
- `REFRESH_TOKEN_KEY` - string for your refresh token key
- `ADMIN_CODES` - comma separated admin codes (e.g. `"h3ll0,w0rld"`)

## Main Commands
Make sure you have at least `npm` v20.x installed.
- Testing: `npm test`
- Building: `npm run build`