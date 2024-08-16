import "dotenv/config";
import { describe, expect, afterAll, it, jest } from "@jest/globals";
import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import * as auth from "../src/auth";

jest.mock("@cloudydaiyz/vulture-lib");
jest.mock("mongodb");

import { login, signup } from "@cloudydaiyz/vulture-lib";
import { createEvent, exampleCallback, exampleContext } from "./test-utils";

afterAll(async () => { 
    jest.restoreAllMocks();
});

describe("auth handler tests", () => {
    it("should register a user successfully", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/register",
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
            "/login",
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
            "/register",
            "POST"
        );

        const result = await auth.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(400);
        expect(result.body).toBe("Must have an event body for this operation");
    });

    it("should return error for invalid path", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/invalid",
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
            "/register",
            "GET",
            { username: "testuser", password: "testpass" }
        );

        const result = await auth.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(400);
        expect(result.body).toBe("Method undefined for this operation");
    });
});