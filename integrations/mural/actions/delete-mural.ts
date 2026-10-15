import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural to permanently delete. Example: "workspace1234.1606743986126".')
    })
    .describe('Identifies the mural to permanently delete.');

const OutputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural that was deleted.'),
        success: z.boolean().describe('Whether the mural was permanently deleted.')
    })
    .describe('Confirmation that the mural was permanently deleted.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a mural through the provider API, permanently removing it and its contents with no recycle bin or restore.
 * @pitfalls: Deletion is permanent with no recycle bin or restore; the mural's widgets and tags go with it, the containing room and its other murals are left intact, and deleting a mural that no longer exists fails with a not-found error.
 */
const action = createAction({
    description: 'Permanently delete a mural. HARD delete - no recycle bin, no restore.',
    version: '1.0.0',
    scopes: ['murals:write'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.mural.co/public/reference/deletemuralbyid
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- a retry after a lost success response would 404 on the already-deleted resource and report a completed delete as a failure.
            retries: 0
        };

        await nango.delete(config);

        return {
            muralId: input.muralId,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
