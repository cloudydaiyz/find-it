// Player management functions

import assert from "assert";
import { getGameColl, getPlayerColl } from "./core";
import { verifyToken } from "./auth";
import { PublicPlayerSchema, TaskSubmission } from "./types";
import { ObjectId } from "mongodb";

export async function viewAllPlayers(token: string, gameId: ObjectId) {
    verifyToken(token, gameId, ["host", "admin"]);

    const players = getPlayerColl().find({ gameId: gameId });
    return players;
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

export async function submitTask(token: string, gameId: ObjectId, taskId: ObjectId, answers: string[]) {
    const decodedToken = verifyToken(token, gameId, ["player"]);

    // Retrieve the game from the database
    const game = await getGameColl().findOne({ _id: gameId });
    assert(game!.state == "running", "Game is not running");

    // Verify the task exists in the game
    const task = game!.tasks.find(t => t._id.toString() == taskId.toString());
    assert(task != undefined, "Invalid task ID");

    // Retrieve the player from the database
    const player = await getPlayerColl().findOne({ username: decodedToken.username, gameId: gameId });

    // Check if the task was successful and create a new task submission for the player
    const taskSuccessful = task.answers.length == 0 ? 
        true : task.answers.every(i => answers.includes(task.answerChoices[i]));
    
    const submission: TaskSubmission = {
        _id: new ObjectId(),
        taskid: taskId,
        answers: answers,
        submissionTime: Date.now(),
        success: taskSuccessful
    };

    // Calculate the number of points the player should receive
    let points = task.points;
    if(taskSuccessful) {
        if(task.scalePoints) {
            const durationDelta = submission.submissionTime - game!.settings.startTime + 0.01;
            points = Math.round(task.points * (1 - durationDelta / game!.settings.duration));
        }

        // Check if the player has completed the minimum required tasks
        const completedTasksCount = player!.tasksSubmitted.filter(t => t.success).length;

        // Update the player's done state if it hasn't already been updated
        if (!player!.done && completedTasksCount >= game!.settings.numRequiredTasks - 1) {
            const doneUpdate = await getPlayerColl().updateOne(
                { username: decodedToken.username, gameId: gameId },
                { $set: { done: true } }
            );
            assert(doneUpdate.acknowledged && doneUpdate.modifiedCount == 1, "Failed to update player's done status");
        }
    } else {
        // Decrement the player's points for a bad submission (same even if scalePoints is true)
        // Do this even if they've already successfully submitted this task... lol
        points = Math.abs(points) * -1;
    }

    // Update the player
    const playerUpdate = await getPlayerColl().updateOne(
        { username: decodedToken.username, gameId: gameId }, 
        { $push: { tasksSubmitted: submission }, $inc: { points: points } }
    );
    assert(playerUpdate.acknowledged && playerUpdate.modifiedCount == 1, "Task submission update failed");
}