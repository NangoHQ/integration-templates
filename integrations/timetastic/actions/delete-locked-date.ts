import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the locked date to delete. Example: 142802')
});

const ProviderResultSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

const OutputSchema = z.object({
    id: z.number(),
    success: z.boolean()
});

const action = createAction({
    description: 'Remove a locked date period. Admin/manager only.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://timetastic.co.uk/api/
            endpoint: `/lockeddates/${encodeURIComponent(String(input.id))}`,
            retries: 10
        };

        const response = await nango.delete(config);

        const result = ProviderResultSchema.parse(response.data);

        if (result !== 0) {
            const messages = ['Succeeded', 'Failed', 'InvalidValue', 'NothingToDo', 'NotPermitted'];
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete locked date: ${messages[result]}`,
                id: input.id,
                result
            });
        }

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
