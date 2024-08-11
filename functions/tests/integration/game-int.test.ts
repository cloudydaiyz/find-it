import { describe, expect, afterAll, it, jest } from "@jest/globals";
import { authEndpoint, gameEndpoint, playersEndpoint, tasksEndpoint } from "../../secrets";

// const authEndpoint = process.env['VULTURE_AUTH_ENDPOINT'];
// const gameEndpoint = process.env['VULTURE_GAME_ENDPOINT'];
// const playersEndpoint = process.env['VULTURE_PLAYERS_ENDPOINT'];
// const tasksEndpoint = process.env['VULTURE_TASKS_ENDPOINT'];

describe("default", () => {
    it("should say hello world", () => {
        fetch(gameEndpoint + "");
        console.log("hello world");
    });
})