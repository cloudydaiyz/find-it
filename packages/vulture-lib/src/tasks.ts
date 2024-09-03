// Task management functions

import { ObjectId } from "mongodb";
import { getClient, getGameColl, getPlayerColl } from "./mongodb";
import { verifyToken } from "./auth";
import { PublicTaskSchema, TaskSchema, TaskSubmission, TaskSubmissionConfirmation } from "./types";
import assert from "assert";

// Returns public information about all tasks
export async function viewAllPublicTasks(rawGameId: string): Promise<PublicTaskSchema[]> {
    const gameId = new ObjectId(rawGameId);
    const game = await getGameColl().findOne({ _id: gameId });
    assert(game, "Invalid game ID");

    const publicTasks: PublicTaskSchema[] = [];
    for(const task of game.tasks) {
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

// Returns information about all tasks; only a host or admin can see
export async function viewAllTasks(token: string, rawGameId: string): Promise<TaskSchema[]> {
    const gameId = new ObjectId(rawGameId);
    verifyToken(token, gameId, ["host", "admin"]);

    const game = await getGameColl().findOne({ _id: gameId });
    assert(game, "Invalid game ID");
    return game.tasks;
}

// Returns public information about a task
export async function viewPublicTask(rawGameId: string, rawTaskId: string): Promise<PublicTaskSchema> {
    const gameId = new ObjectId(rawGameId);
    const game = await getGameColl().findOne({ _id: gameId });
    assert(game, "Invalid game ID");

    const task = game.tasks.find(t => t._id.toString() == rawTaskId);
    assert(task, "Invalid task ID");

    const publicTask: PublicTaskSchema = {
        _id: task._id,
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

// Returns information about a task; only a host or admin can see
export async function viewTask(token: string, rawGameId: string, rawTaskId: string): Promise<TaskSchema> {
    const gameId = new ObjectId(rawGameId);
    verifyToken(token, gameId, ["host", "admin"]);

    const game = await getGameColl().findOne({ _id: gameId });
    assert(game, "Invalid game ID");

    const task = game.tasks.find(t => t._id.toString() == rawTaskId);
    assert(task != undefined, "Invalid task ID");
    return task;
}

// Submits a task for the given player with the specified answers
export async function submitTask(token: string, rawGameId: string, rawTaskId: string, answers: string[]): Promise<TaskSubmissionConfirmation> {
    const gameId = new ObjectId(rawGameId);
    const taskId = new ObjectId(rawTaskId);
    const decodedToken = verifyToken(token, gameId, ["player"]);

    // Retrieve the game from the database
    const game = await getGameColl().findOne({ _id: gameId });
    assert(game, "Invalid game ID");
    assert(game.state == "running", "Game is not running");

    // Verify the task exists in the game
    const task = game.tasks.find(t => t._id.toString() == rawTaskId);
    assert(task, "Invalid task ID");

    // Retrieve the player from the database and ensure they haven't reached the max attempts
    const player = await getPlayerColl().findOne({ username: decodedToken.username, gameId: gameId });
    assert(player, "Invalid player");

    const attempts = player.tasksSubmitted.filter(submission => submission.taskid.equals(taskId));
    assert(attempts.length < task.attempts, "Max attempts reached");

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

    // Start a MongoDB client session to begin a transaction
    const session = getClient().startSession();
    await session.withTransaction(async () => {

        // Calculate the number of points the player should receive
        let points = task.points;
        if(taskSuccessful) {
            if(task.scalePoints) {
                const durationDelta = submission.submissionTime - game.settings.startTime + 0.01;
                points = Math.round(task.points * (1 - durationDelta / game.settings.duration));
            }

            // Check if the player has completed the minimum required tasks
            const completedTasksCount = player.tasksSubmitted.filter(t => t.success).length;

            // Update the player's done state if it hasn't already been updated
            if (!player.done && completedTasksCount >= game.settings.numRequiredTasks - 1) {
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
    }).then(() => session.endSession());

    return {
        submissionTime: submission.submissionTime,
        success: submission.success
    };
}