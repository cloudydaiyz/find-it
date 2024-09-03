// Authentication functions

import assert from "assert";
import { getClient, getGameColl, getPlayerColl, getUserColl } from "./mongodb";
import jwt from "jsonwebtoken";
import { AccessCredentials, UserRole, UserSchema, UserToken } from "./types";
import { ObjectId, WithId } from "mongodb";
import { ACCESS_TOKEN_KEY, ADMIN_CODES, MAX_USERS, REFRESH_TOKEN_KEY } from "./constants";

/**
 * Verifies the JWT token belongs to the specified game and has one of the specified roles
 * @param token The token to verify
 * @param gameId The game ID the token should belong to
 * @param requiredRoles Options for the roles the token should have
 * @returns The decoded token
 */
export function verifyToken(token: string, gameId?: ObjectId, requiredRoles?: UserRole[]): UserToken {
    const decodedToken = jwt.verify(token, process.env['ACCESS_TOKEN_KEY'] as string) as UserToken;
    assert(!gameId || decodedToken.gameId == gameId, "Invalid token; wrong game");
    assert(requiredRoles?.includes(decodedToken.role as UserRole) != false, "Invalid credentials");
    return decodedToken;
}

// Creates a new user, can bypass limit with an admin code
export async function signup(username: string, password: string, code?: string): Promise<void> {
    const users = await getUserColl().find().toArray();
    assert(users.length < MAX_USERS || code && ADMIN_CODES.includes(code), "Max users reached");
    assert(users.find(u => u.username == username) == null, 'User already exists');
    
    const res = await getUserColl().insertOne({
        username: username,
        password: password
    });
    assert(res.acknowledged && res.insertedId, "Unable to complete signup");
}

// Generates an access token and refresh token
export async function login(username: string, password: string): Promise<AccessCredentials> {
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
            ACCESS_TOKEN_KEY, 
            { expiresIn: "15min" }
        );
        const refresh_token = jwt.sign(
            creds, 
            REFRESH_TOKEN_KEY, 
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
export async function refresh(token: string): Promise<string> {
    let accessToken: string | null = null;

    await jwt.verify(token, REFRESH_TOKEN_KEY, async (err, decoded) => {
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

// Deletes a user, including player data their entry in any games they've joined
export async function deleteUser(code: string, username: string): Promise<WithId<UserSchema>> {
    assert(ADMIN_CODES.includes(code), "Invalid admin code");

    const user = await getUserColl().findOne({ username: username });
    assert(user, "User not found");

    const session = await getClient().startSession();
    await session.withTransaction(async () => {

        const deleteUser = await getUserColl().deleteOne({ username: username });
        assert(deleteUser.acknowledged && deleteUser.deletedCount == 1, "Unable to delete user");

        const deletePlayers = await getPlayerColl().deleteMany({ username: username });
        assert(deletePlayers.acknowledged);

        const deleteFromGames = await getGameColl().updateMany({ players: username }, { $pull: { players: username }});
        assert(deleteFromGames.acknowledged);
    });

    return user;
}