import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    connect_id: z.string().describe('The connect attempt id returned by start-connect. Example: "ca_9f8e7d6c"'),
    code: z.string().describe('The one-time code the user entered. Always "111111" in sandbox.')
});

const UserSchema = z.object({
    id: z.string(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional()
});

const OutputSchema = z.object({
    object: z.literal('connection'),
    access_token: z.string(),
    refresh_token: z.string(),
    token_type: z.literal('Bearer'),
    expires_in: z.number(),
    user: UserSchema
});

const action = createAction({
    description: 'Verify the one-time code and complete connecting the user, returning their connection token pair.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.agentcard.sh/companies/api/reference/connect-verify
            endpoint: '/api/v2/connect/verify',
            data: {
                connect_id: input.connect_id,
                code: input.code
            },
            retries: 3
        });

        const connection = OutputSchema.parse(response.data);
        return connection;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
