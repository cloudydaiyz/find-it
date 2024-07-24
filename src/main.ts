import { adminCodes } from "./secrets";

type Game = {
    gameid: string;
    settings: GameSettings; // can't edit if game is running or ended
    players: Player[];
    host: Host;
    state: GameState;
    minPlayers: number; // can be 0 if people can join mid game
    joinMidGame: boolean;
}

type GameSettings = {
    name: string;
    duration: number; // 0 for infinite
    startTime: number;
    endTime: number; // startTime + duration, 0 for infinite
    tasks: string;
    ordered: boolean; // false if tasks in the game are unordered
    taskOrder: string[]; // empty if unordered
}

type Player = {
    playerid: string;
    name: string;
    points: number;
}

type Host = {
    hostid: string;
}

type GameState = 'not ready' | 'ready' | 'running' | 'ended';

type Task = {
    taskid: string;
    clue: string;
    question: string;
    type: string;
    successCriteria: string;
    points: number;
    required: boolean;
    attempts: number; // 0 for infinite
}

const games : Game[] = [];

function createGame() {

}

function viewGameStats() {

}

function startGame() {

}

function stopGame() {

}

function restartGame() {

}

function viewGameTasks() {

}

function viewGameTask() {

}

function submitTask() {

}

function viewPlayerStats() {

}

function leaveGame() {

}

console.log('hello world');
console.log(adminCodes);