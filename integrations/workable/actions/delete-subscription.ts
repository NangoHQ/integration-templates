import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Subscription ID. Example: "104693"')
});

const OutputSchema = z.object({
    id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Unsubscribe (delete) a webhook subscription.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_candidates', 'r_employees'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://workable.readme.io/reference/delete-subscription
            endpoint: `/spi/v3/subscriptions/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (response.status !== 200) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete subscription. Status: ${response.status}`,
                id: input.id
            });
        }

        return {
            id: input.id,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
