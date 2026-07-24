import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().trim().min(1).describe('The label name to remove from all tasks. Example: "nango-seed-keep"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Remove a label string from every task that references it',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.todoist.com/api/v1/#remove-a-shared-label
            endpoint: '/api/v1/labels/shared/remove',
            data: {
                name: input.name
            },
            retries: 1
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'unexpected_status',
                message: `Expected 204 No Content but received ${String(response.status)}`,
                status: response.status
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
