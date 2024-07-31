import assert from "assert";
import * as main from "../src/main";

/* HELPERS */

/**
 * Math.floor(Math.random() * factor)
 * @param factor factor to multiply the range by
 * @returns A random number from 0 to (factor - 1)
 */
function randomF(factor: number) {
    return Math.floor(Math.random() * factor);
}

/**
 * Based on a random number between 0 to 100, select obj1 or obj2
 * @param percent Percent chance of obj1 being selected
 * @param obj1 The object to return if the random number is < percent
 * @param obj2 The object to return if the random number is >= percent
 * @returns obj1 or obj2 depending on what random number is return
 */
function chance(percent: number, obj1: any, obj2: any) {
    const c = randomF(101);
    // console.log(c);
    return c < percent ? obj1 : obj2;
}

/**
 * Generates a randomized list of tasks for the game
 * @param numTasks The number of TaskInfo objects to create
 * @param mustBeValid Whether the TaskInfo objects must be valid or not
 * @returns A list of TaskInfo object
 */
function generateRandomTasks(numTasks: number, mustBeValid?: boolean) {
    const tasks: main.TaskInfo[] = [];

    if(mustBeValid == undefined) {
        mustBeValid = chance(50, true, false);
    }

    for(let i = 0; i < numTasks; i++) {
        // Get a random task type
        const taskTypes: main.TaskType[] = ["multiple choice", "text"];
        const randomIndex = randomF(taskTypes.length);
        const taskType = taskTypes[randomIndex];

        // Generate random answer choices
        const answerChoices: string[] = [];
        for(let j = 0; j < randomF(5) + 1; j++) {
            answerChoices.push(crypto.randomUUID());
        }

        // Generate random answers
        const answers: number[] = [];
        if(mustBeValid) {
            for(let i = 0; i < randomF(answerChoices.length); i++) {
                answers.push(i);
            }
        } else {
            for(let i = 0; i < randomF(10); i++) {
                answers.push(randomF(10));
            }
        }

        const tsk: main.TaskInfo = {
            taskid: "", // creating a game will generate this id for us
            type: taskType,
            clue: crypto.randomUUID(),
            question: crypto.randomUUID(),
            answerChoices: answerChoices,
            points: randomF(250) + 1,
            required: chance(50, true, false),
            attempts: randomF(4),
            answers: answers,
            scalePoints: chance(50, true, false)
        }
        tasks.push(tsk);
    }

    return tasks;
}

/* TESTS */