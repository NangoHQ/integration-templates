import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the comment to delete. Example: "005502bb-b9c5-4354-b5e6-6463c24a1806"')
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    path: z.array(z.unknown()).optional()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        commentDelete: z.object({
            success: z.boolean()
        })
    })
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a comment from a Linear issue.',
    version: '1.0.3',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['comments:create', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query: 'mutation CommentDelete($id: String!) { commentDelete(id: $id) { success } }',
                variables: {
                    id: input.id
                }
            },
            retries: 10
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid or empty response from Linear API.'
            });
        }

        const raw = response.data;

        if ('errors' in raw && Array.isArray(raw.errors) && raw.errors.length > 0) {
            let messages = '';
            for (const error of raw.errors) {
                const parsed = GraphQLErrorSchema.safeParse(error);
                if (parsed.success) {
                    messages += (messages ? '; ' : '') + parsed.data.message;
                }
            }
            throw new nango.ActionError({
                type: 'graphql_error',
                message: messages || 'Unknown GraphQL error.',
                details: raw.errors
            });
        }

        const providerResponse = ProviderResponseSchema.safeParse(raw);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from Linear API.',
                details: providerResponse.error.issues
            });
        }

        return {
            success: providerResponse.data.data.commentDelete.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
