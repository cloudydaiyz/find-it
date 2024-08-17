import { setClient, joinGame, leaveGame, viewAllPlayers, viewAllPublicPlayers, viewPlayer, viewPublicPlayer } from "@cloudydaiyz/vulture-lib";
import { LambdaFunctionURLHandler } from "aws-lambda";
import { Path } from "path-parser";
import assert from "assert";
import { z } from "zod";

assert(process.env["MONGODB_CONNECTION_STRING"], "Invalid MongoDB connection string");

const playersPath = Path.createPath('/games/:gameid/players');
const playerPath = Path.createPath('/games/:gameid/players/:username');

const joinGameBodyParser = z.object({
    role: z.enum(["player", "admin"]),
    code: z.string().optional()
});

const c = setClient(process.env["MONGODB_CONNECTION_STRING"]);

export const handler: LambdaFunctionURLHandler = async(event) => {
    await c;
    
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
                    result = await viewAllPublicPlayers(playersPathTest.gameid);
                } else {
                    assert(event.headers.token != undefined, "Must have a token for this operation");
                    result = await viewAllPlayers(event.headers.token, playersPathTest.gameid);
                }
            } else if(method == "DELETE") {
                assert(event.headers.token != undefined, "Must have a token for this operation");
                await leaveGame(event.headers.token, playersPathTest.gameid);
                result = { message: "Left game successfully" };
            } else if(method == "POST") {
                assert(event.body, "Must have an event body for this operation");
                assert(event.headers.token != undefined, "Must have a token for this operation");

                const body = JSON.parse(event.body);
                assert(joinGameBodyParser.safeParse(body).success, "Invalid body");
                result = await joinGame(event.headers.token, playersPathTest.gameid, body.role, body.code);
            } else {
                throw new Error("Invalid request method");
            }
        } else if(playerPathTest) {
            if(method == "GET") {
                if(publicVisibility) {
                    result = await viewPublicPlayer(playerPathTest.gameid, playerPathTest.username);
                } else {
                    assert(event.headers.token != undefined, "Must have a token for this operation");
                    
                    const player = await viewPlayer(event.headers.token, playerPathTest.gameid, playerPathTest.username);
                    if(!player) throw new Error("Unable to find player");
                    
                    result = player;
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
            body: (e as Error).message
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(result)
    };
}