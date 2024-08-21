import { setClient, login, signup, getClient, refresh, deleteUser } from "@cloudydaiyz/vulture-lib";
import { LambdaFunctionURLHandler } from "aws-lambda";
import { Path } from "path-parser";
import assert from "assert";
import { z } from "zod";

const loginParser = z.object({
    username: z.string(),
    password: z.string()
});

const refreshParser = z.object({
    refreshToken: z.string()
});

const registerPath = Path.createPath('/register');
const loginPath = Path.createPath('/login');
const refreshPath = Path.createPath('/refresh');
const userPath = Path.createPath('/user/:username');

const c = setClient();

export const handler: LambdaFunctionURLHandler = async(event) => {
    await c;
    
    const path = event.requestContext.http.path;
    const method = event.requestContext.http.method;
    let result = {};

    try {
        const registerPathTest = registerPath.test(path);
        const loginPathTest = loginPath.test(path);
        const refreshPathTest = refreshPath.test(path);
        const userPathTest = userPath.test(path);

        if(method == "POST") {
            assert(event.body, "Must have an event body for this operation");
            const body = JSON.parse(event.body);

            if(registerPathTest) {
                assert(loginParser.safeParse(body).success, "Invalid body");
                await signup(body.username, body.password);
                result = { message: "User registered successfully" };
            } else if(loginPathTest) {
                assert(loginParser.safeParse(body).success, "Invalid body");
                result = await login(body.username, body.password);
            } else if(refreshPathTest) {
                assert(refreshParser.safeParse(body).success, "Invalid body");
                result = await refresh(body.refreshToken);
            } else {
                throw new Error("Invalid path");
            }
        } else if(method == "DELETE") {
            if(userPathTest) {
                assert(event.headers.code, "Must have an admin code for this operation");
                await deleteUser(event.headers.code, userPathTest.username);
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