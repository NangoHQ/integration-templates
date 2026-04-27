import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The identifier of the comment to unresolve. Example: "comment-id-123"')
});

const ProviderPayloadSchema = z.object({
    data: z.object({
        commentUnresolve: z.object({
            success: z.boolean(),
            lastSyncId: z.union([z.string(), z.number()]),
            comment: z.object({
                id: z.string()
            })
        })
    })
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the operation was successful.'),
    lastSyncId: z.string().describe('The identifier of the last sync operation.'),
    commentId: z.string().describe('The identifier of the unresolved comment.')
});

const action = createAction({
    description: 'Reopen a previously resolved Linear comment thread.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/unresolve-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['comments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.linear.app/docs/graphql/working-with-the-graphql-api
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: 'mutation commentUnresolve($id: String!) { commentUnresolve(id: $id) { success lastSyncId comment { id } } }',
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const providerPayload = ProviderPayloadSchema.parse(response.data);

        return {
            success: providerPayload.data.commentUnresolve.success,
            lastSyncId: String(providerPayload.data.commentUnresolve.lastSyncId),
            commentId: providerPayload.data.commentUnresolve.comment.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
