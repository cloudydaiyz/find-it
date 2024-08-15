# vulture-lib
Official NPM package for my `vulture` project. This is a backend library that contains utility functions for interacting with the state of various games via MongoDB Atlas database.

In order for the functions to run correctly, you must have these environment variables set:
- `MONGODB_CONNECTION_STRING` - URL for MongoDB Atlas database
- `ACCESS_TOKEN_KEY` - string for your access token key
- `REFRESH_TOKEN_KEY` - string for your refresh token key
- `ADMIN_CODES` - comma separated admin codes (e.g. `"h3ll0,w0rld"`)