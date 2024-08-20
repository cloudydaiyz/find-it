import "dotenv/config";
import { describe, expect, afterAll, it, jest } from "@jest/globals";
import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import * as players from "../src/players";

jest.mock("@cloudydaiyz/vulture-lib");
jest.mock("mongodb");

import { deletePlayer, PlayerSchema } from "@cloudydaiyz/vulture-lib";
import { joinGame, leaveGame, viewAllPlayers, viewAllPublicPlayers, viewPlayer, viewPublicPlayer } from "@cloudydaiyz/vulture-lib";
import { WithId } from "mongodb";
import { createEvent, exampleCallback, exampleContext } from "./utils";

afterAll(async () => { 
    jest.restoreAllMocks();
});

describe("players handler tests", () => {
    it("should view all public players", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/games/123456/players",
            "GET",
            undefined,
            { public: "true" }
        );

        const result = await players.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        // expect(viewAllPublicPlayers).toHaveBeenCalledWith("123456");
        expect(viewAllPublicPlayers).toHaveBeenCalled();
    });

    it("should view all players for a private game", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/games/123456/players",
            "GET",
            undefined,
            { public: "false" }
        );

        const result = await players.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        // expect(viewAllPlayers).toHaveBeenCalledWith("dummy-token", "123456");
        expect(viewAllPlayers).toHaveBeenCalled();
    });

    it("should join a game", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/games/123456/players",
            "POST",
            { role: "player" }
        );

        const result = await players.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        // expect(joinGame).toHaveBeenCalledWith("dummy-token", "123456", "test-code");
        expect(joinGame).toHaveBeenCalled();
    });

    it("should leave a game", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/games/123456/players",
            "DELETE"
        );

        const result = await players.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        // expect(leaveGame).toHaveBeenCalledWith("dummy-token", "123456");
        expect(leaveGame).toHaveBeenCalled();
    });

    it("should view a public player", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/games/123456/players/testuser",
            "GET",
            undefined,
            { public: "true" }
        );

        const result = await players.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        // expect(viewPublicPlayer).toHaveBeenCalledWith("123456", "testuser");
        expect(viewPublicPlayer).toHaveBeenCalled();
    });

    it("should view a private player", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/games/123456/players/testuser",
            "GET",
            undefined,
            { public: "false" }
        );

        (viewPlayer as jest.Mock<typeof viewPlayer>).mockResolvedValue({} as WithId<PlayerSchema>);

        const result = await players.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        // expect(viewPlayer).toHaveBeenCalledWith("dummy-token", "123456", "testuser");
        expect(viewPlayer).toHaveBeenCalled();
    });

    it("should delete a player", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/games/123456/players/testuser",
            "DELETE"
        );

        const result = await players.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        // expect(viewPlayer).toHaveBeenCalledWith("dummy-token", "123456", "testuser");
        expect(deletePlayer).toHaveBeenCalledWith("dummy-token", "123456", "testuser");
    });

    it("should return error for missing token", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/games/123456/players",
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
            "/games/123456/players",
            "PUT"
        );

        const result = await players.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(400);
        expect(result.body).toBe("Invalid request method");
    });
});