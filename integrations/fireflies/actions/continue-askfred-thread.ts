import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    thread_id: z.string().describe('The ID of the existing AskFred thread to continue. Example: "thread_abc123"'),
    query: z.string().describe('Follow-up question or query. Maximum 2000 characters.'),
    format_mode: z.enum(['markdown', 'plaintext']).optional().describe('Response format: markdown or plaintext'),
    response_language: z.string().optional().describe('Language code for the response (e.g., "en" for English).')
});

const AskFredMessageSchema = z.object({
    id: z.string(),
    thread_id: z.string(),
    query: z.string(),
    answer: z.string(),
    suggested_queries: z.array(z.string()).optional(),
    status: z.string(),
    created_at: z.string().optional()
});

const OutputSchema = z.object({
    message: AskFredMessageSchema
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        continueAskFredThread: z.object({
            message: AskFredMessageSchema
        })
    })
});

const action = createAction({
    description: 'Continue an existing AskFred conversation thread.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.fireflies.ai/graphql-api/mutation/continue-askfred-thread
            endpoint: '/graphql',
            data: {
                query: `
                    mutation ContinueAskFredThread($input: ContinueAskFredThreadInput!) {
                        continueAskFredThread(input: $input) {
                            message {
                                id
                                thread_id
                                query
                                answer
                                suggested_queries
                                status
                                created_at
                            }
                        }
                    }
                `,
                variables: {
                    input: {
                        thread_id: input.thread_id,
                        query: input.query,
                        ...(input.format_mode !== undefined && { format_mode: input.format_mode }),
                        ...(input.response_language !== undefined && { response_language: input.response_language })
                    }
                }
            },
            retries: 3
        });

        const responseBody = z
            .object({
                data: z.unknown(),
                errors: z.array(z.unknown()).optional()
            })
            .parse(response.data);

        if (responseBody.errors && responseBody.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'Fireflies GraphQL API returned errors',
                errors: responseBody.errors
            });
        }

        const parsed = GraphQLResponseSchema.parse(responseBody);

        return {
            message: parsed.data.continueAskFredThread.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
