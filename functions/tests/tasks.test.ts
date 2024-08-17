import "dotenv/config";
import { describe, expect, afterAll, it, jest } from "@jest/globals";
import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import * as tasks from "../src/tasks";

jest.mock("@cloudydaiyz/vulture-lib");
jest.mock("mongodb");

// import { TaskSubmissionConfirmation } from "@cloudydaiyz/vulture-lib";
import { viewAllTasks, viewAllPublicTasks, viewTask, viewPublicTask, submitTask } from "@cloudydaiyz/vulture-lib";
import { createEvent, exampleCallback, exampleContext } from "./test-utils";

afterAll(async () => { 
    jest.restoreAllMocks();
});

describe("tasks handler tests", () => {
    it("should view all public tasks", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/games/123456/tasks",
            "GET",
            undefined,
            { public: "true" }
        );

        const result = await tasks.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        // expect(viewAllPublicTasks).toHaveBeenCalledWith("123456");
        expect(viewAllPublicTasks).toHaveBeenCalled();
    });

    it("should view all tasks for a private game", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/games/123456/tasks",
            "GET",
            undefined,
            { public: "false" }
        );

        const result = await tasks.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        // expect(viewAllTasks).toHaveBeenCalledWith("dummy-token", "123456");
        expect(viewAllTasks).toHaveBeenCalled();
    });

    it("should view a public task", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/games/123456/tasks/789",
            "GET",
            undefined,
            { public: "true" }
        );

        const result = await tasks.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        // expect(viewPublicTask).toHaveBeenCalledWith("123456", "789");
        expect(viewPublicTask).toHaveBeenCalled();
    });

    it("should view a private task", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/games/123456/tasks/789",
            "GET",
            undefined,
            { public: "false" }
        );

        const result = await tasks.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        // expect(viewTask).toHaveBeenCalledWith("dummy-token", "123456", "789");
        expect(viewTask).toHaveBeenCalled();
    });

    it("should submit a task", async () => {
        const event = createEvent(
            { "Content-Type": "application/json", "token": "dummy-token" },
            "/games/123456/tasks/789/submit",
            "POST",
            { answers: ["answer1", "answer2"] }
        );

        // (submitTask as jest.Mock<typeof submitTask>).mockResolvedValue({} as TaskSubmissionConfirmation);

        const result = await tasks.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(200);
        // expect(submitTask).toHaveBeenCalledWith("dummy-token", "123456", "789", ["answer1", "answer2"]);
        expect(submitTask).toHaveBeenCalled();
    });

    it("should return error for missing token on private tasks", async () => {
        const event = createEvent(
            { "Content-Type": "application/json" },
            "/games/123456/tasks",
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
            "/games/123456/tasks/789/submit",
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
            "/games/123456/tasks",
            "PUT"
        );

        const result = await tasks.handler(event, exampleContext, exampleCallback) as APIGatewayProxyStructuredResultV2;
        expect(result.statusCode).toBe(400);
        expect(result.body).toBe("Invalid request method");
    });
});