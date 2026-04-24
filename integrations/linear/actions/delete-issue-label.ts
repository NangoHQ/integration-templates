import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    labelId: z.string().describe('The ID of the issue label to delete. Example: "label-uuid"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        issueLabelDelete: z.object({
            entityId: z.string(),
            lastSyncId: z.number(),
            success: z.boolean()
        })
    })
});

const OutputSchema = z.object({
    success: z.boolean(),
    entityId: z.string().optional(),
    lastSyncId: z.number().optional()
});

const action = createAction({
    description: 'Delete a Linear issue label.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-issue-label',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query: 'mutation IssueLabelDelete($id: String!) { issueLabelDelete(id: $id) { entityId lastSyncId success } }',
                variables: {
                    id: input.labelId
                }
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.data.issueLabelDelete.success) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Failed to delete issue label',
                labelId: input.labelId
            });
        }

        return {
            success: providerResponse.data.issueLabelDelete.success,
            entityId: providerResponse.data.issueLabelDelete.entityId,
            lastSyncId: providerResponse.data.issueLabelDelete.lastSyncId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
