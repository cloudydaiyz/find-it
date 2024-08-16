import { setClient, createGame, getGame, restartGame, startGame, stopGame, listPublicGames, getPublicGame, GameSettings } from "@cloudydaiyz/vulture-lib";
import { LambdaFunctionURLHandler } from "aws-lambda";
import { Path } from "path-parser";
import { z } from "zod";
import assert from "assert";

assert(process.env["MONGODB_CONNECTION_STRING"], "Invalid MongoDB connection string");

const c = setClient(process.env["MONGODB_CONNECTION_STRING"]);

// Type checking GameSettings, will be moved into lib soon
const gameSettingsParser = z.object({
    name: z.string(),
    duration: z.number(),
    startTime: z.number(),
    endTime: z.number(),
    ordered: z.boolean(),
    minPlayers: z.number(),
    maxPlayers: z.number(),
    joinMidGame: z.boolean(),
    numRequiredTasks: z.number(),
});

// Type checking TaskSchema, will be moved into lib soon
const taskSchemaParser = z.object({
    // _id: ObjectId, Unneeded since createGame already generates an ID
    type: z.literal("multiple choice").or(z.literal("text")),
    question: z.string(),
    clue: z.string(),
    answerChoices: z.string().array(),
    answers: z.number().array(),

    attempts: z.number(),
    required: z.boolean(),
    points: z.number(),
    scalePoints: z.boolean()
}).array();

const gamePath = Path.createPath('/game');
const specificGamePath = Path.createPath('/game/:gameid');

export const handler: LambdaFunctionURLHandler = async(event) => {
    await c;
    
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

                const body = JSON.parse(event.body);
                assert(gameSettingsParser.safeParse(body.settings).success, "Invalid game settings");
                assert(taskSchemaParser.safeParse(body.tasks).success, "Invalid tasks");
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

                const body = JSON.parse(event.body);
                
                if(body.action == "start") {
                    result = await startGame(event.headers.token, specificGamePathTest.gameid);
                } else if(body.action == "stop") {
                    result = await stopGame(event.headers.token, specificGamePathTest.gameid);
                } else if(body.action == "restart") {
                    result = await restartGame(event.headers.token, specificGamePathTest.gameid as string);
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