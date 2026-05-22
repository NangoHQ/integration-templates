import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    updateId: z.string().describe('The unique identifier of the update to delete. Example: "1234567890"')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            delete_update: z
                .object({
                    id: z.string()
                })
                .optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier of the deleted update.')
});

const action = createAction({
    description: 'Delete an update in monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-update',
        group: 'Updates'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['updates:write'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.monday.com/api-reference/docs/updates#delete-update
            endpoint: '/v2',
            data: {
                query: 'mutation ($id: ID!) { delete_update(id: $id) { id } }',
                variables: {
                    id: input.updateId
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success || !parsed.data.data?.delete_update?.id) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Failed to delete update or unexpected response from monday.com.',
                updateId: input.updateId
            });
        }

        return {
            id: parsed.data.data.delete_update.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
