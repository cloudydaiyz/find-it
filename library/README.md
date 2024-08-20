# vulture-lib

[View on NPM](https://www.npmjs.com/package/@cloudydaiyz/vulture-lib)

Official NPM package for the `vulture` project. This is a backend library that contains utility functions for interacting with various games via MongoDB Atlas database.

In order for the functions to run correctly, you must have these environment variables set:
- `ACCESS_TOKEN_KEY` - string for your access token key
- `REFRESH_TOKEN_KEY` - string for your refresh token key
- `ADMIN_CODES` - comma separated admin codes (e.g. `"h3ll0,w0rld"`)

And, make sure to run the `setClient(uri)` function, providing the URI of your MongoDB database as `uri`, before using any other functions from this library.

## Main Commands
Make sure you have at least `npm` v20.x installed.
- Testing: `npm test`
- Building: `npm run build`