import { JwtPayload } from "jsonwebtoken";
import { ObjectId } from "mongodb";

// All the information about a general user (host, admin, player)
export interface UserSchema {
    username: string;
    password: string;
}

export interface UserToken extends JwtPayload {
    userid: ObjectId;
    username: string;
    gameId?: ObjectId;
    role?: UserRole;
}
export type UserRole = "player" | "host" | "admin";

// All the information about a game
export interface GameSchema {
    settings: GameSettings; // immuntable once game is running or ended
    tasks: TaskSchema[]; // tasks embedded in order (since they're static and don't change)
    state: GameState;

    host: string;
    admins: string[];
    players: string[];
};
export type GameState = 'not ready' | 'ready' | 'running' | 'ended';

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

// All the information about a game task
export interface TaskSchema {
    _id: ObjectId;
    type: TaskType;
    question: string;
    clue: string;
    answerChoices: string[];
    answers: number[]; // the index of the correct answers for this task, empty = accepts any answer

    attempts: number; // 0 for infinite
    required: boolean;
    points: number;
    scalePoints: boolean; // scale points based on time, automatically false if duration is infinite
};
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

// All the information about a player's task submission
export interface TaskSubmission {
    _id: ObjectId;
    taskid: ObjectId;
    answers: string[];
    submissionTime: number;
    success: boolean;
}

export interface AccessCredentials {
    accessToken: string,
    refreshToken: string
}

export type CreateGameConfirmation = {
    creds: AccessCredentials,
    gameid: string
};