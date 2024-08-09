import { describe, expect, afterAll, it, jest } from "@jest/globals";
import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import * as auth from "../../src/auth";
import "dotenv/config";

// Make sure to mock BEFORE importing the functions
jest.mock("@cloudydaiyz/game-engine-lib");
jest.mock("mongodb");

import { login, signup } from "@cloudydaiyz/game-engine-lib";
import { createEvent, exampleCallback, exampleContext } from "../testutils";

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
        console.log(event);

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