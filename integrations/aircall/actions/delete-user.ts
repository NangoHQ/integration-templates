import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.union([z.string(), z.number()]).describe('User ID. Example: "123"')
});

const OutputSchema = z.object({
    id: z.union([z.string(), z.number()]),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a user in Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/delete-user',
        method: 'POST'
    },
    scopes: ['users:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const userId = typeof input.id === 'number' ? String(input.id) : input.id;

        // https://developer.aircall.io/api-references/#delete-a-user
        await nango.delete({
            endpoint: `/v1/users/${encodeURIComponent(userId)}`,
            retries: 3
        });

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
