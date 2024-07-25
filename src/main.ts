import { adminCodes } from "./secrets";
import crypto from "crypto";
import assert from "assert";

/*****************/
// General Types //
/*****************/

// Question type for a task
export type TaskType = "multiple choice" | "text";

// All the information about a game task
export type TaskInfo = {
    taskid: string;
    type: TaskType;
    clue: string;
    question: string;
    answerChoices: string[];
    points: number;
    required: boolean;
    attempts: number; // 0 for infinite

    answers: number[]; // the index of the correct answers for this task, empty = accepts any answer
    scalePoints: boolean; // scale points based on time, automatically false if duration is infinite
};

// Info that the game presents to players about a task
export type Task = Omit<TaskInfo, "answers" | "scalePoints">;

// All the information about a player's task submission
export type TaskSubmissionInfo = {
    taskid: string,
    answers: string[],

    submissionTime: number,
    success: boolean
}

// The information a player submits for a task
export type TaskSubmission = Omit<TaskSubmissionInfo, "submissionTime" | "success">;

// All the information about a player
export type Player = {
    name: string, 
    points: number, 
    numTasksSubmitted: number 

    playerid: string;
    tasksSubmitted: TaskSubmissionInfo[];
    done: boolean;
};

// The publicly viewable information about a player's stats
export type PlayerStats = Omit<Player, "playerid" | "tasksSubmitted" | "done">;

// The settings for the game
export type GameSettings = {
    name: string;
    duration: number; // 0 for infinite
    startTime: number;
    endTime: number; // startTime + duration, 0 for infinite, may end early
    ordered: boolean; // false if tasks in the game are unordered
};

// The different states of a game's lifecycle
export type GameState = 'not ready' | 'ready' | 'running' | 'ended';

// All the information about a game
export type Game = {
    gameid: string;
    settings: GameSettings; // can't edit if game is running or ended
    numTasks: number;
    numRequiredTasks: number;
    minPlayers: number; // can be 0 if people can join mid game
    maxPlayers: number;
    numPlayers: number;
    joinMidGame: boolean;
    state: GameState;

    tasks: TaskInfo[]; // tasks in order
    players: Player[];
    hostid: string;
}

// The publicly viewable stats about a game
export type GameStats = Omit<Game, "tasks" | "players" | "hostid">;

// The information sent on confirm that a game was successfully created
export type CreateGameConfirmation = { 
    gameid: string, 
    hostid: string 
};

/*************/
// Constants //
/*************/

const games : Game[] = [];

/********************/
// Helper functions //
/********************/

/**
 * Generates a 16 byte hex string that can be used as an ID
 * @returns generated ID
 */
export function generateId() {
    // return crypto.randomUUID;
    return crypto.randomBytes(16).toString("hex");
}

/**
 * Searches the list for the corresponding listitem, and throws an error if it's
 * not found.
 * @param list the list to search
 * @param handler the predicate to determine search criteria
 * @param errormsg the message to send when the listiem isn't found
 * @returns the listitem
 */
export function search<GameType>(list: GameType[], handler: (listitem: GameType) => boolean, errormsg: string) {
    const obj = list.find(handler);
    assert(obj != undefined, errormsg);

    return obj as GameType;
}

/******************/
// Game functions //
/******************/

// Creates a new game from the given configuration
export function createGame(settings: GameSettings, tasks: TaskInfo[], minPlayers: number, maxPlayers: number, joinMidGame: boolean): CreateGameConfirmation {
    const newGame: Game = {
        gameid: generateId(),
        settings: settings,
        numTasks: tasks.length,
        numRequiredTasks: tasks.filter(t => t.required).length,
        tasks: tasks,
        players: [],
        numPlayers: 0,
        hostid: generateId(),
        state: "not ready",
        minPlayers: minPlayers,
        maxPlayers: maxPlayers,
        joinMidGame: joinMidGame
    };
    games.push(newGame);
    tasks.forEach(t => t.taskid = generateId()); // generate random IDs for tasks

    // TODO: If a game has a scheduled start time (start time > 0), schedule the game to
    // start (NOT end since the start time may be delayed) @ start time via EventBridge Scheduler

    return {
        gameid: newGame.gameid,
        hostid: newGame.hostid
    };
}

export function getGame(gameid: string) {
    return games.find(g => g.gameid == gameid);
}

// Adds a new player to the game
// Returns the new player ID
// Only a new player should call this
export function joinGame(gameid: string, playerName: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");
    assert(game.state == "running" && game.joinMidGame || game.state != "ended", "Invalid game state");

    const player = {
        playerid: generateId(),
        name: playerName,
        points: 0,
        tasksSubmitted: [],
        numTasksSubmitted: 0,
        done: false
    };
    game.players.push(player);
    game.numPlayers++;

    return player.playerid;
}

// Removes a player
// Only the host or the player can call this
export function leaveGame(gameid: string, playerid: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");
    const player = search(game.players, p => p.playerid == playerid, "Can't find specified player");
    assert(game.state != "ended", "Invalid game state");

    player.done = true;
    game.players = game.players.filter(p => p.playerid != playerid);
    game.numPlayers--;
    return player;
}

// Begins a game
// Only the host can call this
export function startGame(gameid: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");
    assert(game.state == "ready", "Invalid game state, can't start game");

    // TODO: Call EventBridge scheduler to schedule the end time

    game.state = "running";
    game.settings.startTime = Date.now();
    game.settings.endTime = game.settings.duration == 0 ? 
        0 : game.settings.startTime + game.settings.duration;
    return game.settings.startTime;
}

// Ends a game
// Only the host can call this
export function stopGame(gameid: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");
    assert(game.state != "ended", "Game already ended");

    // TODO: Cancel EventBridge scheduler

    game.state = "ended";
    game.settings.endTime = Date.now();
    return game.settings.endTime;
}

// Restarts the game
// Only the host can call this
export function restartGame(gameid: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");
    assert(game.state == "ended", "Invalid game state, can't restart game");

    // Make a new game from the old game's stats
    return createGame(game.settings, game.tasks, game.minPlayers, game.maxPlayers, game.joinMidGame);
}

// View all the game's tasks
// Only the host can call this
export function viewAllTasks(gameid: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");

    return game.tasks;
}

// View a specific tasks
// Only the host can call this
export function viewTask(gameid: string, taskid: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");
    const task = search(game.tasks, t => t.taskid == taskid, "Can't find specified task");

    return task;
}

// View the public info for a specific task
// The host and player can call this
export function viewTaskInfo(gameid: string, taskid: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");
    const task = search(game.tasks, t => t.taskid == taskid, "Can't find specified task");

    const taskInfo: Task = {
        taskid: task.taskid,
        type: task.type,
        clue: task.clue,
        question: task.question,
        answerChoices: task.answerChoices,
        points: task.points,
        required: task.required,
        attempts: task.attempts
    };
    return taskInfo;
}

// View the public stats for the current game
// The host and player can call this
export function viewGameStats(gameid: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");

    const stats: GameStats = {
        gameid: game.gameid,
        settings: game.settings,
        numTasks: game.numTasks,
        numRequiredTasks: game.numRequiredTasks,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        numPlayers: game.numPlayers,
        joinMidGame: game.joinMidGame,
        state: game.state
    }
    return stats;
}

// Submit a task
// Only the player can call this
export function submitTask(gameid: string, playerid: string, submission: TaskSubmission) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");
    const player = search(game.players, p => p.playerid == playerid, "Can't find specified player");
    const task = search(game.tasks, t => t.taskid == submission.taskid, "Can't find specified task");
    assert(player.tasksSubmitted.find(ts => ts.taskid == submission.taskid && ts.success) == undefined, 
        "Player already successfully submitted task");

    const submissionTime = Date.now();
    const taskSuccessful = task.answers.length == 0 ? true 
        : task.answers.every(ans => submission.answers.find(sub => task.answerChoices[ans] == sub) != undefined);
    let points = task.points;

    // Scale the points given based on the time
    if(task.scalePoints) {
        const durationDelta = submissionTime - game.settings.startTime + 0.01;
        points = Math.round(task.points * (1 - durationDelta / game.settings.duration));
    }

    const submissionInfo: TaskSubmissionInfo = {
        taskid: submission.taskid,
        answers: submission.answers,
        submissionTime: submissionTime,
        success: taskSuccessful
    }
    player.tasksSubmitted.push(submissionInfo);

    if(taskSuccessful) {
        player.points += points;
    } else {
        // Points lost aren't scaled, sucks to suck
        player.points -= task.points; 
    }

    return submissionInfo;
}

// View the public stats for a player
// The host and player can call this
export function viewPlayerStats(gameid: string, playerid: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");
    const player = search(game.players, p => p.playerid == playerid, "Can't find specified player");
    
    const playerStats: PlayerStats = {
        name: player.name,
        points: player.points,
        numTasksSubmitted: player.tasksSubmitted.length
    }
    return playerStats;
}