import { describe, expect, afterAll, it, jest } from "@jest/globals";
import { APIGatewayProxyEventQueryStringParameters, APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, LambdaFunctionURLResult } from "aws-lambda";
import * as auth from "../src/auth";
import * as game from "../src/game";
import * as players from "../src/players";
import * as tasks from "../src/tasks";
import "dotenv/config";

// Make sure to mock BEFORE importing the functions
jest.mock("@cloudydaiyz/game-engine-lib");
jest.mock("mongodb");

import { PlayerSchema, TaskSubmissionConfirmation, login, signup } from "@cloudydaiyz/game-engine-lib";
import { createGame, getGame, restartGame, startGame, stopGame, listPublicGames, getPublicGame } from "@cloudydaiyz/game-engine-lib";
import { joinGame, leaveGame, viewAllPlayers, viewAllPublicPlayers, viewPlayer, viewPublicPlayer } from "@cloudydaiyz/game-engine-lib";
import { viewAllTasks, viewAllPublicTasks, viewTask, viewPublicTask, submitTask } from "@cloudydaiyz/game-engine-lib";
import { WithId } from "mongodb";

const exampleContext = {
        callbackWaitsForEmptyEventLoop: false,
        functionName: "",
        functionVersion: "",
        invokedFunctionArn: "",
        memoryLimitInMB: "",
        awsRequestId: "",
        logGroupName: "",
        logStreamName: "",
        getRemainingTimeInMillis: () => 0,
        done: () => {},
        fail: () => {},
        succeed: () => {}
};

const exampleCallback = () => {};

type HttpMethod = "GET" | "POST" | "DELETE" | "PUT";
type HttpHeaders = {
    [key: string]: string;
}

function createEvent(headers: HttpHeaders, path: string, method: HttpMethod, 
    body?: any, query?: APIGatewayProxyEventQueryStringParameters) {
    const event: APIGatewayProxyEventV2 = {
        version: "",
        routeKey: "",
        rawPath: "",
        rawQueryString: "",
        headers: headers,
        requestContext: {
            accountId: "",
            apiId: "",
            domainName: "",
            domainPrefix: "",
            http: {
                method: method,
                path: path,
                protocol: "",
                sourceIp: "",
                userAgent: ""
            },
            requestId: "",
            routeKey: "",
            stage: "",
            time: "",
            timeEpoch: 0
        },
        isBase64Encoded: false
    };
    if(body) event.body = JSON.stringify(body);
    if(query) event.queryStringParameters = query;
    
    return event;
}

afterAll(async () => { 
    jest.restoreAllMocks();
});

describe("auth handler tests", () => {
    it("should register a user successfully", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/game/123456/register",
            "POST",
            { username: "testuser", password: "testpass" }
        );

        const result = await auth.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(signup).toHaveBeenCalledWith("testuser", "testpass");
    });

    it("should login a user successfully", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/game/123456/login",
            "POST",
            { username: "testuser", password: "testpass" }
        );

        const result = await auth.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(login).toHaveBeenCalledWith("testuser", "testpass");
    });

    it("should return error for missing body", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/game/123456/register",
            "POST"
        );

        const result = await auth.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(400);
        expect(result.body).toBe("Must have an event body for this operation");
    });

    it("should return error for invalid path", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/game/123456/invalid",
            "POST",
            { username: "testuser", password: "testpass" }
        );

        const result = await auth.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(400);
        expect(result.body).toBe("Invalid path");
    });

    it("should return error for undefined method", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/game/123456/register",
            "GET",
            { username: "testuser", password: "testpass" }
        );

        const result = await auth.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(400);
        expect(result.body).toBe("Method undefined for this operation");
    });
});

describe("game handler tests", () => {
    it("should list public games", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/game",
            "GET"
        );

        const result = await game.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(listPublicGames).toHaveBeenCalled();
    });

    it("should create a game", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/game",
            "POST",
            { settings: { name: "test game" }, tasks: [] }
        );

        const result = await game.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(createGame).toHaveBeenCalledWith("dummy-token", { name: "test game" }, []);
    });

    it("should get a public game", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/game/123456",
            "GET",
            undefined,
            { public: "true" }
        );

        const result = await game.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(getPublicGame).toHaveBeenCalledWith("123456");
    });

    it("should get a private game", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/game/123456",
            "GET",
            undefined,
            { public: "false" }
        );

        const result = await game.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(getGame).toHaveBeenCalledWith("dummy-token", "123456");
    });

    it("should start a game", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/game/123456",
            "POST",
            { action: "start" }
        );

        const result = await game.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(startGame).toHaveBeenCalledWith("dummy-token", "123456");
    });

    it("should stop a game", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/game/123456",
            "POST",
            { action: "stop" }
        );

        const result = await game.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(stopGame).toHaveBeenCalledWith("dummy-token", "123456");
    });

    it("should restart a game", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/game/123456",
            "POST",
            { action: "restart" }
        );

        const result = await game.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(restartGame).toHaveBeenCalledWith("dummy-token", "123456");
    });

    it("should return error for missing token", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/game/123456",
            "POST",
            { action: "start" }
        );

        const result = await game.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(400);
        expect(result.body).toBe("Must have a token for this operation");
    });

    it("should return error for invalid path", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/invalid/path",
            "GET"
        );

        const result = await game.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(400);
        expect(result.body).toBe("Invalid path");
    });

    it("should return error for undefined method", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/game",
            "DELETE"
        );

        const result = await game.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(400);
        expect(result.body).toBe("Method undefined for this operation");
    });
});

describe("players handler tests", () => {
    it("should view all public players", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/game/123456/players",
            "GET",
            undefined,
            { public: "true" }
        );

        const result = await players.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(viewAllPublicPlayers).toHaveBeenCalledWith("123456");
    });

    it("should view all players for a private game", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/game/123456/players",
            "GET",
            undefined,
            { public: "false" }
        );

        const result = await players.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(viewAllPlayers).toHaveBeenCalledWith("dummy-token", "123456");
    });

    it("should join a game", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/game/123456/players",
            "POST",
            { code: "test-code" }
        );

        const result = await players.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(joinGame).toHaveBeenCalledWith("dummy-token", "123456", "test-code");
    });

    it("should leave a game", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/game/123456/players",
            "DELETE"
        );

        const result = await players.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(leaveGame).toHaveBeenCalledWith("dummy-token", "123456");
    });

    it("should view a public player", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/game/123456/players/testuser",
            "GET",
            undefined,
            { public: "true" }
        );

        const result = await players.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(viewPublicPlayer).toHaveBeenCalledWith("123456", "testuser");
    });

    it("should view a private player", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/game/123456/players/testuser",
            "GET",
            undefined,
            { public: "false" }
        );

        (viewPlayer as jest.Mock<typeof viewPlayer>).mockResolvedValue({} as WithId<PlayerSchema>);

        const result = await players.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(viewPlayer).toHaveBeenCalledWith("dummy-token", "123456", "testuser");
    });

    it("should return error for missing token", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/game/123456/players",
            "GET",
            undefined,
            { public: "false" }
        );

        const result = await players.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(400);
        expect(result.body).toBe("Must have a token for this operation");
    });

    it("should return error for invalid path", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/invalid/path",
            "GET"
        );

        const result = await players.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(400);
        expect(result.body).toBe("Invalid path");
    });

    it("should return error for invalid method", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/game/123456/players",
            "PUT"
        );

        const result = await players.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(400);
        expect(result.body).toBe("Invalid request method");
    });
});

describe("tasks handler tests", () => {
    it("should view all public tasks", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/game/123456/tasks",
            "GET",
            undefined,
            { public: "true" }
        );

        const result = await tasks.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(viewAllPublicTasks).toHaveBeenCalledWith("123456");
    });

    it("should view all tasks for a private game", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/game/123456/tasks",
            "GET",
            undefined,
            { public: "false" }
        );

        const result = await tasks.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(viewAllTasks).toHaveBeenCalledWith("dummy-token", "123456");
    });

    it("should view a public task", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/game/123456/tasks/789",
            "GET",
            undefined,
            { public: "true" }
        );

        const result = await tasks.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(viewPublicTask).toHaveBeenCalledWith("123456", "789");
    });

    it("should view a private task", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/game/123456/tasks/789",
            "GET",
            undefined,
            { public: "false" }
        );

        const result = await tasks.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(viewTask).toHaveBeenCalledWith("dummy-token", "123456", "789");
    });

    it("should submit a task", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/game/123456/tasks/789/submit",
            "POST",
            { answers: ["answer1", "answer2"] }
        );

        (submitTask as jest.Mock<typeof submitTask>).mockResolvedValue({} as TaskSubmissionConfirmation);

        const result = await tasks.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        console.log(result.body);
        expect(result.statusCode).toBe(200);
        expect(submitTask).toHaveBeenCalledWith("dummy-token", "123456", "789", ["answer1", "answer2"]);
    });

    it("should return error for missing token on private tasks", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/game/123456/tasks",
            "GET",
            undefined,
            { public: "false" }
        );

        const result = await tasks.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(400);
        expect(result.body).toBe("Must have a token for this operation");
    });

    it("should return error for missing request body on submit task", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/game/123456/tasks/789/submit",
            "POST"
        );

        const result = await tasks.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(400);
        expect(result.body).toBe("Must have a request body");
    });

    it("should return error for invalid path", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/invalid/path",
            "GET"
        );

        const result = await tasks.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(400);
        expect(result.body).toBe("Invalid path");
    });

    it("should return error for invalid method", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/game/123456/tasks",
            "PUT"
        );

        const result = await tasks.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(400);
        expect(result.body).toBe("Invalid request method");
    });
});