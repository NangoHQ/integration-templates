import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    response_id: z.string().describe('The ID of the response to retrieve. Example: "resp_abc123".')
});

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier for the response.'),
    object: z.string().describe('The object type, always "response".'),
    created_at: z.number().describe('Unix timestamp (in seconds) when the response was created.'),
    model: z.string().describe('The model used to generate the response.'),
    output: z.array(z.object({}).passthrough()).describe('Array of output items from the response.'),
    usage: z
        .object({
            input_tokens: z.number().optional(),
            output_tokens: z.number().optional(),
            total_tokens: z.number().optional()
        })
        .passthrough()
        .optional()
        .describe('Token usage information for the response.')
});

const action = createAction({
    description: 'Retrieve a stored OpenAI response by ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
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

        const data = response.data;
        if (!data || typeof data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Response not found or invalid data returned',
                response_id: input.response_id
            });
        }

        return {
            id: String(data.id ?? ''),
            object: String(data.object ?? ''),
            created_at: Number(data.created_at ?? 0),
            model: String(data.model ?? ''),
            output: Array.isArray(data.output) ? data.output : [],
            ...(data.usage !== undefined &&
                data.usage !== null && {
                    usage: data.usage
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
