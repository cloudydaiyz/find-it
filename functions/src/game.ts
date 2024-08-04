import { viewPlayer } from "@cloudydaiyz/game-engine-lib";
import { Context, LambdaFunctionURLHandler } from "aws-lambda";
import { ObjectId } from "mongodb";

export const handler: LambdaFunctionURLHandler = async(event) => {
    event.headers = {};
    
    viewPlayer(new ObjectId(""), "");
    return {

    };
}

