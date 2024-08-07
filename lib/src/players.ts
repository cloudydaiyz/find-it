// Player management functions

import assert from "assert";
import { getPlayerColl } from "./core";
import { verifyToken } from "./auth";
import { PublicPlayerSchema } from "./types";
import { ObjectId } from "mongodb";

export async function viewAllPlayers(token: string, gameId: ObjectId) {
    verifyToken(token, gameId, ["host", "admin"]);

    const players = getPlayerColl().find({ gameId: gameId });
    return players.toArray();
}

export async function viewAllPublicPlayers(gameId: ObjectId) {
    const players = getPlayerColl().find({ gameId: gameId });
    const publicPlayers: PublicPlayerSchema[] = [];

    for(const player of await players.toArray()) {
        const publicPlayer: PublicPlayerSchema = {
            gameId: gameId,
            username: player.username,
            points: player!.points,
            numTasksSubmitted: player!.tasksSubmitted.length,
            numTasksCompleted: player!.tasksSubmitted.filter(t => t.success).length,
            done: false
        }
        publicPlayers.push(publicPlayer);
    }

    return publicPlayers;
}

export async function viewPlayer(token: string, gameId: ObjectId, username: string) {
    const decodedToken = verifyToken(token, gameId);

    // No one other than a host, admin, or the player themself must be able to access
    // info about a player
    assert(decodedToken.role != "player" || username == decodedToken.username, "Invalid access role");

    const player = getPlayerColl().findOne({ username: username, gameId: gameId });
    assert(player != null, "Player does not exist");
    
    return player;
}

export async function viewPublicPlayer(gameId: ObjectId, username: string) {
    const player = await getPlayerColl().findOne({ username: username, gameId: gameId });
    assert(player != null, "Player does not exist");

    const publicPlayer: PublicPlayerSchema = {
        gameId: gameId,
        username: username,
        points: player!.points,
        numTasksSubmitted: player!.tasksSubmitted.length,
        numTasksCompleted: player!.tasksSubmitted.filter(t => t.success).length,
        done: false
    }
    return publicPlayer;
}