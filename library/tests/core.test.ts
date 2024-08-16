import { describe, test, expect, beforeAll, afterAll, it } from "@jest/globals";
import { MongoClient, ObjectId } from "mongodb";
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from "jsonwebtoken";

import { setClient, getClient } from "../src/core"
import { login, signup, refresh, verifyToken } from "../src/auth";
import { createGame, joinGame, getGame, leaveGame, startGame, stopGame, restartGame, getPublicGame, listPublicGames } from "../src/game";
import { viewAllPublicTasks, viewAllTasks, viewPublicTask, viewTask, submitTask } from "../src/tasks";
import { viewAllPlayers, viewPlayer, viewAllPublicPlayers, viewPublicPlayer } from "../src/players";

import "dotenv/config";
import { AccessCredentials, GameSettings, TaskSchema } from "../src/types";
const envVars = [ "MONGODB_CONNECTION_STRING", "ACCESS_TOKEN_KEY", "REFRESH_TOKEN_KEY" ];

let mongod: MongoMemoryServer;
let c: MongoClient;

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

    test("object id matches toString", () => {
        const objid = new ObjectId();
        expect(objid).toEqual(new ObjectId(objid.toString()));
    })
});

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await setClient(mongod.getUri());
    c = getClient();

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
        expect(getClient()).toBeDefined();
        expect(getClient()).toBe(c);
    });

    test("signup", async () => {
        await expect(signup("another", "person")).resolves.not.toThrow();
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

describe("game management", () => {
    let gameId: string;
    
    test("createGame", async () => {
        const game = await createGame(users[0].creds.accessToken, gameSettings, tasks);
        expect(game).toHaveProperty("creds.accessToken");
        expect(game).toHaveProperty("creds.refreshToken");
        expect(game).toHaveProperty("gameid");
        expect(game).toHaveProperty("taskids");
    });

    test("joinGame", async () => {
        const game = await createGame(users[0].creds.accessToken, gameSettings, tasks);
        gameId = game.gameid;
        users[0].creds = game.creds;

        const result = await joinGame(users[1].creds.accessToken, gameId, "player");
        expect(result).toHaveProperty("accessToken");
        expect(result).toHaveProperty("refreshToken");
        console.log(result);
        users[1].creds = result;
    });

    test("host can't join game", async () => {
        const game = await createGame(users[0].creds.accessToken, gameSettings, tasks);
        gameId = game.gameid;
        users[0].creds = game.creds;

        // const result = await joinGame(users[0].creds.accessToken, gameId, "player");
        expect(joinGame(users[0].creds.accessToken, gameId, "player")).rejects.toThrow();
    });

    test("getGame", async () => {
        const game = await getGame(users[0].creds.accessToken, gameId);
        expect(game).toHaveProperty("tasks");
        expect(game).toHaveProperty("settings");
        expect(game).toHaveProperty("state");
    });

    test("getPublicGame", async () => {
        const game = await getPublicGame(gameId);
        expect(game).toHaveProperty("numTasks");
        expect(game).toHaveProperty("settings");
        expect(game).toHaveProperty("state");
    });

    test("listPublicGames", async () => {
        const games = await listPublicGames();
        expect(games).toBeInstanceOf(Array);
        expect(games).not.toHaveLength(0);
    });

    test("startGame", async () => {
        console.log(await getPublicGame(gameId));
        await startGame(users[0].creds.accessToken, gameId);
        const game = await getPublicGame(gameId);
        expect(game.state).toBe("running");
    });

    test("leaveGame", async () => {
        await leaveGame(users[1].creds.accessToken, gameId);
        const game = await getPublicGame(gameId);
        expect(game.players).not.toContain(users[1].username);
    });

    test("stopGame", async () => {
        await stopGame(users[0].creds.accessToken, gameId);
        const game = await getPublicGame(gameId);
        expect(game.state).toBe("ended");
    });

    test("restartGame", async () => {
        const newGame = await restartGame(users[0].creds.accessToken, gameId);
        expect(newGame).toHaveProperty("creds.accessToken");
        expect(newGame).toHaveProperty("creds.refreshToken");
    });
});

describe("task management", () => {
    let gameId: string;
    let chosenTask: string;

    beforeAll(async () => {
        const game = await createGame(users[0].creds.accessToken, gameSettings, tasks);
        gameId = game.gameid;
        users[0].creds = game.creds;
    });

    test("viewAllPublicTasks", async () => {
        const publicTasks = await viewAllPublicTasks(gameId);
        expect(publicTasks).toBeInstanceOf(Array);
        expect(publicTasks.length).toBeGreaterThan(0);
        for (const task of publicTasks) {
            expect(task).toHaveProperty("_id");
            expect(task).toHaveProperty("type");
            expect(task).toHaveProperty("question");
            expect(task).toHaveProperty("clue");
            expect(task).toHaveProperty("answerChoices");
            expect(task).toHaveProperty("attempts");
            expect(task).toHaveProperty("required");
            expect(task).toHaveProperty("points");
            expect(task).toHaveProperty("scalePoints");
        }
    });

    test("viewAllTasks", async () => {
        const tasks = await viewAllTasks(users[0].creds.accessToken, gameId);
        expect(tasks).toBeInstanceOf(Array);
        expect(tasks.length).toBeGreaterThan(0);

        // chosenTask = tasks[Math.floor(Math.random() * tasks.length)]._id;
        chosenTask = tasks[0]._id.toString();
    });

    test("viewPublicTask", async () => {
        const publicTask = await viewPublicTask(gameId, chosenTask);
        expect(publicTask).toHaveProperty("_id", new ObjectId(chosenTask));
        expect(publicTask).toHaveProperty("type", tasks[0].type);
        expect(publicTask).toHaveProperty("question", tasks[0].question);
        expect(publicTask).toHaveProperty("clue", tasks[0].clue);
        expect(publicTask).toHaveProperty("answerChoices", tasks[0].answerChoices);
        expect(publicTask).toHaveProperty("attempts", tasks[0].attempts);
        expect(publicTask).toHaveProperty("required", tasks[0].required);
        expect(publicTask).toHaveProperty("points", tasks[0].points);
        expect(publicTask).toHaveProperty("scalePoints", tasks[0].scalePoints);

        expect(publicTask).not.toHaveProperty("answers", tasks[0].answers);
    });

    test("viewTask", async () => {
        const task = await viewTask(users[0].creds.accessToken, gameId, chosenTask);
        expect(task).toHaveProperty("_id", new ObjectId(chosenTask));
        expect(task).toHaveProperty("type", tasks[0].type);
        expect(task).toHaveProperty("question", tasks[0].question);
        expect(task).toHaveProperty("clue", tasks[0].clue);
        expect(task).toHaveProperty("answerChoices", tasks[0].answerChoices);
        expect(task).toHaveProperty("attempts", tasks[0].attempts);
        expect(task).toHaveProperty("required", tasks[0].required);
        expect(task).toHaveProperty("points", tasks[0].points);
        expect(task).toHaveProperty("scalePoints", tasks[0].scalePoints);
        
        expect(task).toHaveProperty("answers", tasks[0].answers);
    });
});

describe("player management and task submission", () => {
    let gameId: string;

    beforeAll(async () => {
        const game = await createGame(users[0].creds.accessToken, gameSettings, tasks);
        gameId = game.gameid;
        users[0].creds = game.creds;

        const result = await joinGame(users[1].creds.accessToken, gameId, "player");
        users[1].creds = result;

        await startGame(game.creds.accessToken, gameId);
    });

    test("viewAllPlayers", async () => {
        const players = await viewAllPlayers(users[0].creds.accessToken, gameId);
        expect(players).toBeInstanceOf(Array);

        expect(players).toHaveLength(1);
        expect(players[0].username).toBe(users[1].username);
    });

    test("viewAllPublicPlayers", async () => {
        const players = await viewAllPublicPlayers(gameId);
        expect(players).toBeInstanceOf(Array);

        expect(players).toHaveLength(1);
        expect(players[0].username).toBe(users[1].username);
        expect(players[0]).not.toHaveProperty("tasksSubmitted");
    });

    test("viewPlayer", async () => {
        const player = await viewPlayer(users[1].creds.accessToken, gameId, users[1].username);
        expect(player).toBeDefined();
        expect(player!.username).toBe(users[1].username);
    });

    test("viewPublicPlayer", async () => {
        const player = await viewPublicPlayer(gameId, users[1].username);
        expect(player).toBeDefined();
        expect(player!.username).toBe(users[1].username);
        expect(player).not.toHaveProperty("tasksSubmitted");
    });

    test("submitTask", async () => {
        const taskId = tasks[0]._id.toString();
        const taskId2 = tasks[1]._id.toString();
        await submitTask(users[1].creds.accessToken, gameId, taskId, ["4"]);
        
        let player = await viewPlayer(users[1].creds.accessToken, gameId, users[1].username);
        const taskSubmission = player!.tasksSubmitted.find((submission: any) => submission.taskid.toString() === taskId.toString());
        expect(taskSubmission).toBeDefined();
        expect(taskSubmission!.success).toBe(true);
        expect(player!.done).toBe(false);

        await submitTask(users[1].creds.accessToken, gameId, taskId2, ["Paris"]);
        player = await viewPlayer(users[1].creds.accessToken, gameId, users[1].username);
        console.log(player);
        expect(player!.done).toBe(true);
    });
})