import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    attachmentId: z.string().describe('The ID of the attachment to delete. Example: "47e14163-404c-4a34-b775-5c536d67760a"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    entityId: z.union([z.string(), z.null()]),
    lastSyncId: z.union([z.number(), z.null()])
});

const action = createAction({
    description: 'Delete an attachment from a Linear issue.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-attachment',
        group: 'Attachments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation AttachmentDelete($id: String!) {
                attachmentDelete(id: $id) {
                    success
                    entityId
                    lastSyncId
                }
            }
        `;

        // https://developers.linear.app/docs/graphql/attachments
        const config = {
            endpoint: '/graphql',
            data: {
                query: mutation,
                variables: {
                    id: input.attachmentId
                }
            },
            retries: 1
        };
        const response = await nango.post(config);

        const payload = response.data?.data?.attachmentDelete;

        if (!payload || payload.success === false) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: payload?.error?.message || 'Failed to delete attachment',
                attachmentId: input.attachmentId
            });
        }

        return {
            success: payload.success,
            entityId: payload.entityId || null,
            lastSyncId: payload.lastSyncId || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
