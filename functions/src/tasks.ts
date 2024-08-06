import { viewAllTasks, viewAllPublicTasks, viewTask, viewPublicTask, submitTask } from "@cloudydaiyz/game-engine-lib";
import { LambdaFunctionURLHandler } from "aws-lambda";
import { Path } from "path-parser";
import assert from "assert";

const tasksPath = Path.createPath('/game/:gameid/tasks');
const taskPath = Path.createPath('/game/:gameid/tasks/:taskid');
const submitPath = Path.createPath('/game/:gameid/tasks/:taskid/submit');

export const handler: LambdaFunctionURLHandler = async(event) => {
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
                    result = await viewAllPublicTasks(tasksPathTest!.gameid);
                } else {
                    assert(event.headers.token != undefined, "Must have a token for this operation");
                    result = await viewAllTasks(event.headers.token, tasksPathTest!.gameid);
                }
            } else {
                throw new Error("Invalid request method");
            }
        } else if(taskPathTest) {
            if(method == "GET") {
                if(publicVisibility) {
                    result = await viewPublicTask(taskPathTest!.gameid, taskPathTest!.taskid);
                } else {
                    assert(event.headers.token != undefined, "Must have a token for this operation");
                    result = await viewTask(event.headers.token, taskPathTest!.gameid, taskPathTest!.taskid);
                }
            } else {
                throw new Error("Invalid request method");
            }
        } else if(submitPathTest) {
            if(method == "POST") {
                assert(event.headers.token != undefined, "Must have a token for this operation");
                assert(event.body, "Must have a request body");

                await submitTask(event.headers.token, taskPathTest!.gameid, taskPathTest!.taskid, JSON.parse(event.body).answers);
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