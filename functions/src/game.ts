import { setClient, createGame, getGame, restartGame, startGame, stopGame, listPublicGames, getPublicGame } from "@cloudydaiyz/game-engine-lib";
import { LambdaFunctionURLHandler } from "aws-lambda";
import { Path } from "path-parser";
import assert from "assert";
import { MongoClient } from "mongodb";

const gamePath = Path.createPath('/game');
const specificGamePath = Path.createPath('/game/:gameid');

setClient(new MongoClient(process.env["MONGODB_CONNECTION_STRING"]!));

export const handler: LambdaFunctionURLHandler = async(event) => {
    const path = event.requestContext.http.path;
    const method = event.requestContext.http.method;
    let publicVisibility = event.queryStringParameters?.public == "false" ? false : true;
    let result = {};

    try {
        const gamePathTest = gamePath.test(path);
        const specificGamePathTest = specificGamePath.test(path);

        if(gamePathTest) {
            if(method == "GET") {
                result = { games: await listPublicGames() };
            } else if(method == "POST") {
                assert(event.body, "Must have an event body for this operation");
                assert(event.headers.token != undefined, "Must have a token for this operation");
                const body = JSON.parse(event.body!);
                result = await createGame(event.headers.token, body.settings, body.tasks);
            } else {
                throw new Error("Method undefined for this operation");
            }
        } else if(specificGamePathTest) {
            if(method == "GET") {
                if(publicVisibility) {
                    result = await getPublicGame(specificGamePathTest.gameid);
                } else {
                    assert(event.headers.token != undefined, "Must have a token for this operation");
                    result = await getGame(event.headers.token, specificGamePathTest.gameid);
                }
            } else if(method == "POST") {
                assert(event.body, "Must have an event body for this operation");
                assert(event.headers.token != undefined, "Must have a token for this operation");

                const body = JSON.parse(event.body!);
                if(body.action == "start") {
                    result = await startGame(event.headers.token, specificGamePathTest.gameid);
                } else if(body.action == "stop") {
                    result = await stopGame(event.headers.token, specificGamePathTest.gameid);
                } else if(body.action == "restart") {
                    result = await restartGame(event.headers.token, specificGamePathTest.gameid);
                } else {
                    throw new Error("Invalid action");
                }
            } else {
                throw new Error("Method undefined for this operation");
            }
        } else {
            throw new Error("Invalid path");
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