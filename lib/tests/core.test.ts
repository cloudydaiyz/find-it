import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import { setClient, login, getClient, signup, verifyToken, refresh, createGame, joinGame, getGame, listGames, leaveGame, startGame, stopGame, restartGame } from "../src/core"
import { FindCursor, MongoClient, ObjectId } from "mongodb";
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from "jsonwebtoken";

import "dotenv/config";
import { AccessCredentials, GameSettings, TaskSchema } from "../src/types";
const envVars = [ "MONGODB_CONNECTION_STRING", "ACCESS_TOKEN_KEY", "REFRESH_TOKEN_KEY" ];

let mongod: MongoMemoryServer;
let c: MongoClient;
let gameId: ObjectId;

/* CONSTANTS */

const gameSettings: GameSettings = {
    name: "Test Game",
    duration: 60000, // 1 minute
    startTime: 0,
    endTime: 0,
    ordered: true,
    minPlayers: 1,
    maxPlayers: 10,
    joinMidGame: false,
    numRequiredTasks: 2
};

const tasks: TaskSchema[] = [
    {
        _id: new ObjectId(),
        type: "multiple choice",
        question: "What is 2 + 2?",
        clue: "Basic math",
        answerChoices: ["3", "4", "5"],
        answers: [1],
        attempts: 0,
        required: true,
        points: 10,
        scalePoints: false
    },
    {
        _id: new ObjectId(),
        type: "text",
        question: "What is the capital of France?",
        clue: "Geography",
        answerChoices: [],
        answers: [],
        attempts: 0,
        required: true,
        points: 20,
        scalePoints: false
    }
];

interface UserCreds {
    creds: AccessCredentials;
    username: string;
}
const users: UserCreds[] = [];

/* TESTS */

describe("utilities", () => {
    test("environment variables", () => {
        for(const envVar of envVars) {
            expect(process.env[envVar]).toBeDefined();
            expect(typeof process.env[envVar]).toBe("string");
        }
    });
});

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    c = new MongoClient(mongod.getUri());
    setClient(c);

    // Create access token for testing
    await signup("kylan", "duncan");
    const creds = await login("kylan", "duncan");
    users.push({ creds: creds, username: "kylan" });

    await signup("some", "dude");
    const creds2 = await login("some", "dude");
    users.push({ creds: creds2, username: "some" });
});

afterAll(async () => { 
    await c.close();
    await mongod.stop();
});

describe("authentication", () => {
    test("connection", () => {
        expect(getClient()).toBe(c);
    });

    test("invalid signup", async () => {
        await expect(signup("kylan", "duncan")).rejects.toThrow();
    });

    test("login", async () => {
        await expect(login("kylan", "duncan")).resolves.not.toThrow();
    });

    test("invalid login", async () => {
        await expect(login("kylan", "dunca")).rejects.toThrowError();
    });

    test("verifyToken", () => {
        const gameId = new ObjectId();
        const token = jwt.sign({ gameId: gameId, role: "player" }, process.env['ACCESS_TOKEN_KEY'] as string);
        const decodedToken = verifyToken(token, gameId, ["player"]);
        expect(decodedToken.gameId?.toString()).toEqual(gameId.toString());
    });

    test("invalid verifyToken", () => {
        const gameId = new ObjectId();
        const token = jwt.sign({ gameId: gameId, role: "player" }, process.env['ACCESS_TOKEN_KEY'] as string);
        expect(() => verifyToken(token, new ObjectId(), ["player"])).toThrow("Invalid token; wrong game");
    });

    test("refresh token", async () => {
        const tokens = await login("kylan", "duncan");
        const newAccessToken = await refresh(tokens.refreshToken);
        expect(newAccessToken).toBeDefined();
    });

    test("invalid refresh token", async () => {
        const invalidToken = jwt.sign({ userid: "invalid" }, "wrongkey", { expiresIn: "3hr" });
        await expect(refresh(invalidToken)).rejects.toThrow("Invalid token");
    });
});

describe("game functions", () => {
    
    test("createGame", async () => {
        const game = await createGame(users[0].creds.accessToken, gameSettings, tasks);
        expect(game).toHaveProperty("creds.accessToken");
        expect(game).toHaveProperty("creds.refreshToken");
    });

    test("joinGame", async () => {
        const game = await createGame(users[0].creds.accessToken, gameSettings, tasks);
        gameId = new ObjectId(game.gameid);
        users[0].creds = game.creds;

        const result = await joinGame(users[1].creds.accessToken, gameId, "player");
        expect(result).toHaveProperty("accessToken");
        expect(result).toHaveProperty("refreshToken");
        users[1].creds = result;
    });

    test("getGame", async () => {
        const game = await getGame(gameId);
        expect(game).toHaveProperty("tasks");
        expect(game).toHaveProperty("settings");
        expect(game).toHaveProperty("state");
    });

    test("listGames", async () => {
        const games = await listGames();
        expect(games).toBeInstanceOf(FindCursor);
        expect(games.toArray()).resolves.not.toHaveLength(0);
    });

    test("startGame", async () => {
        await startGame(users[0].creds.accessToken, gameId);
        const game = await getGame(gameId);
        expect(game.state).toBe("running");
    });

    test("leaveGame", async () => {
        await leaveGame(users[1].creds.accessToken, gameId);
        const game = await getGame(gameId);
        expect(game.players).not.toContain(users[1].username);
    });

    test("stopGame", async () => {
        await stopGame(users[0].creds.accessToken, gameId);
        const game = await getGame(gameId);
        expect(game.state).toBe("ended");
    });

    test("restartGame", async () => {
        const newGame = await restartGame(users[0].creds.accessToken, gameId);
        expect(newGame).toHaveProperty("creds.accessToken");
        expect(newGame).toHaveProperty("creds.refreshToken");
    });
});