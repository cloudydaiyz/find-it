import { login, signup } from "@cloudydaiyz/game-engine-lib";
import { LambdaFunctionURLHandler } from "aws-lambda";
import { Path } from "path-parser";
import assert from "assert";

const registerPath = Path.createPath('/game/:gameid/register');
const loginPath = Path.createPath('/game/:gameid/login');

export const handler: LambdaFunctionURLHandler = async(event) => {
    const path = event.requestContext.http.path;
    const method = event.requestContext.http.method;
    let result = {};

    try {
        const registerPathTest = registerPath.test(path);
        const loginPathTest = loginPath.test(path);

        assert(event.body, "Must have an event body for this operation");

        const body = JSON.parse(event.body!);
        if(method == "POST") {
            if(registerPathTest) {
                await signup(body.username, body.password);
            } else if(loginPathTest) {
                result = await login(body.username, body.password);
            } else {
                throw new Error("Invalid path");
            }
        } else {
            throw new Error("Method undefined for this operation");
        }
    } catch(e) {
        return {
            statusCode: 400,
            message: (e as Error).message
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(result)
    };
}