import { describe, expect, afterAll, it, jest } from "@jest/globals";
import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import * as game from "../src/game";

jest.mock("@cloudydaiyz/game-engine-lib");
jest.mock("mongodb");

import { createGame, getGame, restartGame, startGame, stopGame, listPublicGames, getPublicGame, GameSettings } from "@cloudydaiyz/game-engine-lib";
import { createEvent, exampleCallback, exampleContext } from "./testutils";

afterAll(async () => { 
    jest.restoreAllMocks();
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
        const settings: GameSettings = {
            name: "test game",
            duration: 0,
            startTime: 0,
            endTime: 0,
            ordered: false,
            minPlayers: 0,
            maxPlayers: 0,
            joinMidGame: false,
            numRequiredTasks: 0
        };

        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/game",
            "POST",
            { settings: settings, tasks: [] }
        );

        const result = await game.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        expect(createGame).toHaveBeenCalledWith("dummy-token", settings, []);
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
        console.log(result.body);
        expect(result.statusCode).toBe(200);
        // expect(getPublicGame).toHaveBeenCalledWith("123456");
        expect(getPublicGame).toHaveBeenCalled();
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
        // expect(getGame).toHaveBeenCalledWith("dummy-token", "123456");
        expect(getGame).toHaveBeenCalled();
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
        // expect(startGame).toHaveBeenCalledWith("dummy-token", "123456");
        expect(startGame).toHaveBeenCalled();
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
        // expect(stopGame).toHaveBeenCalledWith("dummy-token", "123456");
        expect(stopGame).toHaveBeenCalled();
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
        // expect(restartGame).toHaveBeenCalledWith("dummy-token", "123456");
        expect(restartGame).toHaveBeenCalled();
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