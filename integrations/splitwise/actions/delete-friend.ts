import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    friend_id: z.number().describe('User ID of the friend to delete. Example: 12345')
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    errors: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    errors: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Delete or archive a friend in Splitwise',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-friend',
        group: 'Friends'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://dev.splitwise.com/
            endpoint: `/api/v3.0/delete_friend/${encodeURIComponent(input.friend_id)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Failed to delete friendship',
                errors: providerResponse.errors ?? []
            });
        }

        return {
            success: providerResponse.success,
            errors: providerResponse.errors ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
