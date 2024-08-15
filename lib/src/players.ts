// Player management functions

import assert from "assert";
import { getPlayerColl } from "./core";
import { verifyToken } from "./auth";
import { PublicPlayerSchema } from "./types";
import { ObjectId } from "mongodb";

// Returns information about all players from the specified game
export async function viewAllPlayers(token: string, rawGameId: string) {
    const gameId = new ObjectId(rawGameId);
    verifyToken(token, gameId, ["host", "admin"]);

    const players = getPlayerColl().find({ gameId: gameId });
    return players.toArray();
}

// Returns public information about all players from the specified game
export async function viewAllPublicPlayers(rawGameId: string) {
    const gameId = new ObjectId(rawGameId);
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

// Returns information about a player; only host, admin, and the player themself should have this info
export async function viewPlayer(token: string, rawGameId: string, username: string) {
    const gameId = new ObjectId(rawGameId);
    const decodedToken = verifyToken(token, gameId);
    assert(decodedToken.role != "player" || username == decodedToken.username, "Invalid access role");

    const player = getPlayerColl().findOne({ username: username, gameId: gameId });
    assert(player, "Player does not exist");
    
    return player;
}

// Returns public information about a player
export async function viewPublicPlayer(rawGameId: string, username: string) {
    const gameId = new ObjectId(rawGameId);
    const player = await getPlayerColl().findOne({ username: username, gameId: gameId });
    assert(player, "Player does not exist");

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