import { createSync } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    user_id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    is_admin: z.boolean().optional(),
    num_transcripts: z.number().optional(),
    recent_meeting: z.string().optional(),
    recent_transcript: z.string().optional(),
    minutes_consumed: z.number().optional(),
    is_calendar_in_sync: z.boolean().optional()
});

const ProviderUserSchema = z.object({
    user_id: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    is_admin: z.boolean().nullable().optional(),
    num_transcripts: z.number().nullable().optional(),
    recent_meeting: z.string().nullable().optional(),
    recent_transcript: z.string().nullable().optional(),
    minutes_consumed: z.number().nullable().optional(),
    is_calendar_in_sync: z.boolean().nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        users: z.array(z.unknown())
    })
});

const sync = createSync({
    description: 'Full-refresh sync of workspace users.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        // Blocker: the users query has no changed-since filter, pagination, or cursor.

        // https://docs.fireflies.ai/graphql-api/query/users
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: 'query { users { user_id name email is_admin num_transcripts recent_meeting recent_transcript minutes_consumed is_calendar_in_sync } }'
            },
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new Error('Invalid response from Fireflies users API');
        }

        const users = parsedResponse.data.data.users.map((rawUser) => {
            const parsedUser = ProviderUserSchema.safeParse(rawUser);
            if (!parsedUser.success) {
                throw new Error('Invalid user record in Fireflies response');
            }
            const user = parsedUser.data;
            return {
                id: user.user_id,
                user_id: user.user_id,
                ...(user.name != null && { name: user.name }),
                ...(user.email != null && { email: user.email }),
                ...(user.is_admin != null && { is_admin: user.is_admin }),
                ...(user.num_transcripts != null && { num_transcripts: user.num_transcripts }),
                ...(user.recent_meeting != null && { recent_meeting: user.recent_meeting }),
                ...(user.recent_transcript != null && { recent_transcript: user.recent_transcript }),
                ...(user.minutes_consumed != null && { minutes_consumed: user.minutes_consumed }),
                ...(user.is_calendar_in_sync != null && { is_calendar_in_sync: user.is_calendar_in_sync })
            };
        });

        await nango.trackDeletesStart('User');
        await nango.batchSave(users, 'User');
        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
