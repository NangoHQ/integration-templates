import { createSync } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.number(),
    username: z.string(),
    email: z.string(),
    color: z.string(),
    role: z.number().optional(),
    role_key: z.string().optional(),
    last_active: z.string().optional(),
    date_joined: z.string().optional()
});

const MemberSchema = z.object({
    user: UserSchema
});

const TeamSchema = z.object({
    id: z.union([z.number(), z.string()]),
    name: z.string(),
    members: z.array(MemberSchema).optional()
});

const TeamsResponseSchema = z.object({
    teams: z.array(TeamSchema)
});

const UserModelSchema = z.object({
    id: z.string(),
    username: z.string(),
    email: z.string(),
    color: z.string(),
    role: z.number().optional(),
    role_key: z.string().optional(),
    last_active: z.string().optional(),
    date_joined: z.string().optional()
});

const sync = createSync({
    description: 'Sync workspace members from ClickUp',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        User: UserModelSchema
    },
    endpoints: [
        {
            path: '/syncs/users',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Blocker: provider only exposes /api/v2/team with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor. All members are
        // returned in a single response embedded within teams[].members[].user.
        await nango.trackDeletesStart('User');

        // https://developer.clickup.com/reference/getteams
        const response = await nango.get({
            endpoint: '/api/v2/team',
            retries: 3
        });

        const parsed = TeamsResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Invalid response from ClickUp API: ${parsed.error.message}`);
        }

        const users: z.infer<typeof UserModelSchema>[] = [];
        for (const team of parsed.data.teams) {
            if (team.members && team.members.length > 0) {
                for (const member of team.members) {
                    const user = member.user;
                    users.push({
                        id: String(user.id),
                        username: user.username,
                        email: user.email,
                        color: user.color,
                        ...(user.role !== undefined && { role: user.role }),
                        ...(user.role_key !== undefined && { role_key: user.role_key }),
                        ...(user.last_active !== undefined && { last_active: user.last_active }),
                        ...(user.date_joined !== undefined && { date_joined: user.date_joined })
                    });
                }
            }
        }

        if (users.length > 0) {
            await nango.batchSave(users, 'User');
        }

        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
