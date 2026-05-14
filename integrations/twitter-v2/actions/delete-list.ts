import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the List to delete. Example: "1234567890"')
});

const ProviderDeleteResponseSchema = z.object({
    data: z.object({
        deleted: z.boolean()
    })
});

const OutputSchema = z.object({
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a List owned by the authenticated user',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-list',
        group: 'Lists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['list.write', 'tweet.read', 'users.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.x.com/x-api/lists/delete-list
        const response = await nango.delete({
            endpoint: `/2/lists/${input.id}`,
            retries: 3
        });

        const providerResponse = ProviderDeleteResponseSchema.parse(response.data);

        return {
            deleted: providerResponse.data.deleted
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
