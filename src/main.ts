import { adminCodes } from "./secrets";
import crypto from "crypto";
import assert from "assert";

/*****************/
// General Types //
/*****************/

type TaskType = "none" | "multiple choice" | "short answer" | "paragraph";

type TaskGameInfo = {
    taskid: string;
    type: TaskType;
    clue: string;
    question: string;
    answerChoices: string[];
    points: number;
    required: boolean;
    attempts: number; // 0 for infinite
}

type Task = TaskGameInfo & {
    answers: string[]; // empty = accepts any answer
    scalePoints: boolean; // scale points based on time, automatically false if duration is infinite
};

type TaskSubmission = {
    taskid: string,
    answers: string[],
};

type TaskSubmissionInfo = TaskSubmission & {
    submissionTime: number,
    success: boolean
}

type PlayerStats = { 
    name: string, 
    points: number, 
    numTasksSubmitted: number 
}

type Player = {
    playerid: string;
    name: string;
    points: number;
    tasksSubmitted: TaskSubmissionInfo[];
    done: boolean;
};

type GameSettings = {
    name: string;
    duration: number; // 0 for infinite
    startTime: number;
    endTime: number; // startTime + duration, 0 for infinite, may end early
    ordered: boolean; // false if tasks in the game are unordered
};

type GameState = 'not ready' | 'ready' | 'running' | 'ended';

type GameStats = {
    gameid: string;
    settings: GameSettings; // can't edit if game is running or ended
    numTasks: number;
    numRequiredTasks: number;
    minPlayers: number; // can be 0 if people can join mid game
    maxPlayers: number;
    numPlayers: number;
    joinMidGame: boolean;
    state: GameState;
}

type Game = GameStats & {
    tasks: Task[]; // tasks in order
    players: Player[];
    hostid: string;
}

type CreateGameConfirmation = { 
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
function generateId() {
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
function search<GameType>(list: GameType[], handler: (listitem: GameType) => boolean, errormsg: string) {
    const obj = list.find(handler);
    assert(obj != undefined, errormsg);

    return obj as GameType;
}

/******************/
// Game functions //
/******************/

// Creates a new game from the given configuration
function createGame(settings: GameSettings, tasks: Task[], minPlayers: number, maxPlayers: number, joinMidGame: boolean): CreateGameConfirmation {
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

    return {
        gameid: newGame.gameid,
        hostid: newGame.hostid
    };
}

// Adds a new player to the game
function joinGame(gameid: string, playerName: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");
    assert(game.state == "running" && game.joinMidGame || game.state != "ended", "Invalid game state");

    const player = {
        playerid: generateId(),
        name: playerName,
        points: 0,
        tasksSubmitted: [],
        done: false
    };
    game.players.push(player);
    game.numPlayers++;

    return player.playerid;
}

// Removes a player
// Only the host can call this
function leaveGame(gameid: string, playerid: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");
    const player = search(game.players, p => p.playerid == playerid, "Can't find specified player");
    assert(game.state != "ended", "Invalid game state");

    game.players = game.players.filter(p => p.playerid != playerid);
    game.numPlayers--;
    return player;
}

// Begins a game
// Only the host can call this
function startGame(gameid: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");
    assert(game.state == "ready", "Invalid game state, can't start game");

    game.state = "running";
    game.settings.startTime = Date.now();
    game.settings.endTime = game.settings.duration == 0 ? 
        0 : game.settings.startTime + game.settings.duration;
    return game.settings.startTime;
}

// Ends a game
// Only the host can call this
function stopGame(gameid: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");
    assert(game.state == "running", "Invalid game state, can't stop game");

    game.state = "ended";
    game.settings.endTime = Date.now();
    return game.settings.endTime;
}

// Restarts the game
// Only the host can call this
function restartGame(gameid: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");
    assert(game.state == "ended", "Invalid game state, can't restart game");

    // Make a new game from the old game's stats
    return createGame(game.settings, game.tasks, game.minPlayers, game.maxPlayers, game.joinMidGame);
}

// View all the game's tasks
// Only the host can call this
function viewAllTasks(gameid: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");

    return game.tasks;
}

// View a specific tasks
// Only the host can call this
function viewTask(gameid: string, taskid: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");
    const task = search(game.tasks, t => t.taskid == taskid, "Can't find specified task");

    return task;
}

// View the public info for a specific task
// The host and player can call this
function viewTaskInfo(gameid: string, taskid: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");
    const task = search(game.tasks, t => t.taskid == taskid, "Can't find specified task");

    const taskInfo: TaskGameInfo = {
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
function viewGameStats(gameid: string) {
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
function submitTask(gameid: string, playerid: string, submission: TaskSubmission) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");
    const player = search(game.players, p => p.playerid == playerid, "Can't find specified player");
    const task = search(game.tasks, t => t.taskid == submission.taskid, "Can't find specified task");
    assert(player.tasksSubmitted.find(ts => ts.taskid == submission.taskid && ts.success) == undefined, 
        "Player already successfully submitted task");

    const submissionTime = Date.now();
    const taskSuccessful = task.answers.length == 0 ? true 
        : task.answers.every(ans => submission.answers.find(sub => ans == sub) != undefined);
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
function viewPlayerStats(gameid: string, playerid: string) {
    const game = search(games, g => g.gameid == gameid, "Can't find specified game");
    const player = search(game.players, p => p.playerid == playerid, "Can't find specified player");
    
    const playerStats: PlayerStats = {
        name: player.name,
        points: player.points,
        numTasksSubmitted: player.tasksSubmitted.length
    }
    return playerStats;
}