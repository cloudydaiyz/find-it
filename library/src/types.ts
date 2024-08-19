import { JwtPayload } from "jsonwebtoken";
import { ObjectId } from "mongodb";

// All the information about a general user (host, admin, player)
export interface UserSchema {
    username: string;
    password: string;
}

// JWT payload for authentication
export interface UserToken extends JwtPayload {
    userid: ObjectId;
    username: string;
    gameId?: ObjectId;
    role?: UserRole;
}

// Roles for players of a game
export type PlayerRole = "player" | "admin";

// Roles for users in a game
export type UserRole = "host" | PlayerRole;

// All the information about a game
export interface GameSchema {
    settings: GameSettings; // immutable once game is running or ended
    tasks: TaskSchema[]; // tasks embedded in order (since they're static and don't change)
    state: GameState;
    stopScheduleArn?: string;

    host: string;
    admins: string[];
    players: string[];
};

// Different states of a game
export type GameState = 'not ready' | 'ready' | 'running' | 'ended';

// All settings for a game
export interface GameSettings {
    name: string;
    duration: number; // 0 for infinite
    startTime: number;
    endTime: number; // startTime + duration, 0 for infinite, may end early
    ordered: boolean; // false iff tasks in the game are unordered
    minPlayers: number; // can be 0 if people can join mid game
    maxPlayers: number;
    joinMidGame: boolean;
    numRequiredTasks: number;
};

// The public information about a task
export interface PublicGameSchema {
    settings: GameSettings;
    numTasks: number;
    state: GameState;

    host: string;
    admins: string[];
    players: string[];
};

/**
 * All the information about a game task
 * - `answers`: the indicies of the correct answers for this task in `answerChoices`, 
 *   accepts any answer if empty
 * - `attempts`: amount of attempts allowed for this task, 0 for infinite
 * - `scalePoints`: scale points based on time remaining, automatically false if 
 *   duration is infinite
 */
export interface TaskSchema {
    _id: ObjectId;
    type: TaskType;
    question: string;
    clue: string;
    required: boolean;
    points: number;
    answerChoices: string[];
    
    answers: number[];
    attempts: number;
    scalePoints: boolean;
};

// All the information about a player's task submission
export interface TaskSubmission {
    _id: ObjectId;
    taskid: ObjectId;
    answers: string[];
    submissionTime: number;
    success: boolean;
}

// Allowed types for tasks
export type TaskType = "multiple choice" | "text";

// The public information about a task
export type PublicTaskSchema = Omit<TaskSchema, "answers">;

// All the information about a player
export interface PlayerSchema {
    gameId: ObjectId;
    username: string;
    points: number;
    tasksSubmitted: TaskSubmission[];
    done: boolean;
};

// All the public information about a player
export interface PublicPlayerSchema {
    gameId: ObjectId;
    username: string;
    points: number;
    numTasksSubmitted: number;
    numTasksCompleted: number;
    done: boolean;
}

// Credentials to access resources as a user
export interface AccessCredentials {
    accessToken: string,
    refreshToken: string
}

// Confirmation that a game was created
export type CreateGameConfirmation = {
    creds: AccessCredentials,
    gameid: string,
    taskids: string[]
};

// Updated information about a game
export type UpdateGameStateConfirmation = {
    startTime: number,
    endTime: number
}

// Confirmation on task submit
export type TaskSubmissionConfirmation = {
    submissionTime: number,
    success: boolean
}