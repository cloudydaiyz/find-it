import { setClient, login, signup, getClient } from "@cloudydaiyz/game-engine-lib";
import { LambdaFunctionURLHandler } from "aws-lambda";
import { Path } from "path-parser";
import assert from "assert";
import { MongoClient } from "mongodb";

const registerPath = Path.createPath('/register');
const loginPath = Path.createPath('/login');

console.log(process.env["MONGODB_CONNECTION_STRING"]);
const c = setClient(new MongoClient(process.env["MONGODB_CONNECTION_STRING"]!));

export const handler: LambdaFunctionURLHandler = async(event) => {
    await c;
    
    const path = event.requestContext.http.path;
    const method = event.requestContext.http.method;
    let result = {};

    try {
        const registerPathTest = registerPath.test(path);
        const loginPathTest = loginPath.test(path);

        assert(event.body, "Must have an event body for this operation");
        const body = JSON.parse(event.body);
        
        if(method == "POST") {
            if(registerPathTest) {
                await signup(body.username, body.password);
                result = { message: "User registered successfully" };
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
            body: (e as Error).message
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(result)
    };
}