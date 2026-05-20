import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    response_id: z.string().describe('The ID of the response to retrieve. Must start with "resp_". Example: "resp_abc123"')
});

// Provider response schema - OpenAI uses snake_case
// https://platform.openai.com/docs/api-reference/responses/get
const ProviderResponseSchema = z
    .object({
        id: z.string(),
        object: z.string().optional(),
        model: z.string(),
        output: z.array(z.record(z.string(), z.unknown())),
        usage: z
            .object({
                input_tokens: z.number().optional(),
                output_tokens: z.number().optional(),
                total_tokens: z.number().optional()
            })
            .loose()
            .optional(),
        created_at: z.number()
    })
    .loose();

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the response.'),
        model: z.string().describe('The model used to generate the response.'),
        output: z.array(z.record(z.string(), z.unknown())).describe('Array of output items from the response.'),
        usage: z
            .object({
                input_tokens: z.number().optional(),
                output_tokens: z.number().optional(),
                total_tokens: z.number().optional()
            })
            .loose()
            .optional(),
        created_at: z.number().describe('Unix timestamp (in seconds) of when the response was created.')
    })
    .loose();

const action = createAction({
    description: 'Retrieve a stored OpenAI response by ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-response',
        group: 'Responses'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['model.request'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/responses/get
        const response = await nango.get({
            endpoint: `/v1/responses/${encodeURIComponent(input.response_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Response with ID "${input.response_id}" not found.`,
                response_id: input.response_id
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return providerResponse;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
