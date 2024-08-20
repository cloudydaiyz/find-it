// Interface of the Mongo DB

import { GameSchema, PlayerSchema, UserSchema } from "./types";
import { Collection, Db, MongoClient } from "mongodb";

let client: MongoClient;
let db: Db;
let userColl: Collection<UserSchema>;
let gameColl: Collection<GameSchema>;
let playerColl: Collection<PlayerSchema>;

/**
 * Sets the client for DB queries to a MongoClient with the given URI, and
 * the respective database and collections
 * @param uri URI of the MongoDB database
 */
export async function setClient(uri: string): Promise<void> {
    const c = new MongoClient(uri);
    if(client) client.close();

    client = c;
    client = await client.connect();
    await client.db("admin").command({ ping: 1 });

    db = client.db("the-great-hunt");
    userColl = db.collection<UserSchema>("users");
    gameColl = db.collection<GameSchema>("games");
    playerColl = db.collection<PlayerSchema>("players");
}

// Retrieves the MongoClient currently being used
export function getClient(): MongoClient {
    return client;
}

// Retrieves the database currently being used
export function getDb(): Db {
    return db;
}

// Retrieves the user collection
export function getUserColl(): Collection<UserSchema> {
    return userColl;
}

// Retrieves the game collection
export function getGameColl(): Collection<GameSchema> {
    return gameColl;
}

// Retrieves the player collection
export function getPlayerColl(): Collection<PlayerSchema> {
    return playerColl;
}