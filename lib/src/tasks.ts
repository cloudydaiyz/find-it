// Task management functions

import { ObjectId } from "mongodb";
import { getGameColl } from "./core";
import { verifyToken } from "./auth";
import { PublicTaskSchema } from "./types";
import assert from "assert";

export async function viewAllPublicTasks(gameId: ObjectId) {
    const game = await getGameColl().findOne({ _id: gameId });

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

    const game = await getGameColl().findOne({ _id: gameId });
    return game!.tasks;
}

export async function viewPublicTask(gameId: ObjectId, taskId: ObjectId) {
    const game = await getGameColl().findOne({ _id: gameId });
    const task = game!.tasks.find(t => t._id.toString() == taskId.toString());
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

    const game = await getGameColl().findOne({ _id: gameId });
    const task = game!.tasks.find(t => t._id.toString() == taskId.toString());
    assert(task != undefined, "Invalid task ID");
    return task;
}