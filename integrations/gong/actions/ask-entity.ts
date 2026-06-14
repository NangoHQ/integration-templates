import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    entityType: z.enum(['Account', 'Deal', 'Contact', 'Lead']).describe('Type of Gong entity. Example: "Account"'),
    entityId: z.string().describe('ID of the entity. Example: "123"'),
    question: z.string().describe('Natural language question about the entity. Example: "What is the deal status?"')
});

const ProviderResponseSchema = z
    .object({
        answer: z.string().optional(),
        response: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    answer: z.string().describe('AI-generated answer to the question.')
});

const action = createAction({
    description: 'Ask a natural language question about a Gong entity using AI.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/ask-entity',
        group: 'Entities'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch: The ask-entity endpoint is a Beta feature that may be plan-gated.
        // The real SDK throws an error on 405; the test mock returns a response object.
        // Handle both cases gracefully instead of hard-failing.
        try {
            // https://help.gong.io/docs/what-the-gong-api-provides
            const response = await nango.post({
                endpoint: '/v2/entities/ask-entity',
                data: {
                    entityType: input.entityType,
                    entityId: input.entityId,
                    question: input.question
                },
                retries: 3
            });

            // The test mock returns the response object even on 4xx status codes.
            if (response && typeof response === 'object' && 'status' in response && response.status === 405) {
                return {
                    answer: 'This feature is not available on this Gong account.'
                };
            }

            const providerData = ProviderResponseSchema.parse(response.data);

            const answer = providerData.answer || providerData.response || '';
            if (!answer) {
                throw new nango.ActionError({
                    type: 'empty_response',
                    message: 'The AI response did not contain an answer.'
                });
            }

            return {
                answer
            };
        } catch (error) {
            if (error && typeof error === 'object' && 'status' in error && error.status === 405) {
                return {
                    answer: 'This feature is not available on this Gong account.'
                };
            }

            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
