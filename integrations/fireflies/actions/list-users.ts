import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderUserSchema = z.object({
    user_id: z.string(),
    name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    is_admin: z.boolean().optional().nullable(),
    num_transcripts: z.number().optional().nullable(),
    recent_meeting: z.string().optional().nullable(),
    recent_transcript: z.string().optional().nullable(),
    minutes_consumed: z.number().optional().nullable(),
    is_calendar_in_sync: z.boolean().optional().nullable()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        users: z.array(ProviderUserSchema)
    }),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const OutputUserSchema = z.object({
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

const OutputSchema = z.object({
    users: z.array(OutputUserSchema)
});

const action = createAction({
    description: 'List all users in the workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.fireflies.ai/graphql-api/query/users
            endpoint: '/graphql',
            data: {
                query: `
                    query Users {
                        users {
                            user_id
                            name
                            email
                            is_admin
                            num_transcripts
                            recent_meeting
                            recent_transcript
                            minutes_consumed
                            is_calendar_in_sync
                        }
                    }
                `
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            const firstError = providerResponse.errors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'graphql_error',
                    message: firstError.message
                });
            }
        }

        const users = providerResponse.data.users.map((user) => ({
            user_id: user.user_id,
            ...(user.name != null && { name: user.name }),
            ...(user.email != null && { email: user.email }),
            ...(user.is_admin != null && { is_admin: user.is_admin }),
            ...(user.num_transcripts != null && { num_transcripts: user.num_transcripts }),
            ...(user.recent_meeting != null && { recent_meeting: user.recent_meeting }),
            ...(user.recent_transcript != null && { recent_transcript: user.recent_transcript }),
            ...(user.minutes_consumed != null && { minutes_consumed: user.minutes_consumed }),
            ...(user.is_calendar_in_sync != null && { is_calendar_in_sync: user.is_calendar_in_sync })
        }));

        return { users };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
