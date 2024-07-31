import jwt, { JwtPayload } from "jsonwebtoken";
import { Condition, MongoClient, ObjectId, SetFields, UpdateFilter, WithId } from "mongodb";
import assert from "assert";
import "dotenv/config";

import { GameSchema, GameSettings, TaskSchema, UserRole, UserSchema, UserToken } from "./types";
import { adminCodes } from "./secrets";

let client = new MongoClient(process.env['MONGODB_CONNECTION_STRING'] as string);
let db = client.db("the-great-hunt");
let userColl = db.collection<UserSchema>("users");
let gameColl = db.collection<GameSchema>("games");
let playerColl = db.collection<TaskSchema>("players");

// BEHAVIOR: error on fail, return on success

export async function signup(username: string, password: string) {
    assert(await userColl.findOne({username: username}) != null, 'User already created');
    
    const res = await userColl.insertOne({
        username: username,
        password: password
    });
}

export async function login(username: string, password: string) {
    const user = await userColl.findOne({
        username: username
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
            access_token: access_token,
            refresh_token: refresh_token
        }
    }
    
    throw new Error('Invalid credentials');
}

export async function refresh(token: string): Promise<string | null> {
    let access_token: string | null = null;

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
        
        access_token = jwt.sign(
            creds, 
            process.env['ACCESS_TOKEN_KEY'] as string, 
            { expiresIn: "15min" }
        );
    });

    return access_token;
}

export async function createGame(token: string, settings: GameSettings, tasks: TaskSchema[]) {
    const decoded_token = jwt.verify(token, process.env['ACCESS_TOKEN_KEY'] as string) as UserToken;

    const res = await gameColl.insertOne({
        tasks: tasks,
        settings: settings,
        state: settings.minPlayers == 0 ? "ready" : "not ready",
        players: [],
        admins: [],
        host: decoded_token.username
    });

    return joinGame(token, res.insertedId, "host");
}

export async function joinGame(token: string, gameId: ObjectId, role: UserRole, code?: string) {
    // Ensure the code for an admin role is correct
    assert(role != "admin" || role == "admin" && code && adminCodes.includes(code), "Invalid admin creds");

    // Decode the token and get the game to verify the player doesn't already exist
    const decoded_token = jwt.verify(token, process.env['ACCESS_TOKEN_KEY'] as string) as UserToken;
    const game = await gameColl.findOne({ _id: gameId });
    assert(game, "Invalid game ID");
    assert(!game.players.includes(decoded_token.username) && decoded_token.username != game.host, "User already in game");

    // Decide the fields to update the game with based on the specified role
    let fields: SetFields<GameSchema> = {
        "players": decoded_token.username,
    };
    if(role == "admin") {
        fields = {
            "players": decoded_token.username,
            "admins": decoded_token.username
        };
    } 

    // Update the game's players (and admins if the new player is an admin)
    const update = await gameColl.updateOne({ _id: gameId }, { $addToSet: fields });
    assert(update.acknowledged && update.modifiedCount == 1, "Operation unsuccessful");

    // Create upgraded credentials
    const creds: UserToken = {
        userid: decoded_token.userid,
        username: decoded_token.username
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

export async function leaveGame(token: string, gameId: ObjectId) {
    const decoded_token = jwt.verify(token, process.env['ACCESS_TOKEN_KEY'] as string) as UserToken;
    assert(decoded_token.gameId == gameId, "Invalid token; wrong game");

    gameColl.updateOne({ _id: decoded_token.userid}, { $pull: {
        
    } });
}

(async() => {
    // console.log(client);

    // await signup('kylan', 'duncan');
    const creds = await login('kylan', 'duncan');

    console.log(creds);

    const refreshCreds = await refresh(creds!.refresh_token) as string;
    console.log(refreshCreds);
    
    setTimeout(async () => {
        const refreshCreds2 = await refresh(creds!.refresh_token) as string;
        console.log(refreshCreds2);

        client.close();

    }, 5000);
})();