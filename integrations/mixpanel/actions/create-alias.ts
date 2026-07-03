import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    alias: z.string().describe('The new alias to map to the distinct_id. Example: "user-123-alias"'),
    distinct_id: z.string().describe('The existing distinct_id to alias. Example: "user-123"'),
    token: z.string().optional().describe('Optional project token. If omitted, the service account secret from the connection is used.')
});

const VerboseResponseSchema = z.object({
    status: z.number(),
    error: z.string().optional().nullable()
});

const OutputSchema = z.object({
    success: z.boolean(),
    alias: z.string(),
    distinct_id: z.string()
});

const ConnectionSchema = z.object({
    credentials: z.object({
        type: z.literal('BASIC'),
        username: z.string(),
        password: z.string()
    })
});

const action = createAction({
    description: 'Create an alias.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let token = input.token;
        if (!token) {
            const connection = await nango.getConnection();
            const parsedConnection = ConnectionSchema.safeParse(connection);
            token = parsedConnection.success ? parsedConnection.data.credentials.password : '';
        }

        const response = await nango.post({
            // https://developer.mixpanel.com/reference/identity-create-alias
            endpoint: '/track',
            baseUrlOverride: 'https://api.mixpanel.com',
            params: {
                verbose: '1'
            },
            data: [
                {
                    event: '$create_alias',
                    properties: {
                        token: token,
                        distinct_id: input.distinct_id,
                        alias: input.alias
                    }
                }
            ],
            retries: 3
        });

        const responseData: unknown = response.data;
        let success = false;

        if (typeof responseData === 'number') {
            success = responseData === 1;
        } else if (typeof responseData === 'object' && responseData !== null) {
            const parsed = VerboseResponseSchema.safeParse(responseData);
            if (parsed.success) {
                success = parsed.data.status === 1;
            }
        }

        if (!success) {
            let errorMessage = 'Failed to create alias';
            if (typeof responseData === 'object' && responseData !== null && 'error' in responseData && responseData.error != null) {
                errorMessage = String(responseData.error);
            }

            throw new nango.ActionError({
                type: 'provider_error',
                message: errorMessage,
                alias: input.alias,
                distinct_id: input.distinct_id
            });
        }

        return {
            success: true,
            alias: input.alias,
            distinct_id: input.distinct_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
