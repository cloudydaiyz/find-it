import { joinGame, leaveGame, viewAllPlayers, viewAllPublicPlayers, viewPlayer, viewPublicPlayer } from "@cloudydaiyz/game-engine-lib";
import { LambdaFunctionURLHandler } from "aws-lambda";
import { Path } from "path-parser";
import assert from "assert";

const playersPath = Path.createPath('/game/:gameid/players');
const playerPath = Path.createPath('/game/:gameid/players/:username');

export const handler: LambdaFunctionURLHandler = async(event) => {
    const path = event.requestContext.http.path;
    const method = event.requestContext.http.method;
    let publicVisibility = event.queryStringParameters?.public == "false" ? false : true;
    let result = {};

    try {
        const playersPathTest = playersPath.test(path);
        const playerPathTest = playerPath.test(path);

        if(playersPathTest) {
            if(method == "GET") {
                if(publicVisibility) {
                    result = await viewAllPublicPlayers(playersPathTest!.gameid);
                } else {
                    assert(event.headers.token != undefined, "Must have a token for this operation");
                    result = await viewAllPlayers(event.headers.token, playersPathTest!.gameid);
                }
            } else if(method == "DELETE") {
                assert(event.headers.token != undefined, "Must have a token for this operation");
                await leaveGame(event.headers.token, playersPathTest!.gameid);
            } else if(method == "POST") {
                assert(event.headers.token != undefined, "Must have a token for this operation");

                const body = event.body ? JSON.parse(event.body).code : undefined;
                await joinGame(event.headers.token, playersPathTest!.gameid, body);
            } else {
                throw new Error("Invalid request method");
            }
        } else if(playerPathTest) {
            if(method == "GET") {
                if(publicVisibility) {
                    result = await viewPublicPlayer(playerPathTest!.gameid, playerPathTest!.username);
                } else {
                    assert(event.headers.token != undefined, "Must have a token for this operation");
                    result = (await viewPlayer(event.headers.token, playerPathTest!.gameid, playerPathTest!.username))!;
                }
            } else {
                throw new Error("Invalid request method");
            }
        } else {
            throw new Error("Invalid path");
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