import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    assetId: z.string().describe('The ID of the asset to delete. Example: "MAHNAO5uFww"')
});

const OutputSchema = z.object({
    assetId: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete an asset.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['asset:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.canva.dev/docs/connect/api-reference/assets/
            endpoint: `/rest/v1/assets/${encodeURIComponent(input.assetId)}`,
            retries: 1
        });

        if (response.status !== 204 && response.status !== 200) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete asset. Received status ${response.status}.`,
                assetId: input.assetId
            });
        }

        return {
            assetId: input.assetId,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
