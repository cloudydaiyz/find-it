import jwt, { JwtPayload } from "jsonwebtoken";
import { Condition, MongoClient, ObjectId, SetFields, UpdateFilter, WithId } from "mongodb";
import assert from "assert";
import "dotenv/config";

import { AccessCredentials, GameSchema, GameSettings, PlayerSchema, PublicTaskSchema, TaskSchema, TaskSubmission, UserRole, UserSchema, UserToken } from "./types";
import { adminCodes } from "./secrets";

let client = new MongoClient(process.env['MONGODB_CONNECTION_STRING'] as string);
let db = client.db("the-great-hunt");
let userColl = db.collection<UserSchema>("users");
let gameColl = db.collection<GameSchema>("games");
let playerColl = db.collection<PlayerSchema>("players");

/* UTILITY FUNCTIONS */

/**
 * Verifies the JWT token belongs to the specified game and has one of the specified roles
 * @param token The token to verify
 * @param gameId The game ID the token should belong to
 * @param requiredRoles Options for the roles the token should have
 * @returns The decoded token
 */
function verifyToken(token: string, gameId: ObjectId, requiredRoles?: UserRole[]) {
    const decodedToken = jwt.verify(token, process.env['ACCESS_TOKEN_KEY'] as string) as UserToken;
    assert(decodedToken.gameId == gameId, "Invalid token; wrong game");
    assert(requiredRoles?.includes(decodedToken.role as UserRole), "Invalid credentials");
    return decodedToken;
}

/***********************************************/
/****************   FUNCTIONS   ****************/
/* BEHAVIOR: error on fail, return on success. */

// Authentication functions

// Creates a new user
export async function signup(username: string, password: string) {
    assert(await userColl.findOne({username: username}) != null, 'User already exists');
    
    const res = await userColl.insertOne({
        username: username,
        password: password
    });
}

// Creates an access token
export async function login(username: string, password: string) {
    const user = await userColl.findOne({
        username: username,
        password: password
    });

    if(user && user.username == username && user.password == password) {
        const creds = {
            userid: user._id,
            username: user.username
        };

        const access_token = jwt.sign(
            creds, 
            process.env['ACCESS_TOKEN_KEY'] as string, 
            { expiresIn: "15min" }
        );

        const refresh_token = jwt.sign(
            creds, 
            process.env['REFRESH_TOKEN_KEY'] as string, 
            { expiresIn: "3hr" }
        );

        return {
            accessToken: access_token,
            refreshToken: refresh_token
        } as AccessCredentials;
    }
    
    throw new Error('Invalid credentials');
}

export async function refresh(token: string) {
    let accessToken: string | null = null;

    await jwt.verify(token, process.env['REFRESH_TOKEN_KEY'] as string, async (err, decoded) => {
        assert(!err && typeof decoded != 'string', "Invalid token");

        const decodedToken = decoded as UserToken;
        const user = await userColl.findOne({
            _id: new ObjectId(`${decodedToken.userid}`)
        });
        assert(user, "Invalid user");
        
        // Generate new credentials from the previous token
        const creds: UserToken = {
            userid: user._id,
            username: user.username
        };
        if(decodedToken.gameId) creds.gameId = decodedToken.gameId;
        if(decodedToken.role) creds.role = decodedToken.role;
        
        accessToken = jwt.sign(
            creds, 
            process.env['ACCESS_TOKEN_KEY'] as string, 
            { expiresIn: "15min" }
        );
    });

    assert(accessToken != null, "Unable to retrieve access token");
    return accessToken;
}

// Game management functions

export async function createGame(token: string, settings: GameSettings, tasks: TaskSchema[]) {
    const decodedToken = jwt.verify(token, process.env['ACCESS_TOKEN_KEY'] as string) as UserToken;

    const res = await gameColl.insertOne({
        tasks: tasks,
        settings: settings,
        state: settings.minPlayers == 0 ? "ready" : "not ready",
        players: [],
        admins: [],
        host: decodedToken.username
    });

    return joinGame(token, res.insertedId, "host");
}

export async function joinGame(token: string, gameId: ObjectId, role: UserRole, code?: string) {
    // Ensure the code for an admin role is correct
    assert(role != "admin" || role == "admin" && code && adminCodes.includes(code), "Invalid admin creds");

    // Decode the token and get the game to verify the player doesn't already exist
    const decodedToken = jwt.verify(token, process.env['ACCESS_TOKEN_KEY'] as string) as UserToken;
    const game = await gameColl.findOne({ _id: gameId });
    assert(game, "Invalid game ID");
    assert(!game.players.includes(decodedToken.username) && decodedToken.username != game.host, 
        "User already in game");

    // Decide the fields to update the game with based on the specified role
    let fields: SetFields<GameSchema> = {
        "players": decodedToken.username,
    };
    if(role == "admin") {
        fields = {
            "players": decodedToken.username,
            "admins": decodedToken.username
        };
    } 

    // Update the game's players (and admins if the new player is an admin)
    const update = await gameColl.updateOne({ _id: gameId }, { $addToSet: fields });
    assert(update.acknowledged && update.modifiedCount == 1, "Operation unsuccessful");

    // Create upgraded credentials
    const creds: UserToken = {
        userid: decodedToken.userid,
        username: decodedToken.username
    }
    creds.gameId = gameId;
    creds.role = role;

    // Create new tokens with upgraded credentials to return
    const access_token = jwt.sign(
        creds, 
        process.env['ACCESS_TOKEN_KEY'] as string, 
        { expiresIn: "15min" }
    );
    const refresh_token = jwt.sign(
        creds, 
        process.env['REFRESH_TOKEN_KEY'] as string, 
        { expiresIn: "3hr" }
    );

    return {
        access_token: access_token,
        refresh_token: refresh_token
    }
}

export async function getGame(gameId: ObjectId) {
    const game = await gameColl.findOne({ _id: gameId });
    assert(game != null, "Invalid game");

    return game;
}

export async function listGames() {
    const games = await gameColl.find();
    return games;
}

export async function leaveGame(token: string, gameId: ObjectId) {
    const decodedToken = verifyToken(token, gameId);

    const result = await gameColl.updateOne({ _id: decodedToken.gameId }, { $pull: {
        players: decodedToken.username
    } });
    assert(result.acknowledged && result.modifiedCount == 1, "No player removed");
}

export async function startGame(token: string, gameId: ObjectId) {
    verifyToken(token, gameId, ["host", "admin"]);
    
    // Ensure the game is in the ready state
    const game = await gameColl.findOne({ _id: gameId });
    assert(game!.state == "ready", "Invalid game state");

    // Update the start time and end time based on the game's duration
    const currentTime = Date.now();
    const result = await gameColl.updateOne({ _id: gameId }, {
        $set: {
            state: "running",
            "settings.startTime": currentTime,
            "settings.endTime": game!.settings.duration == 0 ? 0 : Date.now() + game!.settings.duration
        }
    });
    assert(result.acknowledged && result.modifiedCount == 1, "Failed to start game");

    // TODO: Set a timer to end the game at the specified time
    // Wait until EventBridge Scheduler is implemented
    if(game!.settings.duration > 0) {

    }
}

export async function stopGame(token: string, gameId: ObjectId) {
    const decodedToken = verifyToken(token, gameId, ["host", "admin"]);

    // Ensure the game is in the ready state
    const game = await gameColl.findOne({ _id: gameId });
    assert(game!.state == "ready", "Invalid game state");

    const currentTime = Date.now();
    const result = await gameColl.updateOne({ _id: gameId }, {
        $set: {
            state: "ended",
            "settings.endTime": currentTime
        }
    });
    assert(result.acknowledged && result.modifiedCount == 1, "Failed to end game");
}

export async function restartGame(token: string, gameId: ObjectId) {
    const decodedToken = verifyToken(token, gameId, ["host", "admin"]);

    // Ensure the game exists and has ended
    const game = await gameColl.findOne({ _id: gameId });
    assert(game!.state == "ended", "Game hasn't ended, unable to restart");

    // Create a new game with the same settings and tasks as the current game
    return createGame(token, game!.settings, game!.tasks);
}

// Task management functions

export async function viewAllPublicTasks(gameId: ObjectId) {
    const game = await gameColl.findOne({ _id: gameId });

    const publicTasks: PublicTaskSchema[] = [];
    for(const task of game!.tasks) {
        publicTasks.push({
            _id: new ObjectId(),
            type: task.type,
            question: task.question,
            clue: task.clue,
            answerChoices: task.answerChoices,
            attempts: task.attempts,
            required: task.required,
            points: task.points,
            scalePoints: task.scalePoints
        });
    }
    return publicTasks;
}

export async function viewAllTasks(token: string, gameId: ObjectId) {
    verifyToken(token, gameId, ["host", "admin"]);

    const game = await gameColl.findOne({ _id: gameId });
    return game!.tasks;
}

export async function viewPublicTask(gameId: ObjectId, taskId: ObjectId) {
    const game = await gameColl.findOne({ _id: gameId });
    const task = game!.tasks.find(t => t._id == taskId);
    assert(task != undefined, "Invalid task ID");

    const publicTask: PublicTaskSchema = {
        _id: task!._id,
        type: task.type,
        question: task.question,
        clue: task.clue,
        answerChoices: task.answerChoices,
        attempts: task.attempts,
        required: task.required,
        points: task.points,
        scalePoints: task.scalePoints
    };
    return publicTask;
}

export async function viewTask(token: string, gameId: ObjectId, taskId: ObjectId) {
    verifyToken(token, gameId, ["host", "admin"]);

    const game = await gameColl.findOne({ _id: gameId });
    const task = game!.tasks.find(t => t._id == taskId);
    assert(task != undefined, "Invalid task ID");
    return task;
}

// Player management functions

export async function viewAllPlayers(gameId: ObjectId) {
    const players = playerColl.find({ gameId: gameId });
    return players;
}

export async function viewPlayer(gameId: ObjectId, playerId: string) {
    const player = playerColl.find({ _id: new ObjectId(playerId), gameId: gameId });
    return player;
}

export async function submitTask(token: string, gameId: ObjectId, taskId: ObjectId, answers: string[]) {
    const decodedToken = verifyToken(token, gameId, ["player"]);

    const game = await gameColl.findOne({ _id: gameId });
    const task = game!.tasks.find(t => t._id == taskId);
    assert(task != undefined, "Invalid task ID");

    const taskSuccessful = task.answers.length == 0 ? 
        true : task.answers.every(i => answers.includes(task.answerChoices[i]));

    const submission: TaskSubmission = {
        _id: new ObjectId(),
        taskid: taskId,
        answers: answers,
        submissionTime: Date.now(),
        success: taskSuccessful
    };

    let points = task.points;
    if(taskSuccessful) {
        if(task.scalePoints) {
            const durationDelta = submission.submissionTime - game!.settings.startTime + 0.01;
            points = Math.round(task.points * (1 - durationDelta / game!.settings.duration));
        }
    } else {
        points = Math.abs(points) * -1;
    }

    const update = await playerColl.updateOne(
        { _id: decodedToken.userid }, 
        { $inc: { points: points } }
    );
    assert(update.acknowledged && update.modifiedCount == 1);
}