import { setClient, viewAllTasks, viewAllPublicTasks, viewTask, viewPublicTask, submitTask } from "@cloudydaiyz/game-engine-lib";
import { LambdaFunctionURLHandler } from "aws-lambda";
import { Path } from "path-parser";
import assert from "assert";
import { MongoClient, ObjectId } from "mongodb";
import { z } from "zod";

const tasksPath = Path.createPath('/game/:gameid/tasks');
const taskPath = Path.createPath('/game/:gameid/tasks/:taskid');
const submitPath = Path.createPath('/game/:gameid/tasks/:taskid/submit');

const answersParser = z.string().array();

const c = setClient(new MongoClient(process.env["MONGODB_CONNECTION_STRING"]!));

export const handler: LambdaFunctionURLHandler = async(event) => {
    await c;
    
    const path = event.requestContext.http.path;
    const method = event.requestContext.http.method;
    let publicVisibility = event.queryStringParameters?.public == "false" ? false : true;
    let result = {};

    try {
        const tasksPathTest = tasksPath.test(path);
        const taskPathTest = taskPath.test(path);
        const submitPathTest = submitPath.test(path);

        if(tasksPathTest) {
            if(method == "GET") {
                if(publicVisibility) {
                    result = await viewAllPublicTasks(new ObjectId(tasksPathTest.gameid as string));
                } else {
                    assert(event.headers.token != undefined, "Must have a token for this operation");
                    result = await viewAllTasks(event.headers.token, new ObjectId(tasksPathTest.gameid as string));
                }
            } else {
                throw new Error("Invalid request method");
            }
        } else if(taskPathTest) {
            if(method == "GET") {
                if(publicVisibility) {
                    result = await viewPublicTask(new ObjectId(taskPathTest.gameid as string), new ObjectId(taskPathTest.taskid as string));
                } else {
                    assert(event.headers.token != undefined, "Must have a token for this operation");
                    result = await viewTask(event.headers.token, new ObjectId(taskPathTest.gameid as string), new ObjectId(taskPathTest.taskid as string));
                }
            } else {
                throw new Error("Invalid request method");
            }
        } else if(submitPathTest) {
            if(method == "POST") {
                assert(event.headers.token != undefined, "Must have a token for this operation");
                assert(event.body, "Must have a request body");

                const parsedBody = JSON.parse(event.body);
                assert(answersParser.safeParse(parsedBody.answers).success, "Invalid body");

                result = await submitTask(event.headers.token, new ObjectId(submitPathTest.gameid as string), new ObjectId(submitPathTest.taskid as string), parsedBody.answers);
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