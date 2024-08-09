// Interface of the Mongo DB

import { GameSchema, PlayerSchema, UserSchema } from "./types";
import { Collection, Db, MongoClient } from "mongodb";

let client: MongoClient;
let db: Db;
let userColl: Collection<UserSchema>;
let gameColl: Collection<GameSchema>;
let playerColl: Collection<PlayerSchema>;

export function setClient(c: MongoClient) {
    if(client) client.close();

    client = c;
    db = client.db("the-great-hunt");
    userColl = db.collection<UserSchema>("users");
    gameColl = db.collection<GameSchema>("games");
    playerColl = db.collection<PlayerSchema>("players");
}

export function getClient() {
    return client;
}

export function getDb() {
    return db;
}

export function getUserColl() {
    return userColl;
}

export function getGameColl() {
    return gameColl;
}

export function getPlayerColl() {
    return playerColl;
}

export function getAdminCodes() {
    return process.env['ADMIN_CODES']?.split(',');
}