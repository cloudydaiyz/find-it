export const MAX_GAMES = Number(process.env['MAX_GAMES']) || 10;
export const MAX_ADMINS = Number(process.env['MAX_ADMINS']) || 5;
export const MAX_TASKS = Number(process.env['MAX_TASKS']) || 20;
export const MAX_PLAYERS = Number(process.env['MAX_PLAYERS']) || 100;
export const MAX_USERS = Number(process.env['MAX_USERS']) || 100;

export const ACCESS_TOKEN_KEY = process.env['ACCESS_TOKEN_KEY'] || "AT";
export const REFRESH_TOKEN_KEY = process.env['REFRESH_TOKEN_KEY'] || "RT";
export const ADMIN_CODES = process.env['ADMIN_CODES']?.split(',') || [];

export const SCHEDULER_ROLE_ARN = process.env['SCHEDULER_ROLE_ARN'];
export const SCHEDULER_GROUP_NAME = process.env['SCHEDULER_GROUP_NAME'];