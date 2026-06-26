import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Transcript ID to delete. Example: "abc123"')
});

const OutputSchema = z.object({
    deleted: z.boolean()
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    code: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            deleteTranscript: z
                .object({
                    id: z.string()
                })
                .optional()
        })
        .nullable()
        .optional(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const action = createAction({
    description: 'Permanently delete a transcript by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [''],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.fireflies.ai/graphql-api/query/transcript
            endpoint: '/graphql',
            data: {
                query: `
                    mutation DeleteTranscript($id: String!) {
                        deleteTranscript(id: $id) {
                            id
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            const firstError = parsed.errors[0];
            if (!firstError) {
                throw new nango.ActionError({
                    type: 'graphql_error',
                    message: 'Unknown GraphQL error.'
                });
            }
            throw new nango.ActionError({
                type: firstError.code || 'graphql_error',
                message: firstError.message
            });
        }

        if (parsed.data === undefined || parsed.data === null) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'Unexpected GraphQL response: missing data field.'
            });
        }

        return {
            deleted: parsed.data.deleteTranscript !== undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
