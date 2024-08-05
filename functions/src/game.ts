import { } from "@cloudydaiyz/game-engine-lib";
import { Context, LambdaFunctionURLHandler } from "aws-lambda";
import { ObjectId } from "mongodb";
import assert from "assert";

export const handler: LambdaFunctionURLHandler = async(event) => {
    const tokens = event.rawPath.split("/");
    let resBody: string;

    try {

        assert(event.headers.token != undefined, "Must have a token for this operation");
        resBody = "hi";
    } catch(e) {
        return {
            statusCode: 400,
            message: (e as Error).message
        };
    }

    return {
        statusCode: 200,
        body: resBody
    };
}

