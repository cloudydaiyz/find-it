import { setClient, createGame, getGame, restartGame, startGame, stopGame, listPublicGames, getPublicGame, GameSettings, deleteGame } from "@cloudydaiyz/vulture-lib";
import { LambdaFunctionURLHandler } from "aws-lambda";
import { Path } from "path-parser";
import { z } from "zod";
import assert from "assert";

assert(process.env["MONGODB_CONNECTION_STRING"], "Invalid MongoDB connection string");
const c = setClient(process.env["MONGODB_CONNECTION_STRING"]);

// Constants
const MAX_TASKS = 20;
const MAX_PLAYERS = 100;

// Type checking GameSettings, will be moved into lib soon
const gameSettingsParser = z.object({
    name: z.string(),
    duration: z.number().nonnegative(),
    startTime: z.number().nonnegative(),
    ordered: z.boolean(),
    minPlayers: z.number().nonnegative().max(MAX_PLAYERS),
    maxPlayers: z.number().min(1).max(MAX_PLAYERS),
    joinMidGame: z.boolean(),
    numRequiredTasks: z.number().nonnegative().max(MAX_TASKS),
}).refine(obj => obj.minPlayers <= obj.maxPlayers);

/**
 * Type checking TaskSchema, will be moved into lib soon
 * 
 * taskSchemaParser constraints:
 * - Each item in `answers` must be unique and less than the # of answer choices
 * - `answers` length must be less than `answerChoices` length
 */
const taskSchemaParser = z.object({
    type: z.literal("multiple choice").or(z.literal("text")),
    question: z.string(),
    clue: z.string(),
    answerChoices: z.string().array(),
    answers: z.number().nonnegative().array(), 

    attempts: z.number().nonnegative().min(1),
    required: z.boolean(),
    points: z.number(),
    scalePoints: z.boolean()
}).refine(obj => obj.answers.length < obj.answerChoices.length 
    && obj.answers.sort() // this might be expensive, but it speeds up validating uniqueness
    && obj.answers.every((val, i, arr) => val < obj.answerChoices.length && (i == arr.length - 1 || val != arr[i + 1]))
).array().max(MAX_TASKS);

/**
 * createGame constraints:
 * - scalePoints must be false if the game has an indefinite duration
 */
const createGameParser = z.object({
    settings: gameSettingsParser,
    tasks: taskSchemaParser
}).refine(obj => obj.tasks.every(t => obj.settings.duration != 0 || !t.scalePoints)
    && obj.settings.numRequiredTasks <= obj.tasks.length
);

const gamesPath = Path.createPath('/games');
const specificGamePath = Path.createPath('/games/:gameid');

export const handler: LambdaFunctionURLHandler = async(event, context) => {
    await c;

    const path = event.requestContext.http.path;
    const method = event.requestContext.http.method;
    let publicVisibility = event.queryStringParameters?.public == "false" ? false : true;
    let result = {};

    try {
        const gamePathTest = gamesPath.test(path);
        const specificGamePathTest = specificGamePath.test(path);

        if(gamePathTest) {
            if(method == "GET") {
                result = { games: await listPublicGames() };
            } else if(method == "POST") {
                assert(event.body, "Must have an event body for this operation");
                assert(event.headers.token != undefined, "Must have a token for this operation");

                const body = JSON.parse(event.body);
                assert(createGameParser.safeParse(body).success, "Invalid body");
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
                    result = await restartGame(event.headers.token, specificGamePathTest.gameid);
                } else {
                    throw new Error("Invalid action");
                }
            } else if(method == "DELETE") {
                assert(event.headers.token != undefined, "Must have a token for this operation");
                result = await deleteGame(event.headers.token, specificGamePathTest.gameid);
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