// Game management functions

import jwt from "jsonwebtoken";
import { AccessCredentials, CreateGameConfirmation, GameSchema, GameSettings, PublicGameSchema, TaskSchema, UpdateGameStateConfirmation, UserRole, UserToken } from "./types";
import { ObjectId, SetFields, UpdateFilter } from "mongodb";
import { getGameColl, getPlayerColl, getAdminCodes } from "./core";
import { verifyToken } from "./auth";
import assert from "assert";

export async function createGame(token: string, settings: GameSettings, tasks: TaskSchema[]) {
    const decodedToken = jwt.verify(token, process.env['ACCESS_TOKEN_KEY'] as string) as UserToken;
    tasks.forEach(t => t._id == new ObjectId());

    const res = await getGameColl().insertOne({
        tasks: tasks,
        settings: settings,
        state: settings.minPlayers == 0 ? "ready" : "not ready",
        players: [],
        admins: [],
        host: decodedToken.username
    });
    assert(res.acknowledged && res.insertedId != null, "Create operation unsuccessful");

    const creds = await joinGame(token, res.insertedId, "host");
    return {creds: creds, gameid: res.insertedId.toString() } as CreateGameConfirmation;
}

export async function joinGame(token: string, gameId: ObjectId, role: UserRole, code?: string) {
    const adminCodes = getAdminCodes();

    // Ensure the code for an admin role is correct
    assert(role != "admin" 
            || code && adminCodes && adminCodes.includes(code), 
            "Invalid admin creds");

    // Decode the token and get the game to verify the player doesn't already exist
    const decodedToken = jwt.verify(token, process.env['ACCESS_TOKEN_KEY'] as string) as UserToken;
    const game = await getGameColl().findOne({ _id: gameId });
    assert(game, "Invalid game ID");
    assert(decodedToken.username == game.host || !game.players.includes(decodedToken.username), 
        "User already in game");

    if(role != "host") {
        const update: UpdateFilter<GameSchema> = {};

        // Decide the fields to update the game's players & admins with based on 
        // the specified role
        let toAdd: SetFields<GameSchema> = {
            "players": decodedToken.username,
        };
        if(role == "admin") {
            toAdd = {
                ...toAdd,
                "admins": decodedToken.username
            };
        }
        update.$addToSet = toAdd;

        // Update the game's state if there's now enough players
        if(game.state == "not ready" && game.players.length == game.settings.minPlayers - 1) {
            update.$set = { "state": "ready" };
        }

        const playerRes = await getPlayerColl().insertOne({
            gameId: gameId,
            username: decodedToken.username,
            points: 0,
            tasksSubmitted: [],
            done: game.settings.numRequiredTasks == 0 ? true : false
        });
        assert(playerRes.acknowledged && playerRes.insertedId != null, "Create operation unsuccessful");

        // Update the game's players (and admins if the new player is an admin), and 
        const gameRes = await getGameColl().updateOne({ _id: gameId }, update);
        assert(gameRes.acknowledged && gameRes.modifiedCount == 1, "Operation unsuccessful");
    }

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
        accessToken: access_token,
        refreshToken: refresh_token
    } as AccessCredentials;
}

export async function getGame(token: string, gameId: ObjectId) {
    verifyToken(token, gameId, ["host", "admin"]);

    const game = await getGameColl().findOne({ _id: gameId });
    assert(game != null, "Invalid game");

    return game;
}

export async function getPublicGame(gameId: ObjectId) {
    const game = await getGameColl().findOne({ _id: gameId });
    assert(game != null, "Invalid game");

    const publicGame: PublicGameSchema = {
        settings: game.settings,
        numTasks: game.tasks.length,
        state: game.state,
        host: game.host,
        admins: game.admins,
        players: game.players
    };
    return publicGame;
}

export async function listPublicGames() {
    const games = await getGameColl().find();
    const publicGames: PublicGameSchema[] = [];

    for(const game of await games.toArray()) {
        publicGames.push({
            settings: game.settings,
            numTasks: game.tasks.length,
            state: game.state,
            host: game.host,
            admins: game.admins,
            players: game.players
        });
    }
    return publicGames;
}

export async function leaveGame(token: string, gameId: ObjectId) {
    const decodedToken = verifyToken(token, gameId);

    const result = await getGameColl().updateOne({ _id: gameId }, { $pull: {
        players: decodedToken.username
    } });
    assert(result.acknowledged && result.modifiedCount == 1, "No player removed");
}

export async function startGame(token: string, gameId: ObjectId) {
    verifyToken(token, gameId, ["host", "admin"]);
    
    // Ensure the game is in the ready state
    const game = await getGameColl().findOne({ _id: gameId });
    assert(game!.state == "ready", "Invalid game state");

    // Update the start time and end time based on the game's duration
    const currentTime = Date.now();
    const endTime = game!.settings.duration == 0 ? 0 : Date.now() + game!.settings.duration;
    const result = await getGameColl().updateOne({ _id: gameId }, {
        $set: {
            state: "running",
            "settings.startTime": currentTime,
            "settings.endTime": endTime
        }
    });
    assert(result.acknowledged && result.modifiedCount == 1, "Failed to start game");

    // TODO: Set a timer to end the game at the specified time
    if(game!.settings.duration > 0) {

    }

    return {
        startTime: currentTime,
        endTime: endTime
    } as UpdateGameStateConfirmation;
}

export async function stopGame(token: string, gameId: ObjectId) {
    verifyToken(token, gameId, ["host", "admin"]);

    // Ensure the game is in the ready state
    const game = await getGameColl().findOne({ _id: gameId });
    assert(game!.state == "running", "Invalid game state");

    const currentTime = Date.now();
    const result = await getGameColl().updateOne({ _id: gameId }, {
        $set: {
            state: "ended",
            "settings.endTime": currentTime
        }
    });
    assert(result.acknowledged && result.modifiedCount == 1, "Failed to end game");

    return {
        startTime: game!.settings.startTime,
        endTime: currentTime
    } as UpdateGameStateConfirmation;
}

export async function restartGame(token: string, gameId: ObjectId) {
    verifyToken(token, gameId, ["host", "admin"]);

    // Ensure the game exists and has ended
    const game = await getGameColl().findOne({ _id: gameId });
    assert(game!.state == "ended", "Game hasn't ended, unable to restart");

    // Create a new game with the same settings and tasks as the current game
    return createGame(token, game!.settings, game!.tasks);
}