import { setClient, viewAllTasks, viewAllPublicTasks, viewTask, viewPublicTask, submitTask } from "@cloudydaiyz/vulture-lib";
import { LambdaFunctionURLHandler } from "aws-lambda";
import { Path } from "path-parser";
import assert from "assert";
import { z } from "zod";

const tasksPath = Path.createPath('/games/:gameid/tasks');
const taskPath = Path.createPath('/games/:gameid/tasks/:taskid');
const submitPath = Path.createPath('/games/:gameid/tasks/:taskid/submit');

const answersParser = z.string().array();

const c = setClient();

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
                    result = await viewAllPublicTasks(tasksPathTest.gameid);
                } else {
                    assert(event.headers.token != undefined, "Must have a token for this operation");
                    result = await viewAllTasks(event.headers.token, tasksPathTest.gameid);
                }
            } else {
                throw new Error("Invalid request method");
            }
        } else if(taskPathTest) {
            if(method == "GET") {
                if(publicVisibility) {
                    result = await viewPublicTask(taskPathTest.gameid, taskPathTest.taskid);
                } else {
                    assert(event.headers.token != undefined, "Must have a token for this operation");
                    result = await viewTask(event.headers.token, taskPathTest.gameid, taskPathTest.taskid);
                }
            } else {
                throw new Error("Invalid request method");
            }
        } else if(submitPathTest) {
            if(method == "POST") {
                assert(event.headers.token != undefined, "Must have a token for this operation");
                assert(event.body, "Must have a request body");

                const body = JSON.parse(event.body);
                assert(answersParser.safeParse(body.answers).success, "Invalid body");

                result = await submitTask(event.headers.token, submitPathTest.gameid, submitPathTest.taskid, body.answers);
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