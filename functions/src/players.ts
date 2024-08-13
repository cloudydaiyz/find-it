import { setClient, joinGame, leaveGame, viewAllPlayers, viewAllPublicPlayers, viewPlayer, viewPublicPlayer } from "@cloudydaiyz/game-engine-lib";
import { LambdaFunctionURLHandler } from "aws-lambda";
import { Path } from "path-parser";
import assert from "assert";
import { MongoClient, ObjectId } from "mongodb";
import { z } from "zod";

const playersPath = Path.createPath('/game/:gameid/players');
const playerPath = Path.createPath('/game/:gameid/players/:username');

const joinGameBodyParser = z.object({
    role: z.enum(["player", "admin"]),
    code: z.string().optional()
});

const c = setClient(new MongoClient(process.env["MONGODB_CONNECTION_STRING"]!));

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
                    result = await viewAllPublicPlayers(new ObjectId(playersPathTest.gameid as string));
                } else {
                    assert(event.headers.token != undefined, "Must have a token for this operation");
                    result = await viewAllPlayers(event.headers.token, new ObjectId(playersPathTest.gameid as string));
                }
            } else if(method == "DELETE") {
                assert(event.headers.token != undefined, "Must have a token for this operation");
                await leaveGame(event.headers.token, new ObjectId(playersPathTest.gameid as string));
                result = { message: "Left game successfully" };
            } else if(method == "POST") {
                assert(event.body, "Must have an event body for this operation");
                assert(event.headers.token != undefined, "Must have a token for this operation");

                const body = JSON.parse(event.body);
                assert(joinGameBodyParser.safeParse(body).success, "Invalid body");
                result = await joinGame(event.headers.token, new ObjectId(playersPathTest.gameid as string), body.role, body.code);
            } else {
                throw new Error("Invalid request method");
            }
        } else if(playerPathTest) {
            if(method == "GET") {
                if(publicVisibility) {
                    result = await viewPublicPlayer(playerPathTest.gameid, playerPathTest.username);
                } else {
                    assert(event.headers.token != undefined, "Must have a token for this operation");
                    
                    const player = await viewPlayer(event.headers.token, new ObjectId(playerPathTest.gameid as string), playerPathTest.username);
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