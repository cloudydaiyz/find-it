export const MAX_GAMES = Number(process.env['VULTURE_MAX_GAMES']) || 10;
export const MAX_ADMINS = Number(process.env['VULTURE_MAX_ADMINS']) || 5;
export const MAX_TASKS = Number(process.env['VULTURE_MAX_TASKS']) || 20;
export const MAX_PLAYERS = Number(process.env['VULTURE_MAX_PLAYERS']) || 100;
export const MAX_USERS = Number(process.env['VULTURE_MAX_USERS']) || 100;

export const ACCESS_TOKEN_KEY = process.env['ACCESS_TOKEN_KEY'] || "AT";
export const REFRESH_TOKEN_KEY = process.env['REFRESH_TOKEN_KEY'] || "RT";
export const ADMIN_CODES = process.env['ADMIN_CODES']?.split(',') || [];

export const SCHEDULER_ROLE_ARN = process.env['SCHEDULER_ROLE_ARN'];