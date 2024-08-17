// Authentication functions

import assert from "assert";
import { getGameColl, getUserColl } from "./core";
import jwt from "jsonwebtoken";
import { AccessCredentials, UserRole, UserToken } from "./types";
import { ObjectId } from "mongodb";
import { MAX_USERS } from "./constants";

/**
 * Verifies the JWT token belongs to the specified game and has one of the specified roles
 * @param token The token to verify
 * @param gameId The game ID the token should belong to
 * @param requiredRoles Options for the roles the token should have
 * @returns The decoded token
 */
export function verifyToken(token: string, gameId?: ObjectId, requiredRoles?: UserRole[]) {
    const decodedToken = jwt.verify(token, process.env['ACCESS_TOKEN_KEY'] as string) as UserToken;
    assert(!gameId || decodedToken.gameId == gameId, "Invalid token; wrong game");
    assert(requiredRoles?.includes(decodedToken.role as UserRole) != false, "Invalid credentials");
    return decodedToken;
}

// Creates a new user
export async function signup(username: string, password: string) {
    const users = await getUserColl().find().toArray();
    assert(users.length < MAX_USERS, "Max users reached");
    assert(users.find(u => u.username == username) == null, 'User already exists');
    
    const res = await getUserColl().insertOne({
        username: username,
        password: password
    });
    assert(res.acknowledged && res.insertedId, "Unable to complete signup");
}

// Generates an access token and refresh token
export async function login(username: string, password: string) {
    const user = await getUserColl().findOne({
        username: username,
        password: password
    });

    if(user && user.username == username && user.password == password) {
        const creds = {
            userid: user._id,
            username: user.username
        };

        const access_token = jwt.sign(
            creds, 
            process.env['ACCESS_TOKEN_KEY'] as string, 
            { expiresIn: "15min" }
        );
        const refresh_token = jwt.sign(
            creds, 
            process.env['REFRESH_TOKEN_KEY'] as string, 
            { expiresIn: "3hr" }
        );

        return {
            accessToken: access_token,
            refreshToken: refresh_token
        } as AccessCredentials;
    }
    
    throw new Error('Invalid credentials');
}

// Generates a new access token from a refresh token
export async function refresh(token: string) {
    let accessToken: string | null = null;

    await jwt.verify(token, process.env['REFRESH_TOKEN_KEY'] as string, async (err, decoded) => {
        assert(!err && typeof decoded != 'string', "Invalid token");

        const decodedToken = decoded as UserToken;
        const user = await getUserColl().findOne({
            _id: new ObjectId(`${decodedToken.userid}`)
        });
        assert(user, "Invalid user");
        
        // Generate new credentials from the previous token
        const creds: UserToken = {
            userid: user._id,
            username: user.username
        };
        if(decodedToken.gameId) creds.gameId = decodedToken.gameId;
        if(decodedToken.role) creds.role = decodedToken.role;
        
        accessToken = jwt.sign(
            creds, 
            process.env['ACCESS_TOKEN_KEY'] as string, 
            { expiresIn: "15min" }
        );
    });

    assert(accessToken != null, "Unable to retrieve access token");
    return accessToken as string;
}