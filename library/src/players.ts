// Player management functions

import assert from "assert";
import { getClient, getGameColl, getPlayerColl } from "./mongodb";
import { verifyToken } from "./auth";
import { PlayerSchema, PublicPlayerSchema } from "./types";
import { ObjectId, WithId } from "mongodb";

// Returns information about all players from the specified game
export async function viewAllPlayers(token: string, rawGameId: string): Promise<WithId<PlayerSchema>[]> {
    const gameId = new ObjectId(rawGameId);
    verifyToken(token, gameId, ["host", "admin"]);

    const players = getPlayerColl().find({ gameId: gameId });
    return players.toArray();
}

// Returns public information about all players from the specified game
export async function viewAllPublicPlayers(rawGameId: string): Promise<PublicPlayerSchema[]> {
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
export async function viewPlayer(token: string, rawGameId: string, username: string): Promise<WithId<PlayerSchema>> {
    const gameId = new ObjectId(rawGameId);
    const decodedToken = verifyToken(token, gameId);
    assert(decodedToken.role != "player" || username == decodedToken.username, "Invalid access role");

    const player = await getPlayerColl().findOne({ username: username, gameId: gameId });
    assert(player, "Player does not exist");
    
    return player;
}

// Returns public information about a player
export async function viewPublicPlayer(rawGameId: string, username: string): Promise<PublicPlayerSchema> {
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

export async function deletePlayer(token: string, rawGameId: string, username: string): Promise<WithId<PlayerSchema>> {
    const gameId = new ObjectId(rawGameId);
    verifyToken(token, gameId, ["host", "admin"]);

    const player = await getPlayerColl().findOne({ username: username });
    assert(player, "Player not found");

    const session = getClient().startSession();
    await session.withTransaction(async () => {
        const playerDeletion = await getPlayerColl().deleteOne({ username: username });
        assert(playerDeletion.acknowledged && playerDeletion.deletedCount == 1, "Unable to delete player");
    
        const gameUpdate = await getGameColl().updateOne({ _id: gameId }, { $pull: { players: username } });
        assert(gameUpdate.acknowledged && gameUpdate.modifiedCount == 1, "Unable to update game with player deletion");
    }).then(() => session.endSession());

    return player;
}